"use client";

import { Check, Film } from "lucide-react";

export interface PickerImage {
  id: string;
  thumb: string;
  folder: string;
  caption: string;
  video: boolean;
}

/**
 * Grade de miniaturas da galeria do cliente, agrupada por pasta, com seleção
 * múltipla. Não guarda estado: quem usa decide o que está marcado. Os
 * checkboxes levam `name="media_image_ids"`, então servem direto num <form>.
 */
export function MediaPicker({
  images,
  selected,
  onToggle,
}: {
  images: PickerImage[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  if (!images.length) {
    return (
      <p className="mt-1 text-sm text-neutral-500">
        A galeria deste cliente ainda não tem arquivos. Sincronize a pasta do Drive em Galerias ou use o link.
      </p>
    );
  }
  const folders = Map.groupBy(images, (i) => i.folder || "Raiz");
  return (
    <div className="mt-1 max-h-72 space-y-3 overflow-y-auto rounded-md border border-neutral-200 p-2">
      {[...folders.entries()].map(([folder, list]) => (
        <div key={folder}>
          <p className="mb-1 text-xs font-medium text-neutral-500">{folder}</p>
          <ul className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
            {list.map((img) => (
              <li key={img.id}>
                <label className="relative block aspect-square cursor-pointer overflow-hidden rounded-md bg-neutral-100">
                  <input
                    type="checkbox"
                    name="media_image_ids"
                    value={img.id}
                    checked={selected.includes(img.id)}
                    onChange={() => onToggle(img.id)}
                    className="peer sr-only"
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.thumb} alt={img.caption} loading="lazy" className="size-full object-cover" />
                  {img.video ? <Film className="absolute bottom-1 left-1 size-4 text-white drop-shadow" aria-hidden /> : null}
                  <span className="absolute inset-0 hidden bg-neutral-900/40 peer-checked:block" />
                  <span className="absolute right-1 top-1 hidden size-5 place-items-center rounded-full bg-neutral-900 text-white peer-checked:grid">
                    <Check className="size-3.5" aria-hidden />
                  </span>
                  <span className="absolute inset-0 ring-neutral-900 peer-focus-visible:ring-2" />
                </label>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
