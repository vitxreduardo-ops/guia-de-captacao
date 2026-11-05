"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronRight, PanelLeft } from "lucide-react";

/** O que a moldura (barra lateral, busca) oferece às telas filhas. */
export const NotasUI = createContext<{ openSidebar: () => void; openSearch: () => void }>({
  openSidebar: () => {},
  openSearch: () => {},
});
export const useNotasUI = () => useContext(NotasUI);

/** Menu suspenso simples: abre no clique, fecha ao clicar fora ou com Esc. */
export function Menu({
  trigger,
  label,
  children,
  align = "right",
  triggerClassName = "",
}: {
  trigger: ReactNode;
  label: string;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={triggerClassName}
      >
        {trigger}
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute z-50 mt-1 min-w-48 rounded-xl border border-neutral-200 bg-white p-1 text-sm shadow-xl ${align === "right" ? "right-0" : "left-0"}`}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export const menuItem =
  "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-neutral-700 hover:bg-neutral-100";

/** Faixa fixa do topo: caminho da página à esquerda, ações à direita. */
export function TopBar({
  crumbs,
  right,
}: {
  crumbs: { label: string; href?: string; icon?: string }[];
  right?: ReactNode;
}) {
  const { openSidebar } = useNotasUI();
  return (
    <header className="sticky top-0 z-30 flex h-12 items-center gap-2 bg-white/90 px-3 backdrop-blur sm:px-4">
      <button
        type="button"
        aria-label="Abrir barra lateral"
        onClick={openSidebar}
        className="grid size-8 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100 lg:hidden"
      >
        <PanelLeft className="size-4" />
      </button>
      <nav aria-label="Caminho" className="flex min-w-0 flex-1 items-center gap-1 text-sm text-neutral-500">
        {crumbs.map((c, i) => (
          <span key={i} className="flex min-w-0 items-center gap-1">
            {i > 0 && <ChevronRight className="size-3.5 shrink-0 text-neutral-300" />}
            {c.href ? (
              <Link href={c.href} className="truncate rounded px-1 py-0.5 hover:bg-neutral-100 hover:text-neutral-900">
                {c.icon} {c.label}
              </Link>
            ) : (
              <span className="truncate px-1 text-neutral-800">{c.icon} {c.label}</span>
            )}
          </span>
        ))}
      </nav>
      <div className="flex shrink-0 items-center gap-1 text-xs text-neutral-400">{right}</div>
    </header>
  );
}

/** "há 5 min", "ontem"… sem biblioteca. */
export function relativeTime(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 45) return "agora";
  const m = Math.round(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "ontem" : `há ${d} dias`;
}
