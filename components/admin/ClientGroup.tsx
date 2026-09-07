"use client";

import { useSyncExternalStore, type ReactNode } from "react";

const STORAGE_KEY = "entregas:grupos-recolhidos";

/**
 * Quais grupos de cliente estão recolhidos, guardado fora do React.
 *
 * O servidor sempre renderiza tudo aberto; ler o localStorage por
 * `useSyncExternalStore` faz a hidratação bater com o HTML e só então aplica a
 * escolha guardada — o mesmo caminho da lateral da agenda.
 */
let collapsed: Set<string> | null = null;
const listeners = new Set<() => void>();

function read(): Set<string> {
  if (collapsed === null) {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      collapsed = new Set<string>(saved ? (JSON.parse(saved) as string[]) : []);
    } catch {
      // Armazenamento bloqueado ou conteúdo estragado: começa tudo aberto.
      collapsed = new Set<string>();
    }
  }
  return collapsed;
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function toggle(key: string) {
  const current = new Set(read());
  if (current.has(key)) current.delete(key);
  else current.add(key);
  collapsed = current;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...current]));
  } catch {
    // Sem memória entre visitas, mas o clique continua valendo agora.
  }
  for (const listener of listeners) listener();
}

/** Chave estável: o mesmo cliente pode aparecer em mais de uma coluna. */
function keyOf(columnId: string, clientName: string) {
  return `${columnId}:${clientName}`;
}

export function ClientGroup({
  columnId,
  clientName,
  count,
  total,
  children,
}: {
  columnId: string;
  clientName: string;
  count: number;
  /** Já formatado: o grupo não sabe de dinheiro, só mostra o que recebe. */
  total: string;
  children: ReactNode;
}) {
  const key = keyOf(columnId, clientName);
  const isCollapsed = useSyncExternalStore(
    subscribe,
    () => read().has(key),
    () => false
  );

  return (
    <div className="mb-2 last:mb-0">
      <button
        type="button"
        onClick={() => toggle(key)}
        aria-expanded={!isCollapsed}
        className="mb-1 flex w-full items-baseline justify-between gap-2 rounded px-0.5 py-0.5 text-left hover:bg-neutral-200/60 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none pointer-coarse:min-h-11"
      >
        <span className="flex min-w-0 items-baseline gap-1">
          <span
            aria-hidden
            className={`text-[10px] text-neutral-400 transition-transform ${
              isCollapsed ? "" : "rotate-90"
            }`}
          >
            ▶
          </span>
          <span className="truncate text-xs font-semibold text-neutral-700">
            {clientName}
          </span>
        </span>
        <span className="shrink-0 text-[11px] text-neutral-500 tabular-nums">
          {count} · {total}
        </span>
      </button>

      {isCollapsed ? null : children}
    </div>
  );
}
