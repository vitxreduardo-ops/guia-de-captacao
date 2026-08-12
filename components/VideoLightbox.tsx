"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

export function VideoLightbox({
  poster,
  src,
  downloadSrc,
  alt,
  className,
}: {
  poster: string;
  src: string;
  downloadSrc: string;
  alt: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const spring = prefersReducedMotion
    ? { duration: 0.15 }
    : { type: "spring" as const, bounce: 0, duration: 0.3 };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative block w-full cursor-zoom-in transition-transform active:scale-[0.98]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={poster} alt={alt} className={className} />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-xl text-white">
            ▶
          </span>
        </span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
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

            {!ready ? (
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
            ) : null}

            <div className="flex max-h-full max-w-full flex-col items-center gap-3">
              <motion.video
                controls
                preload="metadata"
                poster={poster}
                src={src}
                onClick={(event) => event.stopPropagation()}
                onCanPlay={() => setReady(true)}
                className="max-h-[85vh] max-w-full rounded-md"
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                transition={spring}
              />
              {ready ? (
                <a
                  href={downloadSrc}
                  download
                  onClick={(event) => event.stopPropagation()}
                  className="rounded-md bg-white/90 px-3 py-1.5 text-sm font-medium text-neutral-900 transition-transform hover:bg-white active:scale-95"
                >
                  Baixar ↓
                </a>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
