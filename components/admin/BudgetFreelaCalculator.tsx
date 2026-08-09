"use client";

import { useState } from "react";
import { addFreelaAsPackageAction } from "@/app/admin/orcamentos/[id]/actions";
import { computeFreela } from "@/lib/budgetCalc";

function money(n: number) {
  return "R$ " + (Number(n) || 0).toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
  });
}

export function BudgetFreelaCalculator({ budgetId }: { budgetId: string }) {
  const [daily, setDaily] = useState(1000);
  const [days, setDays] = useState(1);
  const [strategy, setStrategy] = useState(0);
  const [traffic, setTraffic] = useState(0);
  const [marginPct, setMarginPct] = useState(15);
  const [taxPct, setTaxPct] = useState(6);

  const suggested = computeFreela({
    daily,
    days,
    strategy,
    traffic,
    marginPct,
    taxPct,
  });

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="mb-1 text-sm font-semibold text-neutral-900">
        Calculadora — job avulso / freela
      </h2>
      <p className="mb-3 text-xs text-neutral-500">
        Pra quando o trabalho não encaixa em nenhum pacote fixo.
      </p>

      <form action={addFreelaAsPackageAction} className="space-y-3">
        <input type="hidden" name="budget_id" value={budgetId} />

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">
            Nome do job
          </label>
          <input
            name="label"
            placeholder="Ex: Vídeo institucional avulso"
            className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">
              Diária (R$)
            </label>
            <input
              type="number"
              name="daily"
              value={daily}
              onChange={(e) => setDaily(Number(e.target.value) || 0)}
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">
              Qtd. de diárias
            </label>
            <input
              type="number"
              name="days"
              value={days}
              onChange={(e) => setDays(Number(e.target.value) || 0)}
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">
              Taxa de estratégia (R$)
            </label>
            <input
              type="number"
              name="strategy"
              value={strategy}
              onChange={(e) => setStrategy(Number(e.target.value) || 0)}
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">
              Custo de tráfego/terceiros (R$)
            </label>
            <input
              type="number"
              name="traffic"
              value={traffic}
              onChange={(e) => setTraffic(Number(e.target.value) || 0)}
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">
              Margem (%)
            </label>
            <input
              type="number"
              name="marginPct"
              value={marginPct}
              onChange={(e) => setMarginPct(Number(e.target.value) || 0)}
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">
              Imposto (%)
            </label>
            <input
              type="number"
              name="taxPct"
              value={taxPct}
              onChange={(e) => setTaxPct(Number(e.target.value) || 0)}
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-md border border-dashed border-neutral-300 p-3">
          <span className="text-xs text-neutral-500">Preço sugerido</span>
          <strong className="text-lg font-semibold text-neutral-900">
            {money(suggested)}
          </strong>
        </div>

        <button
          type="submit"
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
        >
          + Adicionar esse job como pacote
        </button>
      </form>
    </section>
  );
}
