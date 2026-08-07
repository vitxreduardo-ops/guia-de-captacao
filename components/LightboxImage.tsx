"use client";

import { useEffect, useState } from "react";

export interface GalleryItem {
  src: string;
  alt: string;
  sourceUrl?: string | null;
}

export function LightboxImage({
  src,
  alt,
  className,
  sourceUrl,
  gallery,
  index,
}: {
  src: string;
  alt: string;
  className?: string;
  sourceUrl?: string | null;
  gallery?: GalleryItem[];
  index?: number;
}) {
  const [open, setOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(index ?? 0);

  const items = gallery && gallery.length > 0 ? gallery : [{ src, alt, sourceUrl }];
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
        className="block w-full cursor-zoom-in"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className={className} />
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
            {canNavigate ? (
              <p
                onClick={(event) => event.stopPropagation()}
                className="text-sm text-white/80"
              >
                {currentIndex + 1} / {items.length}
              </p>
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
