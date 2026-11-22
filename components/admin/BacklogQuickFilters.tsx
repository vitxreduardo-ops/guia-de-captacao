"use client";

import {
  BACKLOG_QUICKS,
  BACKLOG_QUICK_LABELS,
  type BacklogQuick,
} from "@/lib/backlogTypes";

/**
 * Os atalhos da barra de Entregas, à esquerda do "Filtro". Cada botão liga e
 * desliga uma pergunta pronta e mostra quantos cards ela pega agora — zero
 * também é resposta, então o número não some.
 */
export function BacklogQuickFilters({
  active,
  counts,
  onToggle,
}: {
  active: BacklogQuick[];
  counts: Record<BacklogQuick, number>;
  onToggle: (quick: BacklogQuick) => void;
}) {
  return (
    <div role="group" aria-label="Atalhos de filtro" className="flex items-center gap-2">
      {BACKLOG_QUICKS.map((quick) => {
        const on = active.includes(quick);
        return (
          <button
            key={quick}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(quick)}
            className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm whitespace-nowrap transition-[background-color,color,transform] duration-200 ease-out active:scale-[0.97] active:duration-75 pointer-coarse:min-h-11 ${
              on
                ? "border-(--tatu-ink) bg-(--tatu-ink) text-white"
                : "border-neutral-300 text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            {BACKLOG_QUICK_LABELS[quick]}
            <span
              className={`text-xs tabular-nums ${on ? "text-white/70" : "text-neutral-400"}`}
            >
              {counts[quick]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
