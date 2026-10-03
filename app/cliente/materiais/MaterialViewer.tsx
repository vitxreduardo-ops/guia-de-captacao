"use client";

import { useRef, useState } from "react";
import { ExternalLink, Maximize2, X } from "lucide-react";
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

function Tile({ item, onOpen }: { item: ViewerItem; onOpen: (item: ViewerItem) => void }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative aspect-[4/5] w-[78%] shrink-0 snap-center overflow-hidden rounded-2xl bg-white sm:w-[60%]">
      {!loaded ? <Spinner /> : null}
      {item.kind === "video" ? (
        <video
          src={item.previewSrc}
          controls
          playsInline
          preload="metadata"
          onLoadedData={() => setLoaded(true)}
          onCanPlay={() => setLoaded(true)}
          className="size-full bg-black object-contain"
        />
      ) : item.kind === "image" ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.thumbSrc}
            alt={item.caption}
            onLoad={() => setLoaded(true)}
            onError={() => setLoaded(true)}
            className="size-full object-contain"
          />
          <button
            type="button"
            onClick={() => onOpen(item)}
            aria-label="Ver em tela cheia"
            className="absolute inset-0 grid place-items-end justify-items-end p-2"
          >
            <span className="grid size-9 place-items-center rounded-full bg-black/55 text-white">
              <Maximize2 className="size-4" aria-hidden />
            </span>
          </button>
        </>
      ) : (
        <a href={item.downloadSrc} className="grid size-full place-items-center p-4 text-center text-sm underline" onClick={() => setLoaded(true)}>
          {item.caption || "Abrir arquivo"}
        </a>
      )}
    </div>
  );
}

/**
 * Prévia do material: os arquivos escolhidos pela equipe numa faixa que desliza
 * (cada um com seu "carregando"), tela cheia ao tocar numa foto e botão pra
 * salvar nas Fotos. Só é montado quando o acordeão abre.
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
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState<ViewerItem | null>(null);
  const [coverLoaded, setCoverLoaded] = useState(false);

  const savable = items.filter((i) => i.kind !== "file");

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
            <Tile
              key={item.id}
              item={item}
              onOpen={(i) => {
                setOpen(i);
                dialog.current?.showModal();
              }}
            />
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
        {savable.length ? (
          <SaveToPhotosButton
            files={savable.map((i) => ({ url: i.downloadSrc, name: i.caption || `arquivo-${i.id}` }))}
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

      <dialog
        ref={dialog}
        onClose={() => setOpen(null)}
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
        className="m-0 h-svh max-h-none w-screen max-w-none bg-black/90 p-0 backdrop:bg-black"
      >
        {open ? (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between p-3 text-white">
              <SaveToPhotosButton
                className="border-white/60 text-white"
                files={[{ url: open.downloadSrc, name: open.caption || `arquivo-${open.id}` }]}
              />
              <button
                type="button"
                onClick={() => dialog.current?.close()}
                aria-label="Fechar"
                className="grid size-11 place-items-center rounded-full bg-white/15"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={open.previewSrc} alt={open.caption} className="min-h-0 flex-1 object-contain" />
          </div>
        ) : null}
      </dialog>
    </div>
  );
}
