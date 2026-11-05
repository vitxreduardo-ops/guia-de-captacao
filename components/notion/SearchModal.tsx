"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Search } from "lucide-react";
import { searchPagesAction } from "@/app/admin/notas/actions";
import type { PageHit } from "@/lib/notion";
import type { PageMeta } from "@/lib/notionTree";
import { tagKey } from "@/lib/tags";
import { relativeTime } from "./ui";

const label = (p: PageMeta) => p.title || "Sem título";

function Highlight({ text, term }: { text: string; term: string }) {
  const i = term ? text.toLowerCase().indexOf(term.toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded bg-amber-200/70 px-0.5 text-inherit">{text.slice(i, i + term.length)}</mark>
      {text.slice(i + term.length)}
    </>
  );
}

/** Busca rápida (⌘K): páginas recentes antes de digitar, trecho que bateu depois. */
export function SearchModal({ pages, onClose }: { pages: PageMeta[]; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<PageHit[]>([]);
  const [cursor, setCursor] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const recent = useMemo(
    () =>
      pages.filter((p) => !p.archived_at)
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 8)
        .map((p) => ({ ...p, snippet: "" })),
    [pages]
  );

  useEffect(() => {
    if (!q.trim()) return;
    let stale = false;
    const t = setTimeout(() => searchPagesAction(q).then((r) => { if (!stale) setHits(r); }), 200);
    return () => { stale = true; clearTimeout(t); };
  }, [q]);

  const term = q.trim();
  // A busca do servidor olha título e texto; tags a gente já tem aqui, então casa no cliente.
  const byTag: PageHit[] = useMemo(() => {
    const k = tagKey(term.replace(/^#/, ""));
    if (!k) return [];
    return pages
      .filter((p) => !p.archived_at && p.tags.some((t) => tagKey(t).includes(k)))
      .map((p) => ({ ...p, snippet: p.tags.map((t) => `#${t}`).join(" ") }));
  }, [pages, term]);
  const merged = [...byTag, ...hits.filter((h) => !byTag.some((b) => b.id === h.id))];
  const rows: PageHit[] = term ? merged : recent;
  const active = Math.min(cursor, Math.max(0, rows.length - 1));

  const go = (p: PageMeta) => { onClose(); router.push(`/admin/notas/${p.id}`); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    else if (e.key === "ArrowDown") { e.preventDefault(); setCursor(Math.min(active + 1, rows.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setCursor(Math.max(active - 1, 0)); }
    else if (e.key === "Enter" && rows[active]) go(rows[active]);
  };

  useEffect(() => {
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active]);

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/30 px-4 pt-[12vh]" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-label="Buscar nas notas"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={onKey}
        className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center gap-2 border-b border-neutral-100 px-4">
          <Search className="size-4 text-neutral-400" />
          <input
            autoFocus
            value={q}
            onChange={(e) => { setQ(e.target.value); setCursor(0); }}
            placeholder="Buscar em todas as notas…"
            className="h-12 flex-1 bg-transparent text-[15px] outline-none placeholder:text-neutral-400"
          />
          <kbd className="rounded border border-neutral-200 px-1.5 py-0.5 text-[10px] text-neutral-400">esc</kbd>
        </div>
        <p className="px-4 pt-3 text-xs font-medium text-neutral-400">{term ? "Resultados" : "Recentes"}</p>
        <ul ref={listRef} className="max-h-[50vh] overflow-y-auto p-2">
          {rows.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-neutral-400">
              {term ? "Nada encontrado." : "Nenhuma nota ainda."}
            </li>
          )}
          {rows.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => go(p)}
                onMouseMove={() => setCursor(i)}
                className={`flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left ${i === active ? "bg-neutral-100" : ""}`}
              >
                <span className="mt-0.5 w-5 text-center">
                  {p.icon || <FileText className="mx-auto size-4 text-neutral-400" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-neutral-900">
                    <Highlight text={label(p)} term={term} />
                  </span>
                  {term && p.snippet && (
                    <span className="mt-0.5 block truncate text-xs text-neutral-500">
                      <Highlight text={p.snippet} term={term} />
                    </span>
                  )}
                </span>
                {!term && <span className="mt-0.5 shrink-0 text-xs text-neutral-400">{relativeTime(p.updated_at)}</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
