"use client";

import { useEffect, useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type PanInfo,
} from "motion/react";
import { GalleryThumb } from "@/components/GalleryThumb";

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
  /** Id usado ao marcar como selecionada — os slides de um carrossel são
   * várias imagens da galeria, mas um item só no banco. */
  selectId?: string;
  /** Player embutido (Instagram, YouTube...): abre no lugar da imagem. */
  embedUrl?: string | null;
  /** Quantas imagens o carrossel deste item tem (selo na miniatura). */
  slideCount?: number;
}

function embedFrameClass(url: string) {
  // Reels e TikTok são verticais; o resto é 16:9.
  return /instagram\.com|tiktok\.com/.test(url)
    ? "aspect-[9/16] h-[80vh] max-w-full"
    : "aspect-video w-[min(90vw,960px)]";
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
  const [failedIds, setFailedIds] = useState<Record<string, boolean>>({});
  const prefersReducedMotion = useReducedMotion();

  const items =
    gallery && gallery.length > 0
      ? gallery
      : [{ id, src, fullSrc, downloadSrc, alt, sourceUrl, selected }];
  const canNavigate = items.length > 1;
  const current = items[currentIndex] ?? items[0];
  const thumb = items[index ?? 0] ?? items[0];
  // Slides do carrossel aberto agora (todos os itens da galeria com o mesmo
  // item no banco), com a posição de cada um na galeria.
  const carousel =
    (current.slideCount ?? 1) > 1
      ? items
          .map((item, galleryIndex) => ({ item, galleryIndex }))
          .filter(
            ({ item }) =>
              (item.selectId ?? item.id) === (current.selectId ?? current.id)
          )
      : [];
  // Sobra espaço pra faixa de miniaturas sem a imagem cobrir o "Fechar".
  const imageMaxH = carousel.length > 1 ? "max-h-[70vh]" : "max-h-[85vh]";

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
        <GalleryThumb
          src={src}
          alt={alt}
          caption={alt}
          className={`${className ?? ""} ${
            selected ? "opacity-40 grayscale" : ""
          }`}
        />
        {thumb.embedUrl ? (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 pl-0.5 text-sm text-neutral-900 shadow-sm">
              ▶
            </span>
          </span>
        ) : null}
        {(thumb.slideCount ?? 1) > 1 ? (
          <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
            1/{thumb.slideCount}
          </span>
        ) : null}
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

            {!loadedIds[current.id] && !failedIds[current.id] ? (
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

            {failedIds[current.id] ? (
              <div
                onClick={(event) => event.stopPropagation()}
                className="flex flex-col items-center gap-2 rounded-md bg-white/90 px-6 py-5 text-center"
              >
                <span aria-hidden className="text-xl text-neutral-400">
                  ⚠
                </span>
                <p className="text-sm font-medium text-neutral-800">
                  Não foi possível carregar esta foto.
                </p>
                <p className="max-w-xs text-xs text-neutral-500">{current.alt}</p>
              </div>
            ) : null}

            <div
              className={`flex max-h-full max-w-full flex-col items-center gap-3 ${
                failedIds[current.id] ? "hidden" : ""
              }`}
            >
              <div className={`relative ${imageMaxH} max-w-full overflow-hidden rounded-md`}>
                {current.embedUrl ? (
                  <iframe
                    key={current.id}
                    src={current.embedUrl}
                    title={current.alt}
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                    onLoad={() =>
                      setLoadedIds((loaded) => ({ ...loaded, [current.id]: true }))
                    }
                    onClick={(event) => event.stopPropagation()}
                    className={`${embedFrameClass(current.embedUrl)} rounded-md bg-black`}
                  />
                ) : (
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.img
                    key={current.id}
                    src={current.fullSrc ?? current.src}
                    alt={current.alt}
                    className={`${imageMaxH} max-w-full touch-none rounded-md object-contain`}
                    onClick={(event) => event.stopPropagation()}
                    onLoad={() =>
                      setLoadedIds((loaded) => ({ ...loaded, [current.id]: true }))
                    }
                    onError={() =>
                      setFailedIds((failed) => ({ ...failed, [current.id]: true }))
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
                )}
              </div>
              {carousel.length > 1 ? (
                <div
                  onClick={(event) => event.stopPropagation()}
                  className="flex max-w-full items-center gap-1.5 overflow-x-auto rounded-md bg-black/40 p-1.5"
                >
                  <span className="shrink-0 px-1 text-xs font-medium text-white/80">
                    Carrossel{" "}
                    {carousel.findIndex(({ item }) => item.id === current.id) + 1}/
                    {carousel.length}
                  </span>
                  {carousel.map(({ item, galleryIndex }, slideIndex) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCurrentIndex(galleryIndex)}
                      aria-label={`Slide ${slideIndex + 1} de ${carousel.length}`}
                      aria-current={item.id === current.id}
                      className={`h-12 w-12 shrink-0 overflow-hidden rounded transition-opacity ${
                        item.id === current.id
                          ? "ring-2 ring-white"
                          : "opacity-50 hover:opacity-100"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- miniatura de URL externa, igual ao resto do lightbox */}
                      <img
                        src={item.src}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              ) : null}
              {loadedIds[current.id] && onToggleSelected ? (
                <label
                  onClick={(event) => event.stopPropagation()}
                  className="flex cursor-pointer items-center gap-2 rounded-md bg-white/90 px-3 py-1.5 text-sm font-medium text-neutral-900 hover:bg-white"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(current.selected)}
                    onChange={() =>
                      onToggleSelected(
                        current.selectId ?? current.id,
                        !current.selected
                      )
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
