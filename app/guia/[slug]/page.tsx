import { AlternativasCena, NotasProducao } from "@/components/AlternativasCena";
import { CartaoCena } from "@/components/CartaoCena";
import { notFound } from "next/navigation";
import {
  toggleCardItemSelectedAction,
  togglePhotoItemSelectedAction,
  toggleVideoReferenceItemSelectedAction,
  toggleVisualReferenceSelectedAction,
} from "./actions";
import {
  getGuideBySlugWithSections,
  type MediaItem,
  type VisualReference,
} from "@/lib/guides";
import { buildGallery, isShowableAsImage } from "@/lib/references";
import { TatuLogo } from "@/components/TatuLogo";
import { LightboxImage } from "@/components/LightboxImage";
import { Accordion } from "@/components/Accordion";
import { AutoRefresh } from "@/components/AutoRefresh";

// Pro cliente, "Ver original" só nos vídeos: em foto e carrossel o link pro
// post tira a pessoa do guia sem mostrar nada a mais.
function clientGallery(
  items: MediaItem[] | VisualReference[],
  fallbackAlt: string
) {
  const built = buildGallery(items, fallbackAlt);
  return {
    gallery: built.gallery.map((g) =>
      g.embedUrl ? g : { ...g, sourceUrl: null }
    ),
    indexOf: built.indexOf,
  };
}

function PublicMediaSection({
  title,
  fallbackAlt,
  items,
  onToggleSelected,
}: {
  title: string;
  fallbackAlt: string;
  items: MediaItem[];
  onToggleSelected: (id: string, selected: boolean) => Promise<void>;
}) {
  if (items.length === 0) return null;
  const { gallery, indexOf } = clientGallery(items, fallbackAlt);

  return (
    <section className="mb-10">
      <h2 className="mb-4 text-lg font-semibold text-neutral-900">{title}</h2>
      <div className="columns-2 gap-2 sm:columns-3 [&>figure]:mb-2 [&>figure]:break-inside-avoid">
        {items.map((item) => (
          <figure
            key={item.id}
            className="overflow-hidden rounded-md border border-neutral-200 bg-white"
          >
            {isShowableAsImage(item) ? (
              <LightboxImage
                id={item.id}
                src={item.image_url}
                alt={item.caption || fallbackAlt}
                sourceUrl={item.source_url}
                selected={item.selected}
                className="h-auto w-full"
                gallery={gallery}
                index={indexOf(item.id)}
                onToggleSelected={onToggleSelected}
              />
            ) : (
              <a
                href={item.source_url ?? item.image_url}
                target="_blank"
                rel="noreferrer"
                className="flex h-32 w-full items-center justify-center bg-neutral-100 px-2 text-center text-xs font-medium text-neutral-600 underline"
              >
                Abrir link ↗
              </a>
            )}
            {item.caption ? (
              <figcaption className="p-1.5 text-xs text-neutral-500">
                {item.caption}
              </figcaption>
            ) : null}
          </figure>
        ))}
      </div>
    </section>
  );
}

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
      <div className="flex min-h-svh items-center justify-center bg-neutral-50 px-4 text-center">
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
    <div className="min-h-svh bg-neutral-50">
      <AutoRefresh />
      <div className="mx-auto max-w-3xl px-4 py-12">
        <header className="mb-10 border-b border-neutral-200 pb-6">
          <TatuLogo className="mx-auto mb-10 block h-9 w-auto text-black" />
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
            <div className="space-y-3">
              {guide.videos.map((video, videoIndex) => {
                const videoCompleted =
                  video.scenes.length > 0 &&
                  video.scenes.every((scene) => scene.recorded);

                return (
                <Accordion
                  key={video.id}
                  className="rounded-lg border border-neutral-300 bg-white"
                  summary={
                    <span className="flex items-center gap-2 p-4 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      {videoCompleted ? (
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-green-600 text-[10px] text-white">
                          ✓
                        </span>
                      ) : null}
                      Vídeo {videoIndex + 1}
                      {video.title ? ` — ${video.title}` : ""}
                    </span>
                  }
                >
                  <div className="space-y-4 border-t border-neutral-200 p-4">
                    {video.scenes.map((scene, sceneIndex) => {
                      const sceneReferences = guide.visual_references.filter(
                        (reference) => reference.scene_id === scene.id
                      );
                      return (
                        <CartaoCena
                          key={scene.id}
                          id={scene.id}
                          slug={guide.slug}
                          gravada={scene.recorded}
                          titulo={`Cena ${sceneIndex + 1}`}
                        >
                          <p className="whitespace-pre-wrap text-sm text-neutral-600">
                            {scene.script || "—"}
                          </p>

                          {scene.description ? (
                            <div className="mt-2">
                              <p className="text-xs font-medium text-neutral-500">
                                Descrição de cena
                              </p>
                              <p className="whitespace-pre-wrap text-sm text-neutral-600">
                                {scene.description}
                              </p>
                            </div>
                          ) : null}

                          <AlternativasCena scene={scene} />

                          {sceneReferences.length > 0 ? (
                            <div className="mt-3 columns-2 gap-2 sm:columns-3 [&>figure]:mb-2 [&>figure]:break-inside-avoid">
                              {(() => {
                                const { gallery, indexOf } = clientGallery(
                                  sceneReferences,
                                  "Referência visual"
                                );

                                return sceneReferences.map((reference) => {
                                const showAsImage = isShowableAsImage(reference);
                                const href =
                                  reference.source_url ?? reference.image_url;

                                return (
                                <figure
                                  key={reference.id}
                                  className="overflow-hidden rounded-md border border-neutral-200 bg-white"
                                >
                                  {showAsImage ? (
                                    <LightboxImage
                                      id={reference.id}
                                      src={reference.image_url}
                                      alt={
                                        reference.caption ||
                                        "Referência visual"
                                      }
                                      sourceUrl={reference.source_url}
                                      selected={reference.selected}
                                      className="h-auto w-full"
                                      gallery={gallery}
                                      index={indexOf(reference.id)}
                                      onToggleSelected={toggleVisualReferenceSelectedAction.bind(
                                        null,
                                        guide.slug
                                      )}
                                    />
                                  ) : (
                                    <a
                                      href={href}
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
                                );
                                });
                              })()}
                            </div>
                          ) : null}
                        </CartaoCena>
                      );
                    })}

                    <NotasProducao notas={video.notas_producao} />
                  </div>
                </Accordion>
                );
              })}
            </div>
          </section>
        ) : null}

        <PublicMediaSection
          title="Referências de vídeo"
          fallbackAlt="Referência de vídeo"
          items={guide.video_reference_items}
          onToggleSelected={toggleVideoReferenceItemSelectedAction.bind(
            null,
            guide.slug
          )}
        />
        <PublicMediaSection
          title="Fotos"
          fallbackAlt="Foto"
          items={guide.photo_items}
          onToggleSelected={togglePhotoItemSelectedAction.bind(null, guide.slug)}
        />
        <PublicMediaSection
          title="Cards"
          fallbackAlt="Card"
          items={guide.card_items}
          onToggleSelected={toggleCardItemSelectedAction.bind(null, guide.slug)}
        />

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
