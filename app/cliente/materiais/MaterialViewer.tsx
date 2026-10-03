"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Play, X } from "lucide-react";
import { SaveToPhotosButton } from "@/components/SaveToPhotosButton";

export interface ViewerItem {
  id: string;
  kind: "image" | "video" | "file";
  thumbSrc: string;
  previewSrc: string;
  downloadSrc: string;
  caption: string;
}

function Spinner() {
  return (
    <span className="absolute inset-0 grid place-items-center bg-white/70" role="status" aria-label="Carregando">
      <span className="size-8 animate-spin rounded-full border-2 border-[var(--tatu-taupe)] border-t-[var(--tatu-ink)]" />
    </span>
  );
}

function Tile({ item, onOpen }: { item: ViewerItem; onOpen: () => void }) {
  const [loaded, setLoaded] = useState(false);

  if (item.kind === "file") {
    return (
      <a
        href={item.downloadSrc}
        className="grid aspect-[4/5] w-[78%] shrink-0 snap-center place-items-center rounded-2xl bg-white p-4 text-center text-sm underline sm:w-[60%]"
      >
        {item.caption || "Abrir arquivo"}
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={item.kind === "video" ? `Reproduzir ${item.caption || "vídeo"}` : `Ampliar ${item.caption || "foto"}`}
      className="relative aspect-[4/5] w-[78%] shrink-0 snap-center overflow-hidden rounded-2xl bg-white sm:w-[60%]"
    >
      {!loaded ? <Spinner /> : null}
      {item.kind === "video" ? (
        <>
          <video
            src={item.previewSrc}
            muted
            playsInline
            preload="metadata"
            onLoadedData={() => setLoaded(true)}
            className="size-full bg-black object-cover"
          />
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid size-14 place-items-center rounded-full bg-black/60 text-white">
              <Play className="size-6 translate-x-0.5" aria-hidden />
            </span>
          </span>
        </>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.thumbSrc}
          alt={item.caption}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(true)}
          className="size-full object-contain"
        />
      )}
    </button>
  );
}

/**
 * Tela cheia dos arquivos do material. Com mais de um vira carrossel: setas,
 * teclado, deslize no celular e contador. Foto e vídeo abrem aqui do mesmo
 * jeito; o vídeo toca ao abrir e para ao trocar de arquivo.
 */
function MediaLightbox({
  items,
  index,
  onIndex,
  onClose,
}: {
  items: ViewerItem[];
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
}) {
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const startX = useRef<number | null>(null);
  const item = items[index];
  const many = items.length > 1;
  const go = (delta: number) => onIndex((index + delta + items.length) % items.length);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      else if (many && event.key === "ArrowRight") go(1);
      else if (many && event.key === "ArrowLeft") go(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Arquivo ${index + 1} de ${items.length}`}
      className="fixed inset-0 z-50 flex flex-col bg-black/95 text-white"
      // Arrastar a barra de progresso do vídeo não pode trocar de arquivo.
      onPointerDown={(e) => (startX.current = (e.target as HTMLElement).closest("video") ? null : e.clientX)}
      onPointerUp={(e) => {
        if (startX.current === null || !many) return;
        const dx = e.clientX - startX.current;
        startX.current = null;
        if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
      }}
    >
      <div className="flex items-center justify-between gap-2 p-3">
        <span className="min-w-12 text-sm tabular-nums text-white/80">{many ? `${index + 1} de ${items.length}` : ""}</span>
        <SaveToPhotosButton
          className="!border-white/60 !text-white"
          files={[{ url: item.downloadSrc, name: item.caption || `arquivo-${item.id}` }]}
        />
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="grid size-11 place-items-center rounded-full bg-white/15"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
        {loadedId !== item.id ? (
          <span className="absolute inset-0 z-10 grid place-items-center" role="status" aria-label="Carregando">
            <span className="size-9 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          </span>
        ) : null}
        {item.kind === "video" ? (
          <video
            key={item.id}
            src={item.previewSrc}
            controls
            autoPlay
            playsInline
            onLoadedData={() => setLoadedId(item.id)}
            className="size-full object-contain"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={item.id}
            src={item.previewSrc}
            alt={item.caption}
            onLoad={() => setLoadedId(item.id)}
            onError={() => setLoadedId(item.id)}
            className="size-full object-contain"
          />
        )}

        {many ? (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Anterior"
              className="absolute left-2 top-1/2 z-20 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-black/55"
            >
              <ChevronLeft className="size-6" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Próximo"
              className="absolute right-2 top-1/2 z-20 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-black/55"
            >
              <ChevronRight className="size-6" aria-hidden />
            </button>
          </>
        ) : null}
      </div>

      {many ? (
        <div className="flex justify-center gap-1.5 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]" aria-hidden>
          {items.map((it, i) => (
            <span key={it.id} className={`h-1.5 rounded-full ${i === index ? "w-5 bg-white" : "w-1.5 bg-white/40"}`} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Prévia do material: os arquivos escolhidos pela equipe numa faixa que desliza
 * (cada um com seu "carregando"). Tocar em foto ou vídeo abre o lightbox, em
 * carrossel quando há mais de um. O botão salva todos nas Fotos.
 */
export function MaterialViewer({
  items,
  coverUrl,
  driveUrl,
}: {
  items: ViewerItem[];
  coverUrl: string | null;
  driveUrl: string | null;
}) {
  const viewable = items.filter((i) => i.kind !== "file");
  const [open, setOpen] = useState<number | null>(null);
  const [coverLoaded, setCoverLoaded] = useState(false);

  if (!items.length && !coverUrl && !driveUrl) {
    return (
      <p className="rounded-2xl bg-white/60 p-4 text-sm text-[var(--tatu-muted)]">
        Os arquivos deste material ainda não foram anexados. Se precisar
        conferi-lo agora, fale com a nossa equipe.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.length ? (
        <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {items.map((item) => (
            <Tile key={item.id} item={item} onOpen={() => setOpen(viewable.findIndex((v) => v.id === item.id))} />
          ))}
        </div>
      ) : coverUrl ? (
        <div className="relative overflow-hidden rounded-2xl bg-white">
          {!coverLoaded ? <Spinner /> : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverUrl}
            alt=""
            onLoad={() => setCoverLoaded(true)}
            onError={() => setCoverLoaded(true)}
            className="max-h-[60svh] w-full object-contain"
          />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {viewable.length ? (
          <SaveToPhotosButton
            files={viewable.map((i) => ({ url: i.downloadSrc, name: i.caption || `arquivo-${i.id}` }))}
          />
        ) : null}
        {driveUrl ? (
          <a
            href={driveUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--tatu-border)] px-4 text-sm font-semibold"
          >
            Abrir no Drive <ExternalLink className="size-4" aria-hidden />
          </a>
        ) : null}
      </div>

      {open !== null && viewable[open] ? (
        <MediaLightbox items={viewable} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />
      ) : null}
    </div>
  );
}
