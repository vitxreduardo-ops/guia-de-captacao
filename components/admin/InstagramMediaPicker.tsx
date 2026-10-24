"use client";

import { useRef, useState } from "react";
import { IG_FORMAT_ERROR, igExtensionFor } from "@/lib/instagramMidia";

const inputClass =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none disabled:bg-neutral-100";
const buttonClass =
  "rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50";

/**
 * Mídia que o Instagram vai baixar. Três jeitos de preencher: enviar do
 * computador, copiar do Drive do estúdio ou colar um link público. No fim vira
 * a lista de links (um por linha) do campo `ig_media_urls`.
 */
export function InstagramMediaPicker({
  initial,
  disabled,
}: {
  initial: string[];
  disabled?: boolean;
}) {
  const [urls, setUrls] = useState(initial.join("\n"));
  const [driveLink, setDriveLink] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const append = (url: string) =>
    setUrls((current) => (current.trim() ? `${current.trim()}\n${url}` : url));

  async function sendFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    for (const file of Array.from(files)) {
      if (!igExtensionFor(file.type)) {
        setError(`${file.name}: ${IG_FORMAT_ERROR}`);
        continue;
      }
      setBusy(`Enviando ${file.name}…`);
      try {
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
        const put = await fetch(signed.signedUrl, { method: "PUT", body: form });
        if (!put.ok) throw new Error(`Falha no envio (${put.status}). Arquivo grande demais?`);
        append(signed.publicUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    }
    setBusy(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function importDrive() {
    if (!driveLink.trim()) return;
    setError(null);
    setBusy("Copiando do Drive…");
    try {
      const res = await fetch("/api/instagram/midia/drive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: driveLink.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      append(data.publicUrl);
      setDriveLink("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
    setBusy(null);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/jpeg,video/mp4,video/quicktime"
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
        <span className="text-xs text-neutral-500">JPEG, MP4 ou MOV. Carrossel: envie na ordem.</span>
      </div>

      <div className="flex gap-2">
        <input
          value={driveLink}
          onChange={(event) => setDriveLink(event.target.value)}
          placeholder="Link do arquivo no Drive"
          disabled={disabled || busy !== null}
          className={inputClass}
        />
        <button
          type="button"
          className={buttonClass}
          disabled={disabled || busy !== null || !driveLink.trim()}
          onClick={importDrive}
        >
          Importar
        </button>
      </div>

      {busy ? <p className="text-xs text-neutral-500">{busy}</p> : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}

      <label className="text-xs font-medium text-neutral-600" htmlFor="backlog-ig-media">
        Links da mídia (um por linha; carrossel: 2 a 20)
      </label>
      <textarea
        id="backlog-ig-media"
        name="ig_media_urls"
        value={urls}
        onChange={(event) => setUrls(event.target.value)}
        rows={3}
        readOnly={disabled}
        placeholder="https://..."
        className={inputClass}
      />
    </div>
  );
}
