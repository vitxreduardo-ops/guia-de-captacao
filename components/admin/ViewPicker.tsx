"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { NavLink } from "@/components/admin/NavLink";

import type { AgendaView } from "@/lib/agendaRange";

export type { AgendaView };

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
  const prefersReducedMotion = useReducedMotion();

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
        className="flex items-center gap-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 transition-transform hover:bg-neutral-50 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        {VIEW_LABELS[current]}
        <span aria-hidden className="text-xs text-neutral-400">
          ▾
        </span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            // Cresce a partir do próprio botão, não do nada.
            style={{ transformOrigin: "top left" }}
            initial={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.95, y: -4 }
            }
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.95, y: -4 }
            }
            transition={{ type: "spring", bounce: 0, duration: 0.18 }}
            className="absolute left-0 top-10 z-40 w-40 overflow-hidden rounded-lg border border-neutral-200 bg-white/90 py-1 shadow-lg backdrop-blur-md"
          >
          {(Object.keys(VIEW_LABELS) as AgendaView[]).map((view) => (
            <NavLink
              key={view}
              href={hrefs[view]}
              onClick={() => setOpen(false)}
              className={`block px-3 py-1.5 text-sm transition-transform hover:bg-neutral-50 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none ${
                view === current
                  ? "font-medium text-neutral-900"
                  : "text-neutral-600"
              }`}
            >
              {VIEW_LABELS[view]}
            </NavLink>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
