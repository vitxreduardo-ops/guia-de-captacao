import { notFound } from "next/navigation";
import { getGuideBySlugWithSections } from "@/lib/guides";
import { isLikelyImageUrl } from "@/lib/references";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

function formatDate(value: string | null) {
  if (!value) return null;
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default async function PublicGuidePage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const guide = await getGuideBySlugWithSections(slug);

  if (!guide) notFound();

  if (guide.status !== "published") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 text-center">
        <p className="text-sm text-neutral-500">
          Este guia ainda não foi publicado.
        </p>
      </div>
    );
  }

  const equipamento = guide.checklist_items.filter(
    (item) => item.category === "equipamento"
  );
  const locacao = guide.checklist_items.filter(
    (item) => item.category === "locacao"
  );

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <header className="mb-10 border-b border-neutral-200 pb-6">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-400">
            Guia de gravação
          </p>
          <h1 className="mb-2 text-2xl font-semibold text-neutral-900">
            {guide.title}
          </h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-500">
            {guide.client_name ? <span>Cliente: {guide.client_name}</span> : null}
            {formatDate(guide.shoot_date) ? (
              <span>Data: {formatDate(guide.shoot_date)}</span>
            ) : null}
            {guide.location ? <span>Local: {guide.location}</span> : null}
          </div>
          <a
            href={`/api/guias/${guide.slug}/pdf`}
            className="mt-4 inline-block rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            Baixar PDF
          </a>
        </header>

        {guide.videos.length > 0 ? (
          <section className="mb-10">
            <h2 className="mb-4 text-lg font-semibold text-neutral-900">
              Vídeos
            </h2>
            <div className="space-y-6">
              {guide.videos.map((video, videoIndex) => (
                <div
                  key={video.id}
                  className="rounded-lg border border-neutral-300 bg-white p-4"
                >
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Vídeo {videoIndex + 1}
                    {video.title ? ` — ${video.title}` : ""}
                  </p>

                  <div className="space-y-4">
                    {video.scenes.map((scene, sceneIndex) => {
                      const sceneReferences = guide.visual_references.filter(
                        (reference) => reference.scene_id === scene.id
                      );
                      return (
                        <div
                          key={scene.id}
                          className="rounded-md border border-neutral-200 bg-neutral-50 p-3"
                        >
                          <p className="mb-1 text-sm font-medium text-neutral-900">
                            Cena {sceneIndex + 1}
                            {scene.title ? ` — ${scene.title}` : ""}
                          </p>
                          <p className="whitespace-pre-wrap text-sm text-neutral-600">
                            {scene.script || "—"}
                          </p>

                          {sceneReferences.length > 0 ? (
                            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                              {sceneReferences.map((reference) => (
                                <figure
                                  key={reference.id}
                                  className="overflow-hidden rounded-md border border-neutral-200 bg-white"
                                >
                                  {isLikelyImageUrl(reference.image_url) ? (
                                    <a
                                      href={reference.image_url}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={reference.image_url}
                                        alt={
                                          reference.caption ||
                                          "Referência visual"
                                        }
                                        className="h-28 w-full object-cover"
                                      />
                                    </a>
                                  ) : (
                                    <a
                                      href={reference.image_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="flex h-28 w-full items-center justify-center bg-neutral-100 px-2 text-center text-xs font-medium text-neutral-600 underline"
                                    >
                                      Abrir link ↗
                                    </a>
                                  )}
                                  {reference.caption ? (
                                    <figcaption className="p-1.5 text-xs text-neutral-500">
                                      {reference.caption}
                                    </figcaption>
                                  ) : null}
                                </figure>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {guide.shot_list_items.length > 0 ? (
          <section className="mb-10">
            <h2 className="mb-4 text-lg font-semibold text-neutral-900">
              Shot list / decupagem
            </h2>
            <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-100 text-xs uppercase text-neutral-500">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Plano</th>
                    <th className="px-3 py-2">Tipo</th>
                    <th className="px-3 py-2">Duração</th>
                    <th className="px-3 py-2">Observações</th>
                  </tr>
                </thead>
                <tbody>
                  {guide.shot_list_items.map((item, index) => (
                    <tr key={item.id} className="border-t border-neutral-200">
                      <td className="px-3 py-2 text-neutral-400">
                        {index + 1}
                      </td>
                      <td className="px-3 py-2 text-neutral-900">
                        {item.description}
                      </td>
                      <td className="px-3 py-2 text-neutral-600">
                        {item.shot_type || "—"}
                      </td>
                      <td className="px-3 py-2 text-neutral-600">
                        {item.duration || "—"}
                      </td>
                      <td className="px-3 py-2 text-neutral-600">
                        {item.notes || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {equipamento.length > 0 || locacao.length > 0 ? (
          <section className="mb-10">
            <h2 className="mb-4 text-lg font-semibold text-neutral-900">
              Checklist
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {equipamento.length > 0 ? (
                <div className="rounded-lg border border-neutral-200 bg-white p-4">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Equipamento
                  </h3>
                  <ul className="space-y-1 text-sm">
                    {equipamento.map((item) => (
                      <li
                        key={item.id}
                        className={
                          item.done
                            ? "text-neutral-400 line-through"
                            : "text-neutral-800"
                        }
                      >
                        {item.done ? "✓" : "○"} {item.label}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {locacao.length > 0 ? (
                <div className="rounded-lg border border-neutral-200 bg-white p-4">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Locação
                  </h3>
                  <ul className="space-y-1 text-sm">
                    {locacao.map((item) => (
                      <li
                        key={item.id}
                        className={
                          item.done
                            ? "text-neutral-400 line-through"
                            : "text-neutral-800"
                        }
                      >
                        {item.done ? "✓" : "○"} {item.label}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
