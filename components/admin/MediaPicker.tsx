"use client";

import { useMemo, useState } from "react";
import { Check, ChevronRight, Film, Folder, FolderOpen } from "lucide-react";

export interface PickerImage {
  id: string;
  thumb: string;
  /** Pasta do Drive, ex.: "02.FEVEREIRO/FOTOS" (vazio = raiz). */
  folder: string;
  caption: string;
  video: boolean;
}

const segments = (folder: string) => folder.split("/").map((s) => s.trim()).filter(Boolean);

/**
 * Seletor de arquivos da galeria do cliente, navegando por pastas como no
 * Drive: só o conteúdo da pasta aberta é desenhado (então só essas miniaturas
 * carregam), e a seleção vale entre pastas. Os ids marcados saem como
 * `<input type="hidden" name="media_image_ids">`, então servem direto num form.
 */
export function MediaPicker({
  images,
  selected,
  onChange,
}: {
  images: PickerImage[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [path, setPath] = useState<string[]>([]);

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  const { folders, items } = useMemo(() => {
    const depth = path.length;
    const prefix = path.join("/");
    const counts = new Map<string, { total: number; ids: string[] }>();
    const here: PickerImage[] = [];

    for (const image of images) {
      const parts = segments(image.folder);
      if (parts.length < depth || parts.slice(0, depth).join("/") !== prefix) continue;
      if (parts.length === depth) {
        here.push(image);
      } else {
        const next = parts[depth];
        const entry = counts.get(next) ?? { total: 0, ids: [] };
        entry.total++;
        entry.ids.push(image.id);
        counts.set(next, entry);
      }
    }
    const folders = [...counts.entries()]
      .map(([name, v]) => ({ name, total: v.total, ids: v.ids }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { numeric: true }));
    return { folders, items: here };
  }, [images, path]);

  // Tudo que está nesta pasta, subpastas incluídas (é o que "selecionar todos" leva).
  const allHere = useMemo(() => [...items.map((i) => i.id), ...folders.flatMap((f) => f.ids)], [items, folders]);
  const allPicked = allHere.length > 0 && allHere.every((id) => selected.includes(id));

  function toggleAllHere() {
    onChange(
      allPicked
        ? selected.filter((id) => !allHere.includes(id))
        : [...selected, ...allHere.filter((id) => !selected.includes(id))]
    );
  }

  if (!images.length) {
    return (
      <p className="mt-1 text-sm text-neutral-500">
        A galeria deste cliente ainda não tem arquivos. Sincronize a pasta do Drive em Galerias ou use o link.
      </p>
    );
  }

  return (
    <div className="mt-1 rounded-md border border-neutral-200">
      {selected.map((id) => (
        <input key={id} type="hidden" name="media_image_ids" value={id} />
      ))}

      <nav aria-label="Pasta atual" className="flex flex-wrap items-center gap-0.5 border-b border-neutral-200 px-2 py-1.5 text-sm">
        <button
          type="button"
          onClick={() => setPath([])}
          className={`min-h-9 rounded px-2 hover:bg-neutral-100 ${path.length ? "text-neutral-600" : "font-medium"}`}
        >
          Todas as pastas
        </button>
        {path.map((part, index) => (
          <span key={`${part}-${index}`} className="flex items-center gap-0.5">
            <ChevronRight className="size-3.5 text-neutral-400" aria-hidden />
            <button
              type="button"
              onClick={() => setPath(path.slice(0, index + 1))}
              className={`min-h-9 rounded px-2 hover:bg-neutral-100 ${index === path.length - 1 ? "font-medium" : "text-neutral-600"}`}
            >
              {part}
            </button>
          </span>
        ))}
      </nav>

      {path.length && allHere.length ? (
        <div className="flex items-center justify-between gap-2 border-b border-neutral-200 px-2 py-1.5">
          <span className="text-xs text-neutral-500">
            {allHere.length} arquivo{allHere.length === 1 ? "" : "s"}
            {folders.length ? " (com subpastas)" : ""}
          </span>
          <button
            type="button"
            onClick={toggleAllHere}
            className="min-h-9 rounded-md border border-neutral-300 px-3 text-sm font-medium hover:bg-neutral-50"
          >
            {allPicked ? "Limpar seleção da pasta" : `Selecionar todos (${allHere.length})`}
          </button>
        </div>
      ) : null}

      <div className="max-h-72 overflow-y-auto p-2">
        {folders.length ? (
          <ul className="mb-2 grid gap-1 sm:grid-cols-2">
            {folders.map((folder) => {
              const picked = folder.ids.filter((id) => selected.includes(id)).length;
              return (
                <li key={folder.name}>
                  <button
                    type="button"
                    onClick={() => setPath([...path, folder.name])}
                    className="flex min-h-11 w-full items-center gap-2 rounded-md border border-neutral-200 px-3 text-left text-sm hover:bg-neutral-50"
                  >
                    <Folder className="size-4 shrink-0 text-neutral-500" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{folder.name}</span>
                    {picked ? (
                      <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-xs text-white">{picked}</span>
                    ) : null}
                    <span className="text-xs text-neutral-500">{folder.total}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}

        {items.length ? (
          <ul className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
            {items.map((img) => (
              <li key={img.id}>
                <label className="relative block aspect-square cursor-pointer overflow-hidden rounded-md bg-neutral-100">
                  <input
                    type="checkbox"
                    checked={selected.includes(img.id)}
                    onChange={() => toggle(img.id)}
                    aria-label={img.caption || "Arquivo"}
                    className="peer sr-only"
                  />
                  {img.video ? (
                    <Film className="absolute inset-0 m-auto size-6 text-neutral-400" aria-hidden />
                  ) : null}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.thumb}
                    alt={img.caption}
                    loading="lazy"
                    onError={(e) => (e.currentTarget.style.visibility = "hidden")}
                    className="relative size-full object-cover"
                  />
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
        ) : null}

        {!folders.length && !items.length ? (
          <p className="flex items-center gap-2 p-2 text-sm text-neutral-500">
            <FolderOpen className="size-4" aria-hidden /> Pasta vazia.
          </p>
        ) : null}
      </div>
    </div>
  );
}
