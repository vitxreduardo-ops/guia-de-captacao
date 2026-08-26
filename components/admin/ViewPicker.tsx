"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export type AgendaView = "dia" | "4dias" | "semana" | "mes";

export const VIEW_LABELS: Record<AgendaView, string> = {
  dia: "Dia",
  "4dias": "4 dias",
  semana: "Semana",
  mes: "Mês",
};

/**
 * Troca de visualização, ao lado do "Hoje" — o mesmo lugar onde o Google
 * põe a dele.
 *
 * Cada opção é um link de verdade: a grade é montada no servidor, e assim a
 * visão escolhida entra no endereço e sobrevive a recarregar a página ou
 * mandar o link pra alguém.
 */
export function ViewPicker({
  current,
  hrefs,
}: {
  current: AgendaView;
  /** Endereço de cada visão, já resolvido no servidor com a data em foco. */
  hrefs: Record<AgendaView, string>;
}) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // "click" e não "pointerdown": o pointerdown chega antes de o React
    // processar o clique que abre, e o menu se fecharia no mesmo gesto.
    function handleClick(clickEvent: MouseEvent) {
      if (!boxRef.current?.contains(clickEvent.target as Node)) setOpen(false);
    }
    function handleKeyDown(keyEvent: KeyboardEvent) {
      if (keyEvent.key === "Escape") setOpen(false);
    }
    window.addEventListener("click", handleClick);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("click", handleClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex items-center gap-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
      >
        {VIEW_LABELS[current]}
        <span aria-hidden className="text-xs text-neutral-400">
          ▾
        </span>
      </button>

      {open ? (
        <div className="absolute left-0 top-10 z-40 w-40 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg">
          {(Object.keys(VIEW_LABELS) as AgendaView[]).map((view) => (
            <Link
              key={view}
              href={hrefs[view]}
              onClick={() => setOpen(false)}
              className={`block px-3 py-1.5 text-sm hover:bg-neutral-50 ${
                view === current
                  ? "font-medium text-neutral-900"
                  : "text-neutral-600"
              }`}
            >
              {VIEW_LABELS[view]}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
