"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { GalleryThumb } from "@/components/GalleryThumb";

/**
 * Vídeo da galeria: abre num player em vez de só baixar.
 *
 * O download continua disponível dentro do player, mas deixa de ser a única
 * forma de ver o conteúdo — antes o cliente precisava baixar dezenas de MB
 * pra saber qual arquivo era. O proxy `/api/drive-image` aceita Range, então
 * o <video> consegue transmitir sem puxar o arquivo inteiro.
 */
export function VideoLightbox({
  src,
  poster,
  downloadSrc,
  caption,
  className,
}: {
  src: string;
  poster: string;
  downloadSrc: string;
  caption: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [thumbFailed, setThumbFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const spring = prefersReducedMotion
    ? { duration: 0.15 }
    : { type: "spring" as const, bounce: 0, duration: 0.3 };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Assistir ${caption || "vídeo"}`}
        className="group relative block w-full cursor-pointer transition-transform active:scale-[0.98]"
      >
        <GalleryThumb
          src={poster}
          alt={caption || "Vídeo"}
          caption={caption}
          onFailed={() => setThumbFailed(true)}
          className={`${className ?? ""} rounded-lg bg-black transition-opacity group-hover:opacity-75`}
        />
        {thumbFailed ? null : (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 pl-0.5 text-lg text-neutral-900 shadow-sm transition-transform group-hover:scale-110">
              ▶
            </span>
          </span>
        )}
      </button>

      <AnimatePresence onExitComplete={() => setReady(false)}>
        {open ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={spring}
            onClick={() => setOpen(false)}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-sm font-medium text-neutral-900 transition-transform hover:bg-white active:scale-95"
            >
              Fechar ✕
            </button>

            {ready ? null : (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                <div className="h-1 w-32 overflow-hidden rounded-full bg-white/20">
                  <motion.div
                    className="h-full w-1/3 rounded-full bg-white"
                    animate={
                      prefersReducedMotion
                        ? { opacity: [1, 0.4, 1] }
                        : { x: ["-100%", "220%"] }
                    }
                    transition={{
                      duration: prefersReducedMotion ? 1 : 0.9,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                </div>
              </div>
            )}

            <div className="flex max-h-full w-full max-w-4xl flex-col items-center gap-3">
              <video
                src={src}
                poster={poster}
                controls
                autoPlay
                playsInline
                preload="metadata"
                onLoadedData={() => setReady(true)}
                onCanPlay={() => setReady(true)}
                onClick={(event) => event.stopPropagation()}
                className="max-h-[80vh] w-full rounded-md bg-black"
              />
              {caption ? (
                <p className="max-w-full truncate text-xs text-white/70">
                  {caption}
                </p>
              ) : null}
              <a
                href={downloadSrc}
                download
                onClick={(event) => event.stopPropagation()}
                className="rounded-md bg-white/90 px-3 py-1.5 text-sm font-medium text-neutral-900 transition-transform hover:bg-white active:scale-95"
              >
                Baixar ↓
              </a>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
