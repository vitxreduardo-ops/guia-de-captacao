import { DeleteButton } from "@/components/admin/DeleteButton";
import { LightboxImage } from "@/components/LightboxImage";
import { isLikelyImageUrl } from "@/lib/references";

interface MediaItem {
  id: string;
  image_url: string;
  source_url: string | null;
  caption: string;
  selected: boolean;
}

function isShowableAsImage(item: MediaItem) {
  return Boolean(item.source_url) || isLikelyImageUrl(item.image_url);
}

export function MediaGridSection({
  title,
  emptyLabel,
  guideId,
  items,
  addAction,
  deleteAction,
  toggleSelectedAction,
}: {
  title: string;
  emptyLabel: string;
  guideId: string;
  items: MediaItem[];
  addAction: (formData: FormData) => void | Promise<void>;
  deleteAction: (formData: FormData) => void | Promise<void>;
  toggleSelectedAction: (id: string, selected: boolean) => void | Promise<void>;
}) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-neutral-900">{title}</h2>

      {items.length > 0 ? (
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {(() => {
            const imageItems = items.filter(isShowableAsImage);
            const gallery = imageItems.map((i) => ({
              id: i.id,
              src: i.image_url,
              alt: i.caption || title,
              sourceUrl: i.source_url,
              selected: i.selected,
            }));

            return items.map((item) => {
            const showAsImage = isShowableAsImage(item);
            const href = item.source_url ?? item.image_url;

            return (
              <div
                key={item.id}
                className="overflow-hidden rounded-md border border-neutral-200 bg-white"
              >
                {showAsImage ? (
                  <LightboxImage
                    id={item.id}
                    src={item.image_url}
                    alt={item.caption || title}
                    sourceUrl={item.source_url}
                    selected={item.selected}
                    className="h-24 w-full object-cover"
                    gallery={gallery}
                    index={imageItems.findIndex((i) => i.id === item.id)}
                    onToggleSelected={toggleSelectedAction}
                  />
                ) : (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-24 w-full items-center justify-center bg-neutral-100 px-2 text-center text-[11px] font-medium text-neutral-600 underline"
                  >
                    Abrir link ↗
                  </a>
                )}
                <div className="p-1.5">
                  {item.caption ? (
                    <p className="truncate text-[11px] text-neutral-600">
                      {item.caption}
                    </p>
                  ) : null}
                  <form action={deleteAction}>
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="guide_id" value={guideId} />
                    <DeleteButton
                      label="Remover"
                      confirmMessage={`Remover este item de "${title}"?`}
                    />
                  </form>
                </div>
              </div>
            );
            });
          })()}
        </div>
      ) : (
        <p className="mb-4 text-sm text-neutral-500">{emptyLabel}</p>
      )}

      <form
        action={addAction}
        className="rounded-md border border-dashed border-neutral-300 p-3"
      >
        <input type="hidden" name="guide_id" value={guideId} />
        <div className="mb-2 grid gap-2 sm:grid-cols-3">
          <input
            type="file"
            name="file"
            accept="image/*"
            className="text-xs sm:col-span-1"
          />
          <input
            name="image_url"
            placeholder="Ou link (Pinterest, cosmos.so...)"
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
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800"
        >
          Adicionar
        </button>
      </form>
    </section>
  );
}
