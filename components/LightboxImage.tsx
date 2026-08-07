"use client";

import { useEffect, useState } from "react";

export function LightboxImage({
  src,
  alt,
  className,
  sourceUrl,
}: {
  src: string;
  alt: string;
  className?: string;
  sourceUrl?: string | null;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
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
          <div className="flex max-h-full max-w-full flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              className="max-h-[85vh] max-w-full rounded-md object-contain"
              onClick={(event) => event.stopPropagation()}
            />
            {sourceUrl ? (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="rounded-md bg-white/90 px-3 py-1.5 text-sm font-medium text-neutral-900 hover:bg-white"
              >
                Ver original ↗
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
