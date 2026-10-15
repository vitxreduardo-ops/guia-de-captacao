"use client";

import { useState } from "react";
import { saveBudgetInfoAction } from "@/app/admin/orcamentos/[id]/actions";
import { useAutosave } from "@/components/admin/budget/useAutosave";
import type { BudgetWithSections } from "@/lib/budgets";

type Info = { title: string; client_name: string; client_whatsapp: string };

const campo =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none";
const rotulo = "mb-1 block text-xs font-medium text-neutral-600";

/**
 * O que não é conteúdo da proposta: nome interno, cliente e WhatsApp.
 *
 * Tudo que o cliente lê — capa, sobre, pacotes — mora nas seções e se edita no
 * painel, com o resultado à vista. Repetir esses campos aqui daria dois lugares
 * para a mesma coisa e um deles ia ficar velho.
 *
 * Grava sozinho, como as seções: não há botão de salvar.
 */
export function BudgetGeneralInfoForm({
  budget,
}: {
  budget: BudgetWithSections;
}) {
  const inicial: Info = {
    title: budget.title,
    client_name: budget.client_name,
    client_whatsapp: budget.client_whatsapp,
  };
  const [info, setInfo] = useState<Info>(inicial);
  const { estado, agendar, rascunho, descartarRascunho, fecharRascunho } =
    useAutosave<Info>({
      chave: `orcamento-info-rascunho-${budget.id}`,
      servidor: inicial,
      salvar: (valor) => saveBudgetInfoAction(budget.id, valor),
    });

  function mudar(campoNome: keyof Info, valor: string) {
    const proximo = { ...info, [campoNome]: valor };
    setInfo(proximo);
    agendar(proximo);
  }

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="space-y-6">
        {rascunho ? (
          <div
            role="alert"
            className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
          >
            Sobraram edições não gravadas de{" "}
            {new Date(rascunho.at).toLocaleString("pt-BR")}.
            <span className="ml-3 inline-flex gap-3 font-medium">
              <button
                type="button"
                className="underline"
                onClick={() => {
                  setInfo(rascunho.valor);
                  agendar(rascunho.valor, true);
                  fecharRascunho();
                }}
              >
                Recuperar
              </button>
              <button
                type="button"
                className="underline"
                onClick={descartarRascunho}
              >
                Descartar
              </button>
            </span>
          </div>
        ) : null}

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-900">Projeto</h2>
            <span
              role="status"
              aria-live="polite"
              className={`text-xs ${
                estado.tipo === "erro" ? "text-red-600" : "text-neutral-500"
              }`}
            >
              {estado.tipo === "pendente"
                ? "Editando…"
                : estado.tipo === "salvando"
                  ? "Salvando…"
                  : estado.tipo === "salvo"
                    ? "Salvo"
                    : estado.tipo === "erro"
                      ? `Não salvou: ${estado.motivo}`
                      : ""}
            </span>
          </div>
          <div className="space-y-3">
            <div>
              <label className={rotulo} htmlFor="info-title">
                Nome interno (não aparece na proposta)
              </label>
              <input
                id="info-title"
                value={info.title}
                onChange={(e) => mudar("title", e.target.value)}
                className={campo}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={rotulo} htmlFor="info-client">
                  Cliente
                </label>
                <input
                  id="info-client"
                  value={info.client_name}
                  onChange={(e) => mudar("client_name", e.target.value)}
                  className={campo}
                />
              </div>
              <div>
                <label className={rotulo} htmlFor="info-whatsapp">
                  WhatsApp (com DDI+DDD, só números)
                </label>
                <input
                  id="info-whatsapp"
                  value={info.client_whatsapp}
                  onChange={(e) => mudar("client_whatsapp", e.target.value)}
                  placeholder="5511999998888"
                  className={campo}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
