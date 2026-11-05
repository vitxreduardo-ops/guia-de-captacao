"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  ArrowLeft, ChevronRight, FileText, Home, LayoutGrid, Library, MoreHorizontal, Network, Plus,
  Search, Star, Trash2, Undo2, X,
} from "lucide-react";
import {
  archivePageAction, createPageAction, deletePageAction, movePageAction, restorePageAction,
  setFavoriteAction,
} from "@/app/admin/notas/actions";
import { buildTree, filterByTags, tagCounts, type PageMeta, type TreeNode } from "@/lib/notionTree";
import { buildTagSpellingMap } from "@/lib/tags";
import { Menu, menuItem } from "./ui";

const label = (p: PageMeta) => p.title || "Sem título";

// Ferramentas filhas. O código da seção é o mesmo do menu do admin.
const TOOLS = [
  { href: "/admin/biblioteca", section: "biblioteca", label: "Biblioteca", icon: Library },
  { href: "/admin/referencias", section: "referencias", label: "Referências", icon: LayoutGrid },
  { href: "/admin/mapas", section: "mapas", label: "Mapa mental", icon: Network },
];

const row = "flex h-7 items-center gap-2 rounded-md px-2 text-[13px] text-neutral-600 hover:bg-neutral-200/60";

export function PageTree({
  pages,
  allowedSections,
  onNavigate,
  onSearch,
}: {
  pages: PageMeta[];
  allowedSections: string[] | null;
  onNavigate: () => void;
  onSearch: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const activeId = pathname.split("/")[3] ?? null;
  const [, start] = useTransition();
  const live = useMemo(() => pages.filter((p) => !p.archived_at), [pages]);
  const trash = useMemo(() => pages.filter((p) => p.archived_at), [pages]);
  const tree = useMemo(() => buildTree(live), [live]);
  const favorites = live.filter((p) => p.favorite);
  // Filtro por tag: com alguma escolhida, "Páginas" vira a lista plana das que têm todas elas.
  const [picked, setPicked] = useState<string[]>([]);
  const tagList = useMemo(() => tagCounts(live, buildTagSpellingMap(live.flatMap((p) => p.tags))), [live]);
  const filtered = picked.length ? filterByTags(live, picked) : null;
  const tools = TOOLS.filter((t) => allowedSections === null || allowedSections.includes(t.section));

  // Ancestrais da página aberta ficam abertos; o resto o usuário abre e fecha.
  const [open, setOpen] = useState<Set<string>>(new Set());
  const ancestors = useMemo(() => {
    const byId = new Map(live.map((p) => [p.id, p]));
    const chain = new Set<string>();
    for (let p = activeId ? byId.get(activeId) : undefined; p?.parent_id; p = byId.get(p.parent_id)) chain.add(p.parent_id);
    return chain;
  }, [activeId, live]);
  const toggle = (id: string) => setOpen((s) => { const c = new Set(s); if (c.has(id)) c.delete(id); else c.add(id); return c; });

  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | "root" | null>(null);
  const drop = (target: string | null) => {
    const id = dragId;
    setDragId(null);
    setOver(null);
    if (!id || id === target) return;
    start(async () => {
      const ok = await movePageAction(id, target);
      if (!ok) alert("Não dá pra mover uma página para dentro dela mesma.");
      else if (target) setOpen((s) => new Set(s).add(target));
    });
  };

  const newPage = (parent: string | null) => {
    if (parent) setOpen((s) => new Set(s).add(parent));
    onNavigate();
    start(() => createPageAction(parent));
  };

  const renderNode = (n: TreeNode, depth: number) => {
    const isOpen = open.has(n.id) || ancestors.has(n.id);
    const isActive = n.id === activeId;
    return (
      <li key={n.id}>
        <div
          draggable
          onDragStart={() => setDragId(n.id)}
          onDragEnd={() => { setDragId(null); setOver(null); }}
          onDragOver={(e) => { e.preventDefault(); setOver(n.id); }}
          onDrop={(e) => { e.preventDefault(); e.stopPropagation(); drop(n.id); }}
          style={{ paddingLeft: depth * 12 + 2 }}
          className={`group flex h-7 items-center rounded-md pr-1 text-[13px] ${
            isActive ? "bg-neutral-200/80 font-medium text-neutral-900" : "text-neutral-600 hover:bg-neutral-200/60"
          } ${over === n.id ? "ring-2 ring-neutral-400" : ""}`}
        >
          <button
            type="button"
            aria-label={isOpen ? "Fechar" : "Abrir"}
            onClick={() => toggle(n.id)}
            className="grid size-5 shrink-0 place-items-center rounded text-neutral-400 hover:bg-neutral-300/60"
          >
            <ChevronRight className={`size-3.5 transition-transform ${isOpen ? "rotate-90" : ""} ${n.children.length ? "" : "opacity-30"}`} />
          </button>
          <Link href={`/admin/notas/${n.id}`} onClick={onNavigate} className="flex min-w-0 flex-1 items-center gap-1.5 py-1">
            <span className="w-4 shrink-0 text-center text-sm">
              {n.icon || <FileText className="mx-auto size-3.5 text-neutral-400" />}
            </span>
            <span className="truncate">{label(n)}</span>
          </Link>
          <span className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            <Menu
              label="Mais ações"
              triggerClassName="grid size-5 place-items-center rounded text-neutral-500 hover:bg-neutral-300/60"
              trigger={<MoreHorizontal className="size-3.5" />}
              align="left"
            >
              {(close) => (
                <>
                  <button type="button" className={menuItem} onClick={() => { close(); start(() => setFavoriteAction(n.id, !n.favorite)); }}>
                    <Star className="size-4" /> {n.favorite ? "Tirar dos favoritos" : "Favoritar"}
                  </button>
                  <button type="button" className={menuItem} onClick={() => { close(); newPage(n.id); }}>
                    <Plus className="size-4" /> Nova subpágina
                  </button>
                  <button
                    type="button"
                    className={`${menuItem} text-red-600`}
                    onClick={() => {
                      close();
                      if (!confirm(`Mover “${label(n)}” e suas subpáginas para a lixeira?`)) return;
                      start(async () => {
                        await archivePageAction(n.id, false);
                        if (isActive || ancestors.has(n.id)) router.push("/admin/notas");
                      });
                    }}
                  >
                    <Trash2 className="size-4" /> Mover para a lixeira
                  </button>
                </>
              )}
            </Menu>
            <button
              type="button"
              aria-label="Nova subpágina"
              onClick={() => newPage(n.id)}
              className="grid size-5 place-items-center rounded text-neutral-500 hover:bg-neutral-300/60"
            >
              <Plus className="size-3.5" />
            </button>
          </span>
        </div>
        {isOpen && n.children.length > 0 && <ul>{n.children.map((c) => renderNode(c, depth + 1))}</ul>}
      </li>
    );
  };

  return (
    <nav aria-label="Notas" className="flex h-full w-64 shrink-0 flex-col bg-neutral-50 text-neutral-700">
      <div className="flex items-center gap-2 px-3 pb-1 pt-3">
        <Link href="/admin" aria-label="Voltar ao painel" title="Voltar ao painel" className="grid size-7 place-items-center rounded-md text-neutral-500 hover:bg-neutral-200/60">
          <ArrowLeft className="size-4" />
        </Link>
        <span className="text-sm font-semibold text-neutral-900">Notas</span>
      </div>

      <div className="px-2 pt-1">
        <button type="button" onClick={onSearch} className={`${row} w-full`}>
          <Search className="size-4" /> <span className="flex-1 text-left">Buscar</span>
          <kbd className="rounded border border-neutral-300 px-1 text-[10px] text-neutral-400">⌘K</kbd>
        </button>
        <Link href="/admin/notas" onClick={onNavigate} className={`${row} ${pathname === "/admin/notas" ? "bg-neutral-200/80 font-medium text-neutral-900" : ""}`}>
          <Home className="size-4" /> Início
        </Link>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {tools.length > 0 && (
          <>
            <h3 className="px-2 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Ferramentas</h3>
            {tools.map(({ href, label: l, icon: Icon }) => (
              <Link key={href} href={href} className={row}>
                <Icon className="size-4" /> {l}
              </Link>
            ))}
          </>
        )}

        {favorites.length > 0 && (
          <>
            <h3 className="px-2 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Favoritos</h3>
            {favorites.map((p) => (
              <Link key={p.id} href={`/admin/notas/${p.id}`} onClick={onNavigate} className={row}>
                <span className="w-4 text-center text-sm">{p.icon || <Star className="mx-auto size-3.5 fill-amber-400 text-amber-400" />}</span>
                <span className="truncate">{label(p)}</span>
              </Link>
            ))}
          </>
        )}

        {tagList.length > 0 && (
          <>
            <h3 className="px-2 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Tags</h3>
            <div className="flex flex-wrap gap-1 px-1.5">
              {tagList.slice(0, 12).map((t) => {
                const on = picked.includes(t.key);
                return (
                  <button
                    key={t.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setPicked((s) => (on ? s.filter((k) => k !== t.key) : [...s, t.key]))}
                    className={`rounded-full px-2 py-0.5 text-xs transition ${on ? "bg-neutral-800 text-white" : "bg-neutral-200/70 text-neutral-600 hover:bg-neutral-300/70"}`}
                  >
                    {t.tag} <span className={on ? "text-neutral-300" : "text-neutral-400"}>{t.count}</span>
                  </button>
                );
              })}
              {picked.length > 0 && (
                <button type="button" onClick={() => setPicked([])} className="rounded-full px-2 py-0.5 text-xs text-neutral-500 underline">
                  Limpar
                </button>
              )}
            </div>
          </>
        )}

        <div
          className={`group/h mt-4 flex items-center rounded-md px-2 pb-1 ${over === "root" ? "ring-2 ring-neutral-400" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setOver("root"); }}
          onDrop={(e) => { e.preventDefault(); drop(null); }}
        >
          <h3 className="flex-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
            Páginas{dragId && <span className="ml-1 font-normal normal-case">· solte aqui pra levar à raiz</span>}
          </h3>
          <button type="button" aria-label="Nova página" onClick={() => newPage(null)} className="grid size-5 place-items-center rounded text-neutral-500 opacity-0 hover:bg-neutral-200 group-hover/h:opacity-100 focus-visible:opacity-100">
            <Plus className="size-3.5" />
          </button>
        </div>
        {filtered ? (
          <ul>
            {filtered.length === 0 && <li className="px-2 py-1 text-xs text-neutral-400">Nenhuma página com essas tags.</li>}
            {filtered.map((p) => (
              <li key={p.id}>
                <Link href={`/admin/notas/${p.id}`} onClick={onNavigate} className={`${row} ${p.id === activeId ? "bg-neutral-200/80 font-medium text-neutral-900" : ""}`}>
                  <span className="w-4 text-center text-sm">{p.icon || <FileText className="mx-auto size-3.5 text-neutral-400" />}</span>
                  <span className="truncate">{label(p)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : tree.length === 0 ? (
          <p className="px-2 py-1 text-xs text-neutral-400">Nenhuma página ainda.</p>
        ) : (
          <ul>{tree.map((n) => renderNode(n, 0))}</ul>
        )}
      </div>

      <div className="flex items-center gap-1 border-t border-neutral-200 p-2">
        <button type="button" onClick={() => newPage(null)} className={`${row} flex-1 font-medium text-neutral-800`}>
          <Plus className="size-4" /> Nova página
        </button>
        <div className="relative">
          <Menu
            label="Lixeira"
            align="left"
            triggerClassName="relative grid size-7 place-items-center rounded-md text-neutral-500 hover:bg-neutral-200/60"
            trigger={
              <>
                <Trash2 className="size-4" />
                {trash.length > 0 && <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-neutral-400" />}
              </>
            }
          >
            {() => (
              <div className="max-h-72 w-64 overflow-y-auto">
                <p className="px-2.5 py-1.5 text-xs font-medium text-neutral-400">Lixeira</p>
                {trash.length === 0 && <p className="px-2.5 pb-2 text-xs text-neutral-400">Vazia.</p>}
                {trash.map((p) => (
                  <div key={p.id} className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-[13px] hover:bg-neutral-100">
                    <span className="min-w-0 flex-1 truncate text-neutral-600">{p.icon} {label(p)}</span>
                    <button type="button" aria-label="Restaurar" title="Restaurar" onClick={() => start(() => restorePageAction(p.id))} className="rounded p-1 hover:bg-neutral-200">
                      <Undo2 className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Apagar de vez"
                      title="Apagar de vez"
                      onClick={() => confirm(`Apagar “${label(p)}” e suas subpáginas de vez?`) && start(() => deletePageAction(p.id))}
                      className="rounded p-1 text-red-600 hover:bg-red-50"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Menu>
        </div>
      </div>
    </nav>
  );
}
