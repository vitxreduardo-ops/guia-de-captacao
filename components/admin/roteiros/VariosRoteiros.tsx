"use client";

import {
  ANGULOS_6CHAPEUS,
  MAX_ROTEIROS_POR_PEDIDO,
  type Angulo6Chapeus,
  type PedidoVarios,
} from "@/lib/roteiroTypes";

/**
 * Vários roteiros de uma vez, de qualquer framework: quantos roteiros de cada
 * ângulo dos 6 Chapéus. Tudo em zero = um roteiro só.
 */
export default function VariosRoteiros({
  varios,
  setVarios,
}: {
  varios: PedidoVarios;
  setVarios: (v: PedidoVarios) => void;
}) {
  const total = Object.values(varios).reduce((s, n) => s + (n ?? 0), 0);
  const mudar = (a: Angulo6Chapeus, delta: number) => {
    const n = Math.max(0, (varios[a] ?? 0) + delta);
    const novo = { ...varios };
    if (n === 0) delete novo[a];
    else novo[a] = n;
    setVarios(novo);
  };

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="text-lg font-bold tracking-tight text-neutral-900">03 · Vários roteiros de uma vez</h2>
        <span className="font-mono text-xs text-neutral-500">opcional</span>
      </div>
      <p className="mb-4 text-xs text-neutral-500">
        Quantos roteiros completos de cada ângulo, todos no mesmo pedido: cada um segue o framework escolhido,
        conduzido pelo ângulo, e é salvo à parte no histórico. Máximo de {MAX_ROTEIROS_POR_PEDIDO} por pedido.
        Tudo em zero: sai um roteiro só.
      </p>
      <div className="space-y-2">
        {ANGULOS_6CHAPEUS.map((a) => {
          const n = varios[a] ?? 0;
          return (
            <div key={a} className="flex items-center gap-3">
              <span className="w-24 text-sm text-neutral-700">{a}</span>
              <button
                type="button"
                aria-label={`Menos um roteiro ${a}`}
                disabled={n === 0}
                onClick={() => mudar(a, -1)}
                className="size-8 rounded-md border border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-neutral-400 disabled:opacity-40"
              >
                −
              </button>
              <span
                aria-live="polite"
                className={`w-6 text-center text-sm ${n ? "font-medium text-neutral-900" : "text-neutral-400"}`}
              >
                {n}
              </span>
              <button
                type="button"
                aria-label={`Mais um roteiro ${a}`}
                disabled={total >= MAX_ROTEIROS_POR_PEDIDO}
                onClick={() => mudar(a, 1)}
                className="size-8 rounded-md border border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-neutral-400 disabled:opacity-40"
              >
                +
              </button>
            </div>
          );
        })}
      </div>
      {total > 0 && (
        <p className="mt-2 text-xs text-neutral-500">
          {total} de {MAX_ROTEIROS_POR_PEDIDO} roteiros neste pedido.
        </p>
      )}
    </div>
  );
}
