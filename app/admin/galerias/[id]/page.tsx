import { notFound } from "next/navigation";
import {
  buildGalleryFolderTree,
  getGalleryClientWithImages,
  type GalleryFolderNode,
} from "@/lib/galleries";
import { getConnectedGoogleAccount } from "@/lib/googleDrive";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Accordion } from "@/components/Accordion";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { DriveSyncForm } from "@/components/admin/DriveSyncForm";
import { getCurrentUsername } from "@/lib/session";
import {
  addGalleryImageAction,
  deleteGalleryImageAction,
  setGalleryClientStatusAction,
  syncDriveFolderAction,
  updateGalleryClientNameAction,
} from "./actions";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

function countItems(node: GalleryFolderNode): number {
  return (
    node.items.length +
    node.folders.reduce((total, folder) => total + countItems(folder), 0)
  );
}

/**
 * Lista só nomes de arquivo (sem miniatura/vídeo) — a área de importação não
 * precisa renderizar mídia, isso fica só pra página publicada. Mantém leve e
 * ainda dá pra remover um item específico se a sincronização trouxe algo
 * indesejado.
 */
function FolderList({
  node,
  clientId,
  depth = 0,
}: {
  node: GalleryFolderNode;
  clientId: string;
  depth?: number;
}) {
  return (
    <div className={depth > 0 ? "border-l border-neutral-200 pl-4" : ""}>
      {node.folders.map((folder) => (
        <Accordion
          key={folder.path}
          className="border-b border-neutral-100 last:border-b-0"
          buttonClassName="py-2 text-sm"
          summary={
            <span className="flex items-center gap-2 font-medium text-neutral-800">
              <span aria-hidden className="text-neutral-400">
                📁
              </span>
              {folder.name}
              <span className="text-xs font-normal text-neutral-400">
                {countItems(folder)}
              </span>
            </span>
          }
        >
          <div className="pb-2">
            <FolderList node={folder} clientId={clientId} depth={depth + 1} />
          </div>
        </Accordion>
      ))}

      {node.items.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between gap-2 border-b border-neutral-100 py-1.5 text-sm last:border-b-0"
        >
          <span className="truncate text-neutral-700">
            {item.caption || "(sem nome)"}
          </span>
          <form action={deleteGalleryImageAction}>
            <input type="hidden" name="id" value={item.id} />
            <input type="hidden" name="guide_id" value={clientId} />
            <DeleteButton label="Remover" confirmMessage="Remover este item?" />
          </form>
        </div>
      ))}
    </div>
  );
}

export default async function GalleryClientPage({ params }: { params: Params }) {
  const { id } = await params;
  const [client, username, googleAccount] = await Promise.all([
    getGalleryClientWithImages(id),
    getCurrentUsername(),
    getConnectedGoogleAccount(),
  ]);

  if (!client) notFound();

  const isPublished = client.status === "published";
  const publicPath = `/galeria/${client.slug}`;
  const root = buildGalleryFolderTree(client.images);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminHeader
        title={client.name}
        trail={[
          { label: "Admin", href: "/admin" },
          { label: "Galerias", href: "/admin/galerias" },
        ]}
        username={username}
      />

      <div className="mb-6 space-y-4">
        <form
          action={updateGalleryClientNameAction}
          className="flex gap-2 rounded-lg border border-neutral-200 bg-white p-4"
        >
          <input type="hidden" name="id" value={client.id} />
          <input
            name="name"
            defaultValue={client.name}
            placeholder="Nome do cliente"
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Salvar nome
          </button>
        </form>

        <section className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-neutral-900">
                Status:{" "}
                <span
                  className={isPublished ? "text-emerald-600" : "text-amber-600"}
                >
                  {isPublished ? "Publicado" : "Rascunho"}
                </span>
              </p>
              {isPublished ? (
                <a
                  href={publicPath}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-neutral-500 underline hover:text-neutral-800"
                >
                  {publicPath}
                </a>
              ) : (
                <p className="text-sm text-neutral-500">
                  Publique para gerar o link compartilhável com o cliente.
                </p>
              )}
            </div>

            <form action={setGalleryClientStatusAction}>
              <input type="hidden" name="id" value={client.id} />
              <input
                type="hidden"
                name="status"
                value={isPublished ? "draft" : "published"}
              />
              <button
                type="submit"
                className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
              >
                {isPublished ? "Voltar para rascunho" : "Publicar"}
              </button>
            </form>
          </div>
        </section>
      </div>

      <section className="mb-6 rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">
          Pasta do Google Drive
        </h2>

        {!googleAccount ? (
          <p className="text-sm text-neutral-500">
            Nenhuma conta Google conectada.{" "}
            <a
              href="/api/drive/oauth/start"
              className="text-neutral-900 underline hover:text-neutral-700"
            >
              Conectar agora
            </a>{" "}
            (na tela de Galeria do cliente).
          </p>
        ) : (
          <>
            {client.drive_folder_id ? (
              <p className="mb-3 text-sm text-neutral-500">
                Sincronizado com a pasta{" "}
                <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs">
                  {client.drive_folder_id}
                </code>
                {client.drive_synced_at ? (
                  <>
                    {" "}
                    em{" "}
                    {new Date(client.drive_synced_at).toLocaleString("pt-BR")}
                  </>
                ) : null}
                . Sincronizar de novo substitui as fotos vindas do Drive
                pelas que estiverem na pasta agora.
              </p>
            ) : (
              <p className="mb-3 text-sm text-neutral-500">
                Cole o link da pasta do Drive do cliente (precisa estar
                compartilhada, no mínimo como visualizador, com a conta
                Google conectada acima).
              </p>
            )}

            <DriveSyncForm
              action={syncDriveFolderAction}
              clientId={client.id}
              defaultFolderUrl={
                client.drive_folder_id
                  ? `https://drive.google.com/drive/folders/${client.drive_folder_id}`
                  : ""
              }
            />
          </>
        )}
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">
            Arquivos importados
          </h2>
          <span className="text-xs text-neutral-400">
            {client.images.length}{" "}
            {client.images.length === 1 ? "item" : "itens"}
          </span>
        </div>
        <p className="mb-3 text-xs text-neutral-400">
          Só nomes aqui — as fotos e vídeos aparecem de verdade na página
          publicada ({publicPath}).
        </p>

        {client.images.length > 0 ? (
          <div className="mb-4">
            <FolderList node={root} clientId={client.id} />
          </div>
        ) : (
          <p className="mb-4 text-sm text-neutral-500">
            Nenhuma foto adicionada ainda.
          </p>
        )}

        <form
          action={addGalleryImageAction}
          className="rounded-md border border-dashed border-neutral-300 p-3"
        >
          <input type="hidden" name="guide_id" value={client.id} />
          <div className="mb-2 grid gap-2 sm:grid-cols-2">
            <input
              name="image_url"
              placeholder="Link do arquivo no Drive (compartilhado como 'qualquer pessoa com o link'), ou link de imagem direta"
              required
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs focus:border-neutral-500 focus:outline-none"
            />
            <input
              name="caption"
              placeholder="Legenda (opcional)"
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs focus:border-neutral-500 focus:outline-none"
            />
          </div>
          <p className="mb-2 text-[11px] text-neutral-400">
            No Drive: clique com o botão direito no arquivo → Compartilhar →
            &ldquo;Qualquer pessoa com o link&rdquo; → Copiar link. Cole o
            link de cada foto individual aqui (não o link da pasta).
          </p>
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800"
          >
            Adicionar
          </button>
        </form>
      </section>
    </div>
  );
}
