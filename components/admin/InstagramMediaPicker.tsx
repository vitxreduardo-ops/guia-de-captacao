"use client";

import { useEffect, useRef, useState } from "react";
import {
  cleanMediaUrls,
  extractDriveFileId,
  IG_CONVERTIBLE_TYPES,
  IG_FORMAT_ERROR,
  igExtensionFor,
  igMediaLimits,
  igMediaProblem,
  igRatioProblem,
  isVideoUrl,
} from "@/lib/instagramMidia";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none disabled:bg-neutral-100";
const buttonClass =
  "rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 pointer-coarse:min-h-11";
const tileButton =
  "flex h-8 min-w-8 items-center justify-center px-1.5 disabled:opacity-30 pointer-coarse:h-11 pointer-coarse:min-w-11";

export interface MediaState {
  count: number;
  /** Texto do que impede publicar com esta lista (ou null). */
  problem: string | null;
}

/** PNG/WebP vira JPEG (fundo branco no lugar da transparência). */
async function toJpeg(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Este navegador não converteu a imagem.");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.92));
  if (!blob) throw new Error("Não consegui converter a imagem pra JPEG.");
  return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
}

/** PUT com progresso (fetch não informa quanto já subiu). */
function putWithProgress(url: string, body: FormData, onProgress: (pct: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Falha no envio (${xhr.status}). Arquivo grande demais?`));
    xhr.onerror = () => reject(new Error("Falha de conexão no envio."));
    xhr.send(body);
  });
}

/**
 * Mídia que o Instagram vai baixar. Três jeitos de preencher: enviar do
 * computador, copiar do Drive do estúdio ou colar um link público. No fim vira
 * a lista de links (um por linha) do campo `ig_media_urls`.
 */
export function InstagramMediaPicker({
  initial,
  format,
  disabled,
  onState,
}: {
  initial: string[];
  format: string;
  disabled?: boolean;
  onState?: (state: MediaState) => void;
}) {
  const [urls, setUrls] = useState(() => cleanMediaUrls(initial));
  const [link, setLink] = useState("");
  // Proporção (largura/altura) de cada mídia, lida da própria miniatura.
  const [ratios, setRatios] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const setRatio = (url: string, w: number, h: number) =>
    h > 0 && setRatios((r) => (r[url] ? r : { ...r, [url]: w / h }));
  const append = (url: string) => setUrls((current) => cleanMediaUrls([...current, url]));
  const remove = (index: number) => setUrls((current) => current.filter((_, i) => i !== index));
  const move = (from: number, to: number) =>
    setUrls((current) => {
      if (to < 0 || to >= current.length || from === to) return current;
      const next = [...current];
      next.splice(to, 0, next.splice(from, 1)[0]);
      return next;
    });

  async function sendFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const list = Array.from(files);
    for (const [i, original] of list.entries()) {
      const prefix = list.length > 1 ? `${i + 1}/${list.length} · ` : "";
      try {
        let file = original;
        if (IG_CONVERTIBLE_TYPES.includes(file.type)) {
          setBusy(`${prefix}Convertendo ${file.name} pra JPEG…`);
          file = await toJpeg(file);
        }
        if (!igExtensionFor(file.type)) throw new Error(`${file.name}: ${IG_FORMAT_ERROR}`);

        setBusy(`${prefix}Enviando ${file.name} · 0%`);
        const sign = await fetch("/api/instagram/midia/assinar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: file.type }),
        });
        const signed = await sign.json();
        if (!sign.ok) throw new Error(signed.error);

        // Mesmo corpo que o supabase-js manda no envio por URL assinada.
        const form = new FormData();
        form.append("cacheControl", "3600");
        form.append("", file);
        await putWithProgress(signed.signedUrl, form, (pct) =>
          setBusy(`${prefix}Enviando ${file.name} · ${pct}%`)
        );
        append(signed.publicUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    }
    setBusy(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function addLink() {
    const value = link.trim();
    if (!value) return;
    setError(null);
    if (!/^https?:\/\//i.test(value)) {
      setError("O link precisa começar com https://");
      return;
    }
    // Link do Drive pede login: copiamos pro Storage, que o Instagram alcança.
    if (/(^|\.)(drive|docs)\.google\.com$/.test(new URL(value).hostname)) {
      if (!extractDriveFileId(value)) {
        setError("Isso não parece um link de arquivo do Drive.");
        return;
      }
      setBusy("Copiando do Drive…");
      try {
        const res = await fetch("/api/instagram/midia/drive", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: value }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        append(data.publicUrl);
        setLink("");
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
      setBusy(null);
      return;
    }
    append(value);
    setLink("");
  }

  const { min, max } = igMediaLimits(format);
  const ratioProblem = igRatioProblem(format, urls.map((u) => ratios[u]));
  // Qual miniatura leva a etiqueta: o número vem no começo da mensagem.
  const flagged = ratioProblem ? Number(ratioProblem.match(/mídia (\d+)/)?.[1]) - 1 : -1;
  const problem = urls.length ? igMediaProblem(format, urls) ?? ratioProblem : null;

  useEffect(() => {
    onState?.({ count: urls.length, problem });
  }, [urls.length, problem, onState]);

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name="ig_media_urls" value={urls.join("\n")} />

      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-neutral-600">Mídia ({urls.length})</span>
        <span className="text-xs text-neutral-500">
          {min === max ? "Este formato leva 1 mídia" : `Este formato leva ${min} a ${max}`}
        </span>
      </div>

      {urls.length ? (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {urls.map((url, index) => (
            <li
              key={url}
              draggable={!disabled}
              onDragStart={() => setDragFrom(index)}
              onDragOver={(e) => dragFrom !== null && e.preventDefault()}
              onDrop={() => {
                if (dragFrom !== null) move(dragFrom, index);
                setDragFrom(null);
              }}
              onDragEnd={() => setDragFrom(null)}
              className={`relative aspect-square overflow-hidden rounded-md border border-neutral-200 bg-neutral-100 ${
                disabled ? "" : "cursor-grab"
              } ${dragFrom === index ? "opacity-40" : ""}`}
            >
              {isVideoUrl(url) ? (
                <video
                  src={`${url}#t=0.1`}
                  muted
                  playsInline
                  preload="metadata"
                  onLoadedMetadata={(e) =>
                    setRatio(url, e.currentTarget.videoWidth, e.currentTarget.videoHeight)
                  }
                  className="h-full w-full object-contain"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={url}
                  alt={`Mídia ${index + 1}`}
                  loading="lazy"
                  draggable={false}
                  onLoad={(e) =>
                    setRatio(url, e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)
                  }
                  className="h-full w-full object-contain"
                />
              )}
              <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 text-xs font-medium text-white">
                {index + 1}
              </span>
              {index === flagged ? (
                <span className="absolute right-1 top-1 rounded bg-red-600 px-1.5 text-xs font-medium text-white">
                  Proporção
                </span>
              ) : null}
              {disabled ? null : (
                <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/60 text-white">
                  <button
                    type="button"
                    aria-label={`Mover mídia ${index + 1} para trás`}
                    disabled={index === 0}
                    onClick={() => move(index, index - 1)}
                    className={tileButton}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    aria-label={`Remover mídia ${index + 1}`}
                    onClick={() => remove(index)}
                    className={tileButton}
                  >
                    ✕
                  </button>
                  <button
                    type="button"
                    aria-label={`Mover mídia ${index + 1} para frente`}
                    disabled={index === urls.length - 1}
                    onClick={() => move(index, index + 1)}
                    className={tileButton}
                  >
                    ›
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-md border border-dashed border-neutral-300 p-3 text-xs text-neutral-500">
          Nenhuma mídia ainda.
        </p>
      )}
      {urls.length > 1 && !disabled ? (
        <p className="text-xs text-neutral-500">Arraste as miniaturas para mudar a ordem.</p>
      ) : null}

      {problem ? <p className="text-xs text-red-600">{problem}</p> : null}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
          className="sr-only"
          onChange={(event) => sendFiles(event.target.files)}
        />
        <button
          type="button"
          className={buttonClass}
          disabled={disabled || busy !== null}
          onClick={() => fileRef.current?.click()}
        >
          Enviar arquivo
        </button>
        <span className="text-xs text-neutral-500">
          JPEG, PNG, WebP, MP4 ou MOV. Carrossel: envie na ordem.
        </span>
      </div>

      <div className="flex gap-2">
        <input
          value={link}
          onChange={(event) => setLink(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addLink();
            }
          }}
          placeholder="Colar link do Drive ou da imagem/vídeo"
          aria-label="Link da mídia"
          disabled={disabled || busy !== null}
          className={inputClass}
        />
        <button
          type="button"
          className={buttonClass}
          disabled={disabled || busy !== null || !link.trim()}
          onClick={addLink}
        >
          Adicionar
        </button>
      </div>

      {busy ? (
        <p className="text-xs text-neutral-500" role="status">
          {busy}
        </p>
      ) : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
