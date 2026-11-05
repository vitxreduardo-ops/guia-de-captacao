"use client";

import { useState } from "react";
import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";
import { ExternalLink, Sparkles } from "lucide-react";

export interface LinkInfo {
  url: string;
  title: string;
  description: string;
  image: string;
  embedUrl: string | null;
}

export async function fetchLinkInfo(url: string): Promise<LinkInfo | null> {
  try {
    const res = await fetch("/api/notion/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    return res.ok ? ((await res.json()) as LinkInfo) : null;
  } catch {
    return null;
  }
}

const normalize = (raw: string) => {
  const t = raw.trim();
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
};
const host = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; } };

/** Campo de URL para blocos recém-criados pelo menu `/` (ainda sem link). */
function UrlPrompt({ onSubmit, label }: { onSubmit: (info: LinkInfo) => void; label: string }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => {
    if (!value.trim()) return;
    setBusy(true);
    setError("");
    const info = await fetchLinkInfo(normalize(value));
    setBusy(false);
    if (info) onSubmit(info);
    else setError("Não consegui abrir esse link.");
  };
  return (
    <div className="w-full rounded-xl border border-dashed border-neutral-300 bg-neutral-50/60 px-4 py-3">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }}
        placeholder={`${label}: cole o link e aperte Enter`}
        disabled={busy}
        className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
      />
      {busy && <p className="mt-1 text-xs text-neutral-400">Buscando…</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

/** Anotação de link: cartão (título, descrição, favicon, capa) com a sua nota como legenda. */
export const Bookmark = createReactBlockSpec(
  {
    type: "bookmark",
    propSchema: {
      url: { default: "" }, title: { default: "" }, description: { default: "" },
      image: { default: "" }, note: { default: "" },
    },
    content: "none",
  },
  {
    render: ({ block, editor }) => {
      const p = block.props;
      if (!p.url) {
        return (
          <UrlPrompt
            label="Anotação de link"
            onSubmit={(i) => editor.updateBlock(block, { type: "bookmark", props: { url: i.url, title: i.title, description: i.description, image: i.image } })}
          />
        );
      }
      return (
        <div className="w-full">
          <a
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "none" }}
            className="flex min-h-[88px] overflow-hidden rounded-xl border border-neutral-200 bg-white text-neutral-900 transition hover:bg-neutral-50"
          >
            <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 p-3.5">
              <div>
                <div className="truncate text-sm font-medium">{p.title || host(p.url)}</div>
                {p.description && <div className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-neutral-500">{p.description}</div>}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/favicon?domain=${encodeURIComponent(host(p.url))}`} alt="" width={14} height={14} className="size-3.5 rounded-sm" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                <span className="truncate">{host(p.url)}</span>
              </div>
            </div>
            {p.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.image} alt="" className="hidden w-[32%] min-w-[120px] max-w-[220px] shrink-0 object-cover sm:block" />
            )}
          </a>
          <input
            defaultValue={p.note}
            onBlur={(e) => { if (e.target.value !== p.note) editor.updateBlock(block, { type: "bookmark", props: { note: e.target.value } }); }}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            placeholder="Adicionar legenda…"
            aria-label="Legenda do link"
            className="mt-1 block w-full bg-transparent px-1 text-sm italic text-neutral-600 outline-none placeholder:text-neutral-300"
          />
        </div>
      );
    },
  }
);

/** Embed: iframe redimensionável quando o site deixa; senão um cartão com botão de abrir. */
export const Embed = createReactBlockSpec(
  {
    type: "embed",
    propSchema: { url: { default: "" }, embedUrl: { default: "" }, title: { default: "" } },
    content: "none",
  },
  {
    render: ({ block, editor }) => {
      const p = block.props;
      if (!p.url) {
        return (
          <UrlPrompt
            label="Embed ou artifact"
            onSubmit={(i) => editor.updateBlock(block, { type: "embed", props: { url: i.url, embedUrl: i.embedUrl ?? "", title: i.title } })}
          />
        );
      }
      if (!p.embedUrl) {
        const artifact = host(p.url).endsWith("claude.ai");
        return (
          <div className="flex w-full items-center gap-4 rounded-xl border border-neutral-200 bg-white p-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-neutral-100 text-neutral-500">
              {artifact ? <Sparkles className="size-5" /> : <ExternalLink className="size-5" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{p.title || host(p.url)}</div>
              <div className="truncate text-xs text-neutral-500">
                {artifact ? "Artifact do Claude" : host(p.url)} · abre em outra aba
              </div>
            </div>
            <a
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none" }}
              className="shrink-0 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700"
            >
              {artifact ? "Abrir artifact" : "Abrir"} ↗
            </a>
          </div>
        );
      }
      return (
        <div className="w-full">
          <div
            className="overflow-hidden rounded-xl border border-neutral-200"
            style={{ resize: "vertical", height: 420, minHeight: 200 }}
          >
            <iframe
              src={p.embedUrl}
              title={p.title || host(p.url)}
              loading="lazy"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              allowFullScreen
              className="block size-full"
            />
          </div>
          <a
            href={p.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: "none" }}
            className="mt-1 block truncate px-1 text-xs text-neutral-400 hover:text-neutral-600"
          >
            {p.title || host(p.url)} · {host(p.url)} ↗
          </a>
        </div>
      );
    },
  }
);

export const schema = BlockNoteSchema.create({
  blockSpecs: { ...defaultBlockSpecs, bookmark: Bookmark(), embed: Embed() },
});
