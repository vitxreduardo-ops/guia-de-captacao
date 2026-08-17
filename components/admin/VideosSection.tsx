import {
  addSceneAction,
  addVideoAction,
  addVisualReferenceAction,
  deleteSceneAction,
  deleteVideoAction,
  deleteVisualReferenceAction,
  toggleVisualReferenceSelectedAction,
  updateSceneAction,
  updateVideoAction,
} from "@/app/admin/guias/[id]/actions";
import { Accordion } from "@/components/Accordion";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { LightboxImage } from "@/components/LightboxImage";
import type { Scene, VideoWithScenes, VisualReference } from "@/lib/guides";
import { isLikelyImageUrl } from "@/lib/references";

function isShowableAsImage(item: { source_url: string | null; image_url: string }) {
  return Boolean(item.source_url) || isLikelyImageUrl(item.image_url);
}

function SceneReferences({
  guideId,
  sceneId,
  references,
}: {
  guideId: string;
  sceneId: string;
  references: VisualReference[];
}) {
  return (
    <div className="mt-3 border-t border-neutral-200 pt-3">
      <p className="mb-2 text-xs font-medium text-neutral-600">
        Referências visuais desta cena
      </p>

      {references.length > 0 ? (
        <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {(() => {
            const imageReferences = references.filter(isShowableAsImage);
            const gallery = imageReferences.map((r) => ({
              id: r.id,
              src: r.image_url,
              alt: r.caption || "Referência visual",
              sourceUrl: r.source_url,
              selected: r.selected,
            }));

            return references.map((reference) => {
            const showAsImage = isShowableAsImage(reference);
            const href = reference.source_url ?? reference.image_url;

            return (
              <div
                key={reference.id}
                className="overflow-hidden rounded-md border border-neutral-200 bg-white"
              >
                {showAsImage ? (
                  <LightboxImage
                    id={reference.id}
                    src={reference.image_url}
                    alt={reference.caption || "Referência visual"}
                    sourceUrl={reference.source_url}
                    selected={reference.selected}
                    className="h-20 w-full object-cover"
                    gallery={gallery}
                    index={imageReferences.findIndex(
                      (r) => r.id === reference.id
                    )}
                    onToggleSelected={toggleVisualReferenceSelectedAction.bind(
                      null,
                      guideId
                    )}
                  />
                ) : (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-20 w-full items-center justify-center bg-neutral-100 px-2 text-center text-[11px] font-medium text-neutral-600 underline"
                  >
                    Abrir link ↗
                  </a>
                )}
                <div className="p-1.5">
                  {reference.caption ? (
                    <p className="truncate text-[11px] text-neutral-600">
                      {reference.caption}
                    </p>
                  ) : null}
                  <form action={deleteVisualReferenceAction}>
                    <input type="hidden" name="id" value={reference.id} />
                    <input type="hidden" name="guide_id" value={guideId} />
                    <DeleteButton
                      label="Remover"
                      confirmMessage="Remover esta referência visual?"
                    />
                  </form>
                </div>
              </div>
            );
            });
          })()}
        </div>
      ) : (
        <p className="mb-3 text-xs text-neutral-400">
          Nenhuma referência adicionada ainda.
        </p>
      )}

      <form
        action={addVisualReferenceAction}
        className="rounded-md border border-dashed border-neutral-300 bg-white p-2"
      >
        <input type="hidden" name="guide_id" value={guideId} />
        <input type="hidden" name="scene_id" value={sceneId} />
        <div className="mb-2 grid gap-2 sm:grid-cols-3">
          <input
            type="file"
            name="file"
            accept="image/*"
            className="text-xs sm:col-span-1"
          />
          <input
            name="image_url"
            placeholder="Ou link da imagem"
            className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs focus:border-neutral-500 focus:outline-none sm:col-span-1"
          />
          <input
            name="caption"
            placeholder="Legenda (opcional)"
            className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs focus:border-neutral-500 focus:outline-none sm:col-span-1"
          />
        </div>
        <button
          type="submit"
          className="rounded-md border border-neutral-300 bg-white px-3 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Adicionar referência
        </button>
      </form>
    </div>
  );
}

function SceneCard({
  guideId,
  scene,
  index,
  references,
}: {
  guideId: string;
  scene: Scene;
  index: number;
  references: VisualReference[];
}) {
  return (
    <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-500">
          Cena {index + 1}
        </span>
        <form action={deleteSceneAction}>
          <input type="hidden" name="id" value={scene.id} />
          <input type="hidden" name="guide_id" value={guideId} />
          <DeleteButton
            label="Remover"
            confirmMessage="Remover esta cena? As referências visuais dela também serão perdidas."
          />
        </form>
      </div>
      <form action={updateSceneAction}>
        <input type="hidden" name="id" value={scene.id} />
        <input type="hidden" name="guide_id" value={guideId} />
        <textarea
          name="script"
          defaultValue={scene.script}
          placeholder="Roteiro / fala / direção..."
          rows={3}
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
        <textarea
          name="description"
          defaultValue={scene.description}
          placeholder="Descrição de cena"
          rows={2}
          className="mt-2 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
        <button
          type="submit"
          className="mt-2 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Salvar cena
        </button>
      </form>

      <SceneReferences
        guideId={guideId}
        sceneId={scene.id}
        references={references}
      />
    </div>
  );
}

function VideoCard({
  guideId,
  video,
  index,
  references,
  isLast,
}: {
  guideId: string;
  video: VideoWithScenes;
  index: number;
  references: VisualReference[];
  isLast: boolean;
}) {
  const nextSceneNumber = video.scenes.length + 1;

  return (
    <Accordion
      defaultOpen={isLast}
      className="rounded-md border border-neutral-300"
      buttonClassName="p-3"
      summary={
        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Vídeo {index + 1}
          {video.title ? ` — ${video.title}` : ""}
        </span>
      }
    >
      <div className="border-t border-neutral-200 p-3">
        <div className="mb-2 flex justify-end">
          <form action={deleteVideoAction}>
            <input type="hidden" name="id" value={video.id} />
            <input type="hidden" name="guide_id" value={guideId} />
            <DeleteButton
              label="Remover vídeo"
              confirmMessage="Remover este vídeo? Todas as cenas e referências dele também serão perdidas."
            />
          </form>
        </div>

        <form action={updateVideoAction} className="mb-3">
        <input type="hidden" name="id" value={video.id} />
        <input type="hidden" name="guide_id" value={guideId} />
        <div className="flex gap-2">
          <input
            name="title"
            defaultValue={video.title}
            placeholder="Título do vídeo"
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium focus:border-neutral-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Salvar título
          </button>
        </div>
      </form>

      <div className="space-y-3">
        {video.scenes.map((scene, sceneIndex) => (
          <SceneCard
            key={scene.id}
            guideId={guideId}
            scene={scene}
            index={sceneIndex}
            references={references.filter((r) => r.scene_id === scene.id)}
          />
        ))}

        {video.scenes.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Nenhuma cena adicionada ainda neste vídeo.
          </p>
        ) : null}
      </div>

      <form
        action={addSceneAction}
        className="mt-3 rounded-md border border-dashed border-neutral-300 p-3"
      >
        <input type="hidden" name="guide_id" value={guideId} />
        <input type="hidden" name="video_id" value={video.id} />
        <p className="mb-2 text-xs font-medium text-neutral-600">
          Cena {nextSceneNumber}
        </p>
        <textarea
          name="script"
          placeholder="Roteiro / fala / direção..."
          rows={3}
          className="mb-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
        <textarea
          name="description"
          placeholder="Descrição de cena"
          rows={2}
          className="mb-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
        <p className="mb-1 text-xs font-medium text-neutral-600">
          Referência visual inicial (opcional)
        </p>
        <div className="mb-2 grid gap-2 sm:grid-cols-3">
          <input type="file" name="file" accept="image/*" className="text-xs" />
          <input
            name="image_url"
            placeholder="Ou link da imagem"
            className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs focus:border-neutral-500 focus:outline-none"
          />
          <input
            name="caption"
            placeholder="Legenda (opcional)"
            className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs focus:border-neutral-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800"
        >
          Adicionar cena {nextSceneNumber}
        </button>
      </form>
      </div>
    </Accordion>
  );
}

export function VideosSection({
  guideId,
  guideSlug,
  videos,
  references,
}: {
  guideId: string;
  guideSlug: string;
  videos: VideoWithScenes[];
  references: VisualReference[];
}) {
  const nextVideoNumber = videos.length + 1;

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-neutral-900">
        Vídeos desta gravação
      </h2>

      <div className="space-y-4">
        {videos.map((video, index) => (
          <VideoCard
            key={video.id}
            guideId={guideId}
            video={video}
            index={index}
            references={references}
            isLast={index === videos.length - 1}
          />
        ))}

        {videos.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Nenhum vídeo adicionado ainda.
          </p>
        ) : null}
      </div>

      <div className="mt-4 rounded-md border border-dashed border-neutral-300 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Vídeo {nextVideoNumber}
        </p>
        <form action={addVideoAction} className="flex gap-2">
          <input type="hidden" name="guide_id" value={guideId} />
          <input
            name="title"
            placeholder={`Título do vídeo ${nextVideoNumber}`}
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Salvar vídeo {nextVideoNumber} e adicionar o próximo
          </button>
        </form>

        {videos.length > 0 ? (
          <div className="mt-3 border-t border-neutral-200 pt-3">
            <p className="mb-2 text-xs text-neutral-500">
              Ou, se já gravou todos os vídeos:
            </p>
            <a
              href={`/api/guias/${guideSlug}/pdf`}
              className="inline-block rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Baixar PDF com todos os vídeos
            </a>
          </div>
        ) : null}
      </div>
    </section>
  );
}
