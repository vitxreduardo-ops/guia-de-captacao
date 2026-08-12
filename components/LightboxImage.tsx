"use client";

import { useEffect, useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type PanInfo,
} from "motion/react";

export interface GalleryItem {
  id: string;
  src: string;
  /** Imagem em qualidade completa aberta no lightbox — usa `src` (a
   * miniatura) se omitida. Deixa o grid leve (miniatura) sem abrir mão de
   * qualidade completa ao ampliar. */
  fullSrc?: string;
  /** Link de download do arquivo original. Quando presente, o botão do
   * rodapé do lightbox baixa o arquivo em vez de abrir o link original. */
  downloadSrc?: string;
  alt: string;
  sourceUrl?: string | null;
  selected?: boolean;
}

const SWIPE_VELOCITY_THRESHOLD = 500;
const SWIPE_DISTANCE_THRESHOLD = 80;
const DISMISS_DISTANCE_THRESHOLD = 120;

export function LightboxImage({
  id,
  src,
  fullSrc,
  downloadSrc,
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
  fullSrc?: string;
  downloadSrc?: string;
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
  const [loadedIds, setLoadedIds] = useState<Record<string, boolean>>({});
  const prefersReducedMotion = useReducedMotion();

  const items =
    gallery && gallery.length > 0
      ? gallery
      : [{ id, src, fullSrc, downloadSrc, alt, sourceUrl, selected }];
  const canNavigate = items.length > 1;
  const current = items[currentIndex] ?? items[0];

  function goPrev() {
    setCurrentIndex((i) => (i - 1 + items.length) % items.length);
  }

  function goNext() {
    setCurrentIndex((i) => (i + 1) % items.length);
  }

  function handleDragEnd(
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) {
    // Vertical drag wins when it's the dominant axis — drag-to-dismiss.
    if (Math.abs(info.offset.y) > Math.abs(info.offset.x)) {
      if (
        info.offset.y > DISMISS_DISTANCE_THRESHOLD ||
        info.velocity.y > SWIPE_VELOCITY_THRESHOLD
      ) {
        setOpen(false);
      }
      return;
    }

    if (!canNavigate) return;
    // Project where the gesture is heading, not just where it released.
    const projected = info.offset.x + info.velocity.x * 0.2;
    if (
      projected < -SWIPE_DISTANCE_THRESHOLD ||
      info.velocity.x < -SWIPE_VELOCITY_THRESHOLD
    ) {
      goNext();
    } else if (
      projected > SWIPE_DISTANCE_THRESHOLD ||
      info.velocity.x > SWIPE_VELOCITY_THRESHOLD
    ) {
      goPrev();
    }
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

  const spring = prefersReducedMotion
    ? { duration: 0.15 }
    : { type: "spring" as const, bounce: 0, duration: 0.3 };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setCurrentIndex(index ?? 0);
          setOpen(true);
        }}
        className="relative block w-full cursor-zoom-in transition-transform active:scale-[0.98]"
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

            {canNavigate ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  goPrev();
                }}
                aria-label="Foto anterior"
                className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-xl text-neutral-900 transition-transform hover:bg-white active:scale-90 sm:left-4"
              >
                ‹
              </button>
            ) : null}

            {!loadedIds[current.id] ? (
              // Centralizado na tela, independente do tamanho da imagem —
              // antes dela carregar o navegador não sabe as dimensões, então
              // um indicador preso ao contêiner da imagem ficaria escondido
              // (o contêiner some/encolhe até ter conteúdo).
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
              <div className="relative max-h-[85vh] max-w-full overflow-hidden rounded-md">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.img
                    key={current.id}
                    src={current.fullSrc ?? current.src}
                    alt={current.alt}
                    className="max-h-[85vh] max-w-full touch-none rounded-md object-contain"
                    onClick={(event) => event.stopPropagation()}
                    onLoad={() =>
                      setLoadedIds((loaded) => ({ ...loaded, [current.id]: true }))
                    }
                    drag={canNavigate || !prefersReducedMotion ? true : false}
                    dragElastic={0.6}
                    dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
                    onDragEnd={handleDragEnd}
                    initial={
                      prefersReducedMotion
                        ? { opacity: 0 }
                        : { opacity: 0, scale: 0.96 }
                    }
                    animate={
                      prefersReducedMotion
                        ? { opacity: 1 }
                        : { opacity: 1, scale: 1 }
                    }
                    exit={
                      prefersReducedMotion
                        ? { opacity: 0 }
                        : { opacity: 0, scale: 0.96 }
                    }
                    transition={spring}
                  />
                </AnimatePresence>
              </div>
              {loadedIds[current.id] && onToggleSelected ? (
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
              {loadedIds[current.id] && current.downloadSrc ? (
                <a
                  href={current.downloadSrc}
                  download
                  onClick={(event) => event.stopPropagation()}
                  className="rounded-md bg-white/90 px-3 py-1.5 text-sm font-medium text-neutral-900 transition-transform hover:bg-white active:scale-95"
                >
                  Baixar ↓
                </a>
              ) : loadedIds[current.id] && current.sourceUrl ? (
                <a
                  href={current.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => event.stopPropagation()}
                  className="rounded-md bg-white/90 px-3 py-1.5 text-sm font-medium text-neutral-900 transition-transform hover:bg-white active:scale-95"
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
                className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-xl text-neutral-900 transition-transform hover:bg-white active:scale-90 sm:right-4"
              >
                ›
              </button>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
