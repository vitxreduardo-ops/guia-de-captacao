"use client";

import Link from "next/link";
import { useSyncExternalStore, useTransition } from "react";
import { FileText, LayoutGrid, Library, Network, Plus, Star } from "lucide-react";
import { createPageAction } from "@/app/admin/notas/actions";
import type { PageMeta } from "@/lib/notionTree";
import { relativeTime, TopBar } from "./ui";

const TOOLS = [
  { href: "/admin/biblioteca", section: "biblioteca", label: "Biblioteca", hint: "Links guardados, com tags", icon: Library },
  { href: "/admin/referencias", section: "referencias", label: "Referências", hint: "Mural de inspirações", icon: LayoutGrid },
  { href: "/admin/mapas", section: "mapas", label: "Mapa mental", hint: "Ideias em árvore", icon: Network },
];

// Saudação pelo relógio do navegador (o servidor pode estar em outro fuso).
const greeting = () => {
  const h = new Date().getHours();
  return h < 5 ? "Boa madrugada" : h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
};
const noopSubscribe = () => () => {};

export function NotionHome({
  recent,
  favorites,
  allowedSections,
}: {
  recent: PageMeta[];
  favorites: PageMeta[];
  allowedSections: string[] | null;
}) {
  const hello = useSyncExternalStore(noopSubscribe, greeting, () => "Olá");
  const [pending, start] = useTransition();
  const tools = TOOLS.filter((t) => allowedSections === null || allowedSections.includes(t.section));

  return (
    <>
      <TopBar crumbs={[{ label: "Início" }]} />
      <div className="mx-auto w-full max-w-4xl px-6 pb-24 pt-8 sm:px-12 sm:pt-12">
        <h1 className="text-[34px] font-bold leading-tight tracking-tight">{hello}</h1>
        <p className="mt-1 text-neutral-500">Onde você quer anotar hoje?</p>

        {recent.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-neutral-300 p-10 text-center">
            <p className="text-neutral-500">Nenhuma nota ainda. Comece pela primeira página.</p>
            <button
              type="button"
              disabled={pending}
              onClick={() => start(() => createPageAction(null))}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-60"
            >
              <Plus className="size-4" /> Criar a primeira página
            </button>
          </div>
        ) : (
          <>
            <h2 className="mt-10 text-xs font-semibold uppercase tracking-wide text-neutral-400">Visitadas recentemente</h2>
            <div className="-mx-6 mt-3 flex gap-3 overflow-x-auto px-6 pb-2 sm:-mx-12 sm:px-12">
              {recent.map((p) => (
                <Link
                  key={p.id}
                  href={`/admin/notas/${p.id}`}
                  className="flex h-36 w-44 shrink-0 flex-col justify-between rounded-xl border border-neutral-200 p-4 transition hover:border-neutral-300 hover:shadow-sm"
                >
                  <span className="text-2xl">{p.icon || <FileText className="size-6 text-neutral-300" />}</span>
                  <span>
                    <span className="line-clamp-2 block text-sm font-medium leading-snug">{p.title || "Sem título"}</span>
                    <span className="mt-1 block text-xs text-neutral-400">{relativeTime(p.updated_at)}</span>
                  </span>
                </Link>
              ))}
            </div>
          </>
        )}

        {tools.length > 0 && (
          <>
            <h2 className="mt-10 text-xs font-semibold uppercase tracking-wide text-neutral-400">Ferramentas</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {tools.map(({ href, label, hint, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="group flex items-center gap-3 rounded-xl border border-neutral-200 p-4 transition hover:border-neutral-300 hover:shadow-sm"
                >
                  <span className="grid size-10 place-items-center rounded-lg bg-neutral-100 text-neutral-600 group-hover:bg-neutral-200">
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{label}</span>
                    <span className="block truncate text-xs text-neutral-500">{hint}</span>
                  </span>
                </Link>
              ))}
            </div>
          </>
        )}

        {favorites.length > 0 && (
          <>
            <h2 className="mt-10 text-xs font-semibold uppercase tracking-wide text-neutral-400">Favoritos</h2>
            <ul className="mt-2">
              {favorites.map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/notas/${p.id}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-neutral-100">
                    {p.icon ? <span>{p.icon}</span> : <Star className="size-4 fill-amber-400 text-amber-400" />}
                    <span className="truncate">{p.title || "Sem título"}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  );
}
