"use client";

import { useState, useSyncExternalStore } from "react";
import { Download, ImageDown, Loader2 } from "lucide-react";

export interface SaveFile {
  url: string;
  name: string;
}

/**
 * Salva foto/vídeo no celular. O iOS não deixa página web escrever na
 * biblioteca de Fotos; o caminho é a folha de compartilhamento do sistema
 * (`navigator.share` com arquivos), que traz "Salvar imagem/vídeo". Onde isso
 * não existe (computador, navegador antigo) o botão baixa o arquivo.
 *
 * O Safari só aceita `share()` logo após um toque; se o download demorou e a
 * permissão expirou, os arquivos ficam guardados e o segundo toque
 * compartilha na hora.
 */
export function SaveToPhotosButton({
  files,
  className = "",
}: {
  files: SaveFile[];
  className?: string;
}) {
  // Falso no servidor e na hidratação; o navegador responde depois.
  const canShare = useSyncExternalStore(
    () => () => {},
    () => {
      const probe = new File([new Uint8Array(1)], "a.jpg", { type: "image/jpeg" });
      return Boolean(navigator.canShare?.({ files: [probe] }));
    },
    () => false
  );
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState<File[] | null>(null);
  const [failed, setFailed] = useState(false);

  function downloadAll(list: File[]) {
    for (const file of list) {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(file);
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
    }
  }

  async function onClick() {
    setFailed(false);
    let list = ready;
    if (!list) {
      setBusy(true);
      try {
        list = [];
        for (const file of files) {
          const response = await fetch(file.url);
          if (!response.ok) continue;
          const blob = await response.blob();
          list.push(new File([blob], file.name, { type: blob.type || "application/octet-stream" }));
        }
      } catch {
        setFailed(true);
        return;
      } finally {
        setBusy(false);
      }
      if (!list.length) return setFailed(true);
    }

    if (!canShare) {
      downloadAll(list);
      return;
    }
    try {
      await navigator.share({ files: list });
      setReady(null);
    } catch (error) {
      // Cancelar a folha é normal; permissão expirada pede um segundo toque.
      if ((error as DOMException)?.name === "AbortError") setReady(null);
      else setReady(list);
    }
  }

  const Icon = busy ? Loader2 : canShare ? ImageDown : Download;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--tatu-ink)] px-4 text-sm font-semibold disabled:opacity-70 ${className}`}
    >
      <Icon className={`size-4 ${busy ? "animate-spin" : ""}`} aria-hidden />
      {busy
        ? "Preparando…"
        : failed
          ? "Não foi possível. Tentar de novo"
          : ready
            ? "Toque de novo para salvar"
            : canShare
              ? "Salvar nas Fotos"
              : "Baixar"}
    </button>
  );
}
