import { setStatusAction } from "@/app/admin/guias/[id]/actions";
import type { GuideWithSections } from "@/lib/guides";

export function PublishBox({ guide }: { guide: GuideWithSections }) {
  const isPublished = guide.status === "published";
  const publicPath = `/guia/${guide.slug}`;

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-neutral-900">
            Status:{" "}
            <span
              className={
                isPublished ? "text-emerald-600" : "text-amber-600"
              }
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

        <div className="flex items-center gap-2">
          <a
            href={`/api/guias/${guide.slug}/pdf`}
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            Baixar PDF
          </a>
          <form action={setStatusAction}>
            <input type="hidden" name="id" value={guide.id} />
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
      </div>
    </section>
  );
}
