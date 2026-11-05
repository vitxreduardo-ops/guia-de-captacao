"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { PageMeta } from "@/lib/notionTree";
import { PageTree } from "./PageTree";
import { SearchModal } from "./SearchModal";
import { NotasUI } from "./ui";

/**
 * Tela cheia por cima da moldura do admin: no Notion o texto é o centro e a
 * interface some. Uma barra lateral só, a das notas, com "← Painel" pra voltar.
 */
export function NotasShell({
  pages,
  allowedSections,
  children,
}: {
  pages: PageMeta[];
  allowedSections: string[] | null;
  children: ReactNode;
}) {
  const [drawer, setDrawer] = useState(false);
  const [search, setSearch] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSearch((v) => !v); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const ui = useMemo(() => ({ openSidebar: () => setDrawer(true), openSearch: () => setSearch(true) }), []);

  return (
    <NotasUI.Provider value={ui}>
      <div className="notas-root fixed inset-0 z-[60] flex bg-white text-neutral-900">
        {/* Desktop: fixa. Celular: gaveta por cima, fecha ao tocar fora. */}
        <div className="hidden lg:block">
          <PageTree pages={pages} allowedSections={allowedSections} onNavigate={() => {}} onSearch={() => setSearch(true)} />
        </div>
        {drawer && (
          <div className="fixed inset-0 z-[65] flex lg:hidden">
            <div className="shadow-2xl">
              <PageTree
                pages={pages}
                allowedSections={allowedSections}
                onNavigate={() => setDrawer(false)}
                onSearch={() => { setDrawer(false); setSearch(true); }}
              />
            </div>
            <button type="button" aria-label="Fechar barra lateral" className="flex-1 bg-black/30" onClick={() => setDrawer(false)} />
          </div>
        )}
        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
        {search && <SearchModal pages={pages} onClose={() => setSearch(false)} />}
      </div>
    </NotasUI.Provider>
  );
}
