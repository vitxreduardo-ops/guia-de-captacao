"use client";

import { useEffect, useState } from "react";

export interface GalleryItem {
  id: string;
  src: string;
  alt: string;
  sourceUrl?: string | null;
  selected?: boolean;
}

export function LightboxImage({
  id,
  src,
  alt,
  className,
  sourceUrl,
  selected = false,
  gallery,
  index,
  onToggleSelected,
}: {
  id: string;
  src: string;
  alt: string;
  className?: string;
  sourceUrl?: string | null;
  selected?: boolean;
  gallery?: GalleryItem[];
  index?: number;
  onToggleSelected?: (id: string, selected: boolean) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(index ?? 0);

  const items =
    gallery && gallery.length > 0 ? gallery : [{ id, src, alt, sourceUrl, selected }];
  const canNavigate = items.length > 1;
  const current = items[currentIndex] ?? items[0];

  function goPrev() {
    setCurrentIndex((i) => (i - 1 + items.length) % items.length);
  }

  function goNext() {
    setCurrentIndex((i) => (i + 1) % items.length);
  }

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
      if (!canNavigate) return;
      if (event.key === "ArrowLeft") {
        setCurrentIndex((i) => (i - 1 + items.length) % items.length);
      }
      if (event.key === "ArrowRight") {
        setCurrentIndex((i) => (i + 1) % items.length);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, canNavigate, items.length]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setCurrentIndex(index ?? 0);
          setOpen(true);
        }}
        className="relative block w-full cursor-zoom-in"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className={`${className ?? ""} ${
            selected ? "opacity-40 grayscale" : ""
          }`}
        />
        {selected ? (
          <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-xs text-white">
            ✓
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-sm font-medium text-neutral-900 hover:bg-white"
          >
            Fechar ✕
          </button>

          {canNavigate ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                goPrev();
              }}
              aria-label="Foto anterior"
              className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-xl text-neutral-900 hover:bg-white sm:left-4"
            >
              ‹
            </button>
          ) : null}

          <div className="flex max-h-full max-w-full flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.src}
              alt={current.alt}
              className="max-h-[85vh] max-w-full rounded-md object-contain"
              onClick={(event) => event.stopPropagation()}
            />
            {onToggleSelected ? (
              <label
                onClick={(event) => event.stopPropagation()}
                className="flex cursor-pointer items-center gap-2 rounded-md bg-white/90 px-3 py-1.5 text-sm font-medium text-neutral-900 hover:bg-white"
              >
                <input
                  type="checkbox"
                  checked={Boolean(current.selected)}
                  onChange={() =>
                    onToggleSelected(current.id, !current.selected)
                  }
                  className="h-4 w-4 accent-green-600"
                />
                Selecionada
              </label>
            ) : null}
            {current.sourceUrl ? (
              <a
                href={current.sourceUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="rounded-md bg-white/90 px-3 py-1.5 text-sm font-medium text-neutral-900 hover:bg-white"
              >
                Ver original ↗
              </a>
            ) : null}
          </div>

          {canNavigate ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                goNext();
              }}
              aria-label="Próxima foto"
              className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-xl text-neutral-900 hover:bg-white sm:right-4"
            >
              ›
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
