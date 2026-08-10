"use client";

import { useState } from "react";
import {
  generatePackagesFromCalcAction,
  updateBudgetCalcAction,
} from "@/app/admin/orcamentos/[id]/actions";
import { computeRecorrente, type MeuNivel, type NivelCliente } from "@/lib/budgetCalc";
import type { Budget } from "@/lib/budgets";

const MEU_NIVEL_OPTIONS: { value: MeuNivel; label: string }[] = [
  { value: "iniciante", label: "Iniciante" },
  { value: "intermediario", label: "Intermediário" },
  { value: "pro", label: "Pro" },
];

const NIVEL_CLIENTE_OPTIONS: { value: NivelCliente; label: string }[] = [
  { value: "pequena", label: "Empresa pequena" },
  { value: "medio", label: "Médio porte" },
  { value: "grande", label: "Grande porte" },
];

function money(n: number) {
  return "R$ " + (Number(n) || 0).toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
  });
}

export function BudgetRecurringCalculator({
  budget,
  hasPackages,
}: {
  budget: Budget;
  hasPackages: boolean;
}) {
  const [meuNivel, setMeuNivel] = useState<MeuNivel>(budget.calc_meu_nivel);
  const [nivelCliente, setNivelCliente] = useState<NivelCliente>(
    budget.calc_nivel_cliente
  );
  const [estrategia, setEstrategia] = useState(budget.calc_estrategia);
  const [videos, setVideos] = useState(budget.calc_videos);
  const [resultado, setResultado] = useState(budget.calc_resultado);
  const [extras, setExtras] = useState(budget.calc_extras);
  const [margemPct, setMargemPct] = useState(budget.calc_margem_pct);
  const [taxPct, setTaxPct] = useState(budget.calc_tax_pct);

  const result = computeRecorrente({
    meuNivel,
    nivelCliente,
    estrategia,
    videos,
    resultado,
    extras,
    margemPct,
    taxPct,
  });

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="mb-1 text-sm font-semibold text-neutral-900">
        Calculadora recorrente (por níveis)
      </h2>
      <p className="mb-3 text-xs text-neutral-500">
        Reconstrução aproximada da lógica de multiplicador por nível — ajuste
        os percentuais se não bater com o seu método.
      </p>

      <form action={updateBudgetCalcAction} className="space-y-3">
        <input type="hidden" name="id" value={budget.id} />

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">
            Meu nível
          </label>
          <div className="flex gap-1.5">
            {MEU_NIVEL_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex-1 cursor-pointer rounded-md border px-2 py-1.5 text-center text-xs font-medium ${
                  meuNivel === opt.value
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-300 text-neutral-600"
                }`}
              >
                <input
                  type="radio"
                  name="calc_meu_nivel"
                  value={opt.value}
                  checked={meuNivel === opt.value}
                  onChange={() => setMeuNivel(opt.value)}
                  className="sr-only"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">
            Nível do cliente
          </label>
          <div className="flex gap-1.5">
            {NIVEL_CLIENTE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex-1 cursor-pointer rounded-md border px-2 py-1.5 text-center text-xs font-medium ${
                  nivelCliente === opt.value
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-300 text-neutral-600"
                }`}
              >
                <input
                  type="radio"
                  name="calc_nivel_cliente"
                  value={opt.value}
                  checked={nivelCliente === opt.value}
                  onChange={() => setNivelCliente(opt.value)}
                  className="sr-only"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
        <p className="text-xs text-neutral-500">
          Multiplicador aplicado: {result.multiplier.toFixed(2)}×
        </p>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">
              Estratégia (R$)
            </label>
            <input
              type="number"
              name="calc_estrategia"
              value={estrategia}
              onChange={(e) => setEstrategia(Number(e.target.value) || 0)}
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">
              Vídeos (R$)
            </label>
            <input
              type="number"
              name="calc_videos"
              value={videos}
              onChange={(e) => setVideos(Number(e.target.value) || 0)}
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">
              Resultado / performance (R$)
            </label>
            <input
              type="number"
              name="calc_resultado"
              value={resultado}
              onChange={(e) => setResultado(Number(e.target.value) || 0)}
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">
              Custos extras (R$)
            </label>
            <input
              type="number"
              name="calc_extras"
              value={extras}
              onChange={(e) => setExtras(Number(e.target.value) || 0)}
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">
              Margem (%)
            </label>
            <input
              type="number"
              name="calc_margem_pct"
              value={margemPct}
              onChange={(e) => setMargemPct(Number(e.target.value) || 0)}
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">
              Imposto (%)
            </label>
            <input
              type="number"
              name="calc_tax_pct"
              value={taxPct}
              onChange={(e) => setTaxPct(Number(e.target.value) || 0)}
              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-600">
          <div className="flex justify-between py-0.5">
            <span>Base das entregas</span>
            <span>{money(result.base)}</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span>Ajuste por níveis</span>
            <span>{money(result.ajuste)}</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span>Resultado</span>
            <span>{money(resultado)}</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span>Custos extras</span>
            <span>{money(extras)}</span>
          </div>
          <div className="flex justify-between border-t border-neutral-200 py-1 pt-1.5 font-semibold text-neutral-900">
            <span>Subtotal</span>
            <span>{money(result.subtotal)}</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span>Margem ({margemPct}%)</span>
            <span>{money(result.margem)}</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span>Imposto ({taxPct}%)</span>
            <span>{money(result.imposto)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-md border border-dashed border-neutral-300 p-3">
          <span className="text-xs text-neutral-500">
            Preço recomendado (Ideal)
          </span>
          <strong className="text-lg font-semibold text-neutral-900">
            {money(result.recomendado)}
          </strong>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Salvar calculadora
          </button>
          <button
            type="submit"
            formAction={generatePackagesFromCalcAction}
            onClick={(event) => {
              if (
                hasPackages &&
                !window.confirm(
                  "Isso substitui os pacotes fixos que já estão na proposta. Continuar?"
                )
              ) {
                event.preventDefault();
              }
            }}
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800"
          >
            Gerar 3 pacotes (Start / Ideal / Pro)
          </button>
        </div>
        <p className="text-xs text-neutral-500">
          Isso substitui os pacotes fixos atuais. Os itens de cada pacote vêm
          genéricos — edite-os depois de gerar.
        </p>
      </form>
    </section>
  );
}
