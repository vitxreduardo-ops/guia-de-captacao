import Link from "next/link";
import { listGalleryClients } from "@/lib/galleries";
import { getConnectedGoogleAccount } from "@/lib/googleDrive";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { getCurrentUsername } from "@/lib/session";
import {
  createGalleryClientAction,
  deleteGalleryClientAction,
  disconnectGoogleAccountAction,
} from "./actions";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

export default async function GalleryClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const driveError = params.drive_error ? String(params.drive_error) : null;
  const driveConnected = params.drive_connected === "1";

  const [clients, username, googleAccount] = await Promise.all([
    listGalleryClients(),
    getCurrentUsername(),
    getConnectedGoogleAccount(),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminHeader title="Galeria do cliente" backHref="/admin" username={username} />

      {driveError ? (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Não foi possível conectar ao Google Drive: {driveError}
        </p>
      ) : null}
      {driveConnected ? (
        <p className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          Conta Google conectada com sucesso.
        </p>
      ) : null}

      <section className="mb-6 rounded-lg border border-neutral-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-neutral-900">
              Conta Google (Drive)
            </p>
            {googleAccount ? (
              <p className="text-sm text-neutral-500">
                Conectada: {googleAccount.email || "conta sem email visível"}
              </p>
            ) : (
              <p className="text-sm text-neutral-500">
                Conecte uma conta Google pra sincronizar pastas do Drive
                direto nas galerias.
              </p>
            )}
          </div>
          {googleAccount ? (
            <form action={disconnectGoogleAccountAction}>
              <button
                type="submit"
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
              >
                Desconectar
              </button>
            </form>
          ) : (
            <a
              href="/api/drive/oauth/start"
              className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Conectar Google Drive
            </a>
          )}
        </div>
      </section>

      <form
        action={createGalleryClientAction}
        className="mb-8 flex gap-2 rounded-lg border border-neutral-200 bg-white p-4"
      >
        <input
          name="name"
          placeholder="Nome do cliente (ex: Restaurante X)"
          required
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Novo cliente
        </button>
      </form>

      {clients.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Nenhum cliente cadastrado ainda. Use o formulário acima para começar.
        </p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {clients.map((client) => (
            <li
              key={client.id}
              className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4"
            >
              <div>
                <Link
                  href={`/admin/galerias/${client.id}`}
                  className="font-medium text-neutral-900 hover:underline"
                >
                  {client.name}
                </Link>
                <p className="mt-0.5 text-sm text-neutral-500">
                  {formatDate(client.created_at)} ·{" "}
                  <span
                    className={
                      client.status === "published"
                        ? "text-emerald-600"
                        : "text-amber-600"
                    }
                  >
                    {client.status === "published" ? "Publicado" : "Rascunho"}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/admin/galerias/${client.id}`}
                  className="text-sm text-neutral-600 hover:text-neutral-900"
                >
                  Editar
                </Link>
                <form action={deleteGalleryClientAction}>
                  <input type="hidden" name="id" value={client.id} />
                  <DeleteButton
                    confirmMessage={`Excluir a galeria de "${client.name}"? Essa ação não pode ser desfeita.`}
                  />
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
