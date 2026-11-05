"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { FileText, ImagePlus, MoreHorizontal, Smile, Star, Trash2, Maximize2, X } from "lucide-react";
import { archivePageAction, createPageAction, savePageAction, setFavoriteAction } from "@/app/admin/notas/actions";
import type { NotionPage } from "@/lib/notion";
import { pagePath, type PageMeta } from "@/lib/notionTree";
import { buildTagSpellingMap, tagKey } from "@/lib/tags";
import { Menu, menuItem, relativeTime, TopBar } from "./ui";

// O editor pesa (ProseMirror + Mantine): só carrega no navegador, quando a página abre.
const BlockEditor = dynamic(() => import("./BlockEditor"), {
  ssr: false,
  loading: () => <p className="py-2 text-sm text-neutral-400">Carregando…</p>,
});

type Status = "saved" | "pending" | "error" | "conflict";

const EMOJIS = ["📝", "💡", "📌", "⭐", "🎯", "🚀", "🎨", "🎬", "📷", "🧠", "📚", "🔗", "✅", "🔥", "💬", "🗂️", "📅", "💰", "🧩", "🌱", "🎧", "✍️", "🔍", "🏷️"];

// Capas de cor (sem imagem pra subir): "cor:<nome>" guardado na página.
const COVERS: Record<string, string> = {
  areia: "linear-gradient(135deg,#e7dfd2,#f5efe6)",
  grafite: "linear-gradient(135deg,#2b2b2b,#555)",
  mar: "linear-gradient(135deg,#9ec5d8,#dfeef5)",
  mato: "linear-gradient(135deg,#a9c4a0,#e3eedd)",
  rosa: "linear-gradient(135deg,#e8b4b8,#f7e3e4)",
  sol: "linear-gradient(135deg,#f1c27d,#fbe9c9)",
};
const coverStyle = (c: string) =>
  c.startsWith("cor:") ? { background: COVERS[c.slice(4)] ?? COVERS.areia } : { backgroundImage: `url(${JSON.stringify(c)})`, backgroundSize: "cover", backgroundPosition: "center" };

const ghost = "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700";

export function PageEditor({ page, pages }: { page: NotionPage; pages: PageMeta[] }) {
  const [title, setTitle] = useState(page.title);
  const [icon, setIcon] = useState(page.icon);
  const [cover, setCover] = useState(page.cover);
  const [wide, setWide] = useState(page.full_width);
  const [favorite, setFavorite] = useState(page.favorite);
  const [tags, setTags] = useState(page.tags);
  const [status, setStatus] = useState<Status>("saved");
  const [editedAt, setEditedAt] = useState(page.updated_at);
  const [coverUrl, setCoverUrl] = useState("");
  const [, start] = useTransition();
  const router = useRouter();

  // Estado de salvamento em refs: o timer e o laço de gravação não dependem de render.
  const latest = useRef({
    title: page.title, icon: page.icon, cover: page.cover, full_width: page.full_width, tags: page.tags,
    content: page.content as unknown[],
  });
  const version = useRef(page.updated_at);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saving = useRef(false);
  const dirty = useRef(false);
  const conflict = useRef(false);
  const shown = useRef({ title: page.title, icon: page.icon }); // o que a barra lateral já mostra

  const flush = useCallback(async () => {
    if (saving.current || conflict.current) return;
    saving.current = true;
    try {
      while (dirty.current && !conflict.current) {
        dirty.current = false;
        try {
          const sent = latest.current;
          const r = await savePageAction(page.id, sent, version.current);
          if (r.ok) {
            version.current = r.updated_at;
            setEditedAt(r.updated_at);
            // A barra lateral mostra título e ícone: só atualiza quando eles mudaram.
            if (sent.title !== shown.current.title || sent.icon !== shown.current.icon) {
              shown.current = { title: sent.title, icon: sent.icon };
              router.refresh();
            }
          } else { conflict.current = true; setStatus("conflict"); }
        } catch {
          dirty.current = true;
          setStatus("error");
          return;
        }
      }
      if (!conflict.current) setStatus("saved");
    } finally {
      saving.current = false;
    }
  }, [page.id, router]);

  const schedule = useCallback(() => {
    if (conflict.current) return;
    dirty.current = true;
    setStatus("pending");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 700);
  }, [flush]);

  // Ao sair da página, grava na hora o que ainda estava no timer.
  useEffect(() => () => {
    if (timer.current) { clearTimeout(timer.current); void flush(); }
  }, [flush]);

  const edit = (patch: Partial<typeof latest.current>) => {
    latest.current = { ...latest.current, ...patch };
    schedule();
  };
  const changeIcon = (v: string) => { setIcon(v); edit({ icon: v }); };
  const changeCover = (v: string) => { setCover(v); edit({ cover: v }); };
  const changeTags = (v: string[]) => { setTags(v); edit({ tags: v }); };

  const path = pagePath(pages, page.id);
  const children = pages.filter((p) => p.parent_id === page.id && !p.archived_at).sort((a, b) => a.position - b.position);

  const crumbs = [
    { label: "Início", href: "/admin/notas" },
    ...path.slice(0, -1).map((p) => ({ label: p.title || "Sem título", icon: p.icon, href: `/admin/notas/${p.id}` })),
    { label: title || "Sem título", icon },
  ];

  const statusText =
    status === "conflict" ? "Esta página mudou em outra aba." :
    status === "error" ? "Não salvou. Vou tentar de novo." :
    status === "pending" ? "Salvando…" : `Editado ${relativeTime(editedAt)}`;

  return (
    <>
      <TopBar
        crumbs={crumbs}
        right={
          <>
            <span className={`hidden sm:inline ${status === "error" || status === "conflict" ? "text-red-600" : ""}`}>{statusText}</span>
            {status === "conflict" && (
              <button type="button" onClick={() => location.reload()} className="rounded px-1.5 py-0.5 font-medium text-red-600 underline">
                Recarregar
              </button>
            )}
            <button
              type="button"
              aria-label={favorite ? "Tirar dos favoritos" : "Favoritar"}
              onClick={() => { setFavorite(!favorite); start(() => setFavoriteAction(page.id, !favorite)); }}
              className="grid size-8 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100"
            >
              <Star className={`size-4 ${favorite ? "fill-amber-400 text-amber-400" : ""}`} />
            </button>
            <Menu label="Mais ações" triggerClassName="grid size-8 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100" trigger={<MoreHorizontal className="size-4" />}>
              {(close) => (
                <>
                  <button type="button" className={menuItem} onClick={() => { close(); setWide(!wide); edit({ full_width: !wide }); }}>
                    <Maximize2 className="size-4" /> {wide ? "Largura normal" : "Largura total"}
                  </button>
                  <button
                    type="button"
                    className={`${menuItem} text-red-600`}
                    onClick={() => {
                      close();
                      if (confirm("Mover esta página e suas subpáginas para a lixeira?")) start(() => archivePageAction(page.id));
                    }}
                  >
                    <Trash2 className="size-4" /> Mover para a lixeira
                  </button>
                </>
              )}
            </Menu>
          </>
        }
      />

      {cover && (
        <div className="group/cover relative h-44 w-full sm:h-52" style={coverStyle(cover)} role="img" aria-label="Capa da página">
          <div className="absolute bottom-3 right-4 flex gap-2 opacity-0 transition-opacity group-hover/cover:opacity-100 focus-within:opacity-100">
            <CoverMenu cover={cover} coverUrl={coverUrl} setCoverUrl={setCoverUrl} onPick={changeCover} label="Trocar capa" />
            <button type="button" onClick={() => changeCover("")} className="rounded-md bg-white/90 px-2.5 py-1 text-xs text-neutral-700 shadow-sm hover:bg-white">
              Remover
            </button>
          </div>
        </div>
      )}

      <article className={`mx-auto w-full px-6 pb-40 sm:px-12 ${wide ? "max-w-none" : "max-w-[760px]"}`}>
        <div className={`group/head ${cover ? "-mt-8" : "pt-8 sm:pt-12"}`}>
          {icon && (
            <Menu label="Trocar ícone" align="left" triggerClassName="mb-1 block rounded-lg text-[56px] leading-none hover:bg-neutral-100" trigger={icon}>
              {(close) => <EmojiPicker onPick={(e) => { changeIcon(e); close(); }} />}
            </Menu>
          )}
          <div className="mb-1 flex gap-1 opacity-0 transition-opacity group-hover/head:opacity-100 focus-within:opacity-100">
            {!icon && (
              <Menu label="Adicionar ícone" align="left" triggerClassName={ghost} trigger={<><Smile className="size-4" /> Adicionar ícone</>}>
                {(close) => <EmojiPicker onPick={(e) => { changeIcon(e); close(); }} />}
              </Menu>
            )}
            {!cover && (
              <CoverMenu cover={cover} coverUrl={coverUrl} setCoverUrl={setCoverUrl} onPick={changeCover} label="Adicionar capa" ghost />
            )}
          </div>
          <textarea
            rows={1}
            value={title}
            onChange={(e) => { setTitle(e.target.value); edit({ title: e.target.value }); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); document.querySelector<HTMLElement>(".notas-editor .bn-editor")?.focus(); }
            }}
            placeholder="Sem título"
            aria-label="Título da página"
            // field-sizing: o campo cresce com o texto (título longo quebra linha em vez de cortar).
            className="block w-full resize-none overflow-hidden bg-transparent text-[30px] font-bold leading-tight tracking-tight outline-none [field-sizing:content] placeholder:text-neutral-300 sm:text-[40px]"
          />
        </div>

        <TagField tags={tags} known={pages.flatMap((p) => p.tags)} onChange={changeTags} />

        <div className="notas-editor mt-3">
          <BlockEditor initialContent={page.content} onChange={(content) => edit({ content })} />
        </div>

        <section aria-label="Subpáginas" className="mt-10">
          {children.length > 0 && (
            <>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Subpáginas</h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {children.map((c) => (
                  <li key={c.id}>
                    <Link href={`/admin/notas/${c.id}`} className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm hover:bg-neutral-50">
                      {c.icon ? <span>{c.icon}</span> : <FileText className="size-4 text-neutral-400" />}
                      <span className="truncate">{c.title || "Sem título"}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
          <button type="button" onClick={() => start(() => createPageAction(page.id))} className={`${ghost} mt-3`}>
            + Adicionar subpágina
          </button>
        </section>
      </article>
    </>
  );
}

function EmojiPicker({ onPick }: { onPick: (e: string) => void }) {
  const [custom, setCustom] = useState("");
  return (
    <div className="w-64 p-1">
      <div className="grid grid-cols-8 gap-0.5">
        {EMOJIS.map((e) => (
          <button key={e} type="button" onClick={() => onPick(e)} className="grid size-7 place-items-center rounded text-lg hover:bg-neutral-100">
            {e}
          </button>
        ))}
      </div>
      <div className="mt-2 flex gap-1">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && custom.trim()) onPick(custom.trim().slice(0, 4)); }}
          placeholder="Outro emoji"
          className="h-8 min-w-0 flex-1 rounded-lg border border-neutral-200 px-2 text-sm outline-none focus:border-neutral-400"
        />
        <button type="button" onClick={() => onPick("")} className="rounded-lg px-2 text-xs text-neutral-500 hover:bg-neutral-100">
          <X className="mr-0.5 inline size-3" /> Tirar
        </button>
      </div>
    </div>
  );
}

function CoverMenu({
  coverUrl, setCoverUrl, onPick, label, ghost: asGhost,
}: {
  cover: string; coverUrl: string; setCoverUrl: (v: string) => void; onPick: (c: string) => void; label: string; ghost?: boolean;
}) {
  return (
    <Menu
      label={label}
      align="left"
      triggerClassName={asGhost ? ghost : "rounded-md bg-white/90 px-2.5 py-1 text-xs text-neutral-700 shadow-sm hover:bg-white"}
      trigger={asGhost ? <><ImagePlus className="size-4" /> {label}</> : label}
    >
      {(close) => (
        <div className="w-64 p-1">
          <div className="grid grid-cols-3 gap-1.5">
            {Object.entries(COVERS).map(([name, bg]) => (
              <button key={name} type="button" aria-label={`Capa ${name}`} onClick={() => { onPick(`cor:${name}`); close(); }} className="h-10 rounded-lg border border-neutral-200" style={{ background: bg }} />
            ))}
          </div>
          <input
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && /^https?:\/\//i.test(coverUrl.trim())) { onPick(coverUrl.trim()); setCoverUrl(""); close(); }
            }}
            placeholder="Ou cole o link de uma imagem e Enter"
            className="mt-2 h-8 w-full rounded-lg border border-neutral-200 px-2 text-xs outline-none focus:border-neutral-400"
          />
        </div>
      )}
    </Menu>
  );
}

/** Tags da página: chips com ×, Enter ou vírgula adicionam, Backspace no vazio tira a última. */
function TagField({ tags, known, onChange }: { tags: string[]; known: string[]; onChange: (t: string[]) => void }) {
  const [draft, setDraft] = useState("");
  // Grafia já em uso ganha: digitar "referencia" reaproveita "Referência".
  const spelling = buildTagSpellingMap(known);
  const listId = "notas-tags-datalist";
  const add = (raw: string) => {
    const t = raw.trim().replace(/^#/, "");
    setDraft("");
    if (!t || tags.some((x) => tagKey(x) === tagKey(t))) return;
    onChange([...tags, spelling.get(tagKey(t)) ?? t].slice(0, 20));
  };
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5">
      {tags.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-full bg-neutral-100 py-0.5 pl-2.5 pr-1 text-xs text-neutral-700">
          {t}
          <button type="button" aria-label={`Tirar a tag ${t}`} onClick={() => onChange(tags.filter((x) => x !== t))} className="grid size-4 place-items-center rounded-full hover:bg-neutral-200">
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        list={listId}
        onChange={(e) => {
          const v = e.target.value;
          if (v.endsWith(",")) add(v.slice(0, -1)); else setDraft(v);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); add(draft); }
          else if (e.key === "Backspace" && !draft && tags.length) onChange(tags.slice(0, -1));
        }}
        onBlur={() => add(draft)}
        placeholder={tags.length ? "+ tag" : "Adicionar tags"}
        aria-label="Adicionar tag"
        className="h-6 w-28 bg-transparent text-xs outline-none placeholder:text-neutral-400"
      />
      <datalist id={listId}>
        {[...spelling.values()].filter((t) => !tags.some((x) => tagKey(x) === tagKey(t))).map((t) => <option key={t} value={t} />)}
      </datalist>
    </div>
  );
}
