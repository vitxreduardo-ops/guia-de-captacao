"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ExternalLink, PanelRightClose, PanelRightOpen } from "lucide-react";
import { saveBudgetSectionsAction } from "@/app/admin/orcamentos/[id]/actions";
import {
  BudgetPreviewPane,
  ZoomControls,
} from "@/components/admin/budget/BudgetPreviewPane";
import { BudgetAiFill } from "@/components/admin/budget/BudgetAiFill";
import { BudgetSectionPanel } from "@/components/admin/budget/BudgetSectionPanel";
import { useAutosave, type EstadoSave } from "@/components/admin/budget/useAutosave";
import type { BudgetSection } from "@/lib/budgetSections";
import type { BudgetWithSections } from "@/lib/budgets";

function rotuloSave(estado: EstadoSave) {
  switch (estado.tipo) {
    case "pendente":
      return "Editando…";
    case "salvando":
      return "Salvando…";
    case "salvo":
      return "Salvo";
    case "erro":
      return `Não salvou: ${estado.motivo}`;
    default:
      return "";
  }
}

/**
 * O editor da proposta: preview à esquerda, painel de seções à direita.
 *
 * O estado das seções vive aqui e alimenta os dois lados ao mesmo tempo, então
 * o preview responde enquanto se digita, sem passar pelo servidor. O banco
 * recebe o array inteiro num UPDATE só — é atômico, então não existe estado
 * meio salvo e o autosave pode ser barato.
 *
 * ponytail: last-write-wins no array inteiro; um editor por orçamento. Se duas
 * pessoas passarem a editar a mesma proposta ao mesmo tempo, salvar só a seção
 * alterada com jsonb_set.
 */
export function BudgetEditor({
  budget,
  config,
}: {
  budget: BudgetWithSections;
  /**
   * A aba Configuração: publicação, dados gerais e calculadoras. Vem pronta de
   * fora porque são server components com as actions de sempre — o editor só
   * dá o lugar onde eles moram.
   */
  config: ReactNode;
}) {
  const [sections, setSections] = useState<BudgetSection[]>(budget.sections);
  const [openKind, setOpenKind] = useState<string | null>(null);
  const [tab, setTab] = useState<"secoes" | "config">("secoes");
  const [painelAberto, setPainelAberto] = useState(true);
  // O zoom do preview mora aqui porque o controle dele fica na barra do painel,
  // e não sobre a proposta.
  const [zoom, setZoom] = useState<number | null>(null);
  const {
    estado,
    agendar,
    ocupado,
    rascunho,
    descartarRascunho,
    fecharRascunho,
  } =
    useAutosave<BudgetSection[]>({
      chave: `orcamento-rascunho-${budget.id}`,
      servidor: budget.sections,
      salvar: (valor) => saveBudgetSectionsAction(budget.id, valor),
    });

  const schedule = useCallback(
    (next: BudgetSection[], immediate = false) => {
      setSections(next);
      // Ligar uma seção, adicionar ou remover um item não é digitação: são
      // cliques isolados, e esperar quase um segundo por eles só faz o "Salvo"
      // chegar atrasado.
      agendar(next, immediate);
    },
    [agendar]
  );

  // A aba Configuração salva pelo servidor: a calculadora escreve os pacotes
  // direto na seção de valores. Sem adotar o que volta de lá, o preview ficaria
  // desatualizado e — pior — o próximo autosave gravaria o estado antigo por
  // cima, apagando os pacotes recém-gerados.
  //
  // Só adota quando não há save pendente nem em voo: o rascunho de quem está
  // digitando vale mais que a versão do servidor, que é justamente a de antes.
  useEffect(() => {
    if (ocupado()) return;
    const doServidor = JSON.stringify(budget.sections);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSections((atual) =>
      doServidor === JSON.stringify(atual) ? atual : budget.sections
    );
  }, [budget.sections, ocupado]);

  const toggleEnabled = useCallback(
    (kind: string) => {
      schedule(
        sections.map((section) =>
          section.kind === kind
            ? ({ ...section, enabled: !section.enabled } as BudgetSection)
            : section
        ),
        true
      );
    },
    [schedule, sections]
  );

  const changeSection = useCallback(
    (updated: BudgetSection) => {
      schedule(
        sections.map((section) =>
          section.kind === updated.kind ? updated : section
        )
      );
    },
    [schedule, sections]
  );

  return (
    // data-live-pause segura o LiveRefresh do cabeçalho: uma revalidação de
    // rota no meio da edição traria as seções do banco por cima do rascunho.
    <div
      data-live-pause
      className={`grid gap-4 lg:h-[calc(100svh-9rem)] ${
        painelAberto ? "lg:grid-cols-[1fr_380px]" : "lg:grid-cols-1"
      }`}
    >
      {/* min-w-0: sem isto a coluna se recusa a encolher abaixo da largura do
          conteúdo, que é fixa em 1440, e o grid estoura a tela. */}
      <div className="relative min-h-0 min-w-0">
        <BudgetPreviewPane
          sections={sections}
          clientName={budget.client_name}
          zoom={zoom}
        />
        {painelAberto ? null : (
          <button
            type="button"
            onClick={() => setPainelAberto(true)}
            className="absolute right-4 top-4 flex items-center gap-2 rounded-lg border border-neutral-200 bg-white/90 px-3 py-2 text-xs font-medium text-neutral-700 shadow-sm backdrop-blur hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none"
          >
            <PanelRightOpen className="h-4 w-4" />
            Editar
          </button>
        )}
      </div>

      <div
        className={`flex min-h-0 flex-col gap-3 lg:overflow-y-auto ${
          painelAberto ? "" : "hidden"
        }`}
      >
        {rascunho ? (
          <div
            role="alert"
            className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
          >
            <p>
              Sobraram edições não gravadas de{" "}
              {new Date(rascunho.at).toLocaleString("pt-BR")}.
            </p>
            <div className="mt-2 flex gap-3 font-medium">
              <button
                type="button"
                onClick={() => {
                  schedule(rascunho.valor, true);
                  fecharRascunho();
                }}
                className="underline"
              >
                Recuperar
              </button>
              <button
                type="button"
                onClick={descartarRascunho}
                className="underline"
              >
                Descartar
              </button>
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2.5">
          <span
            className={`text-xs ${
              estado.tipo === "erro" ? "text-red-600" : "text-neutral-500"
            }`}
            // O estado de salvamento muda sozinho: quem usa leitor de tela
            // precisa ouvir, mas sem interromper o que está sendo lido.
            role="status"
            aria-live="polite"
          >
            {rotuloSave(estado)}
          </span>
          <div className="flex items-center gap-2">
            <ZoomControls zoom={zoom} onChange={setZoom} />

            <span className="h-4 w-px bg-neutral-200" />

            <a
              href={`/orcamento/${budget.slug}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs font-medium text-neutral-700 hover:text-neutral-900"
            >
              Abrir proposta
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button
              type="button"
              onClick={() => setPainelAberto(false)}
              title="Esconder o painel e ver a proposta larga"
              className="rounded p-1 text-neutral-500 hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none"
            >
              <PanelRightClose className="h-4 w-4" />
              <span className="sr-only">Esconder o painel</span>
            </button>
          </div>
        </div>

        <div
          role="tablist"
          aria-label="Painel da proposta"
          className="flex gap-1 rounded-lg border border-neutral-200 bg-white p-1"
        >
          {(
            [
              ["secoes", "Seções"],
              ["config", "Configuração"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              onClick={() => setTab(value)}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium uppercase tracking-[0.12em] transition-colors focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none ${
                tab === value
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "config" ? (
          <div className="space-y-4">{config}</div>
        ) : (
        <>
        <BudgetAiFill sections={sections} onApply={(next) => schedule(next, true)} />
        <BudgetSectionPanel
          sections={sections}
          openKind={openKind}
          onToggleOpen={(kind) =>
            setOpenKind((atual) => (atual === kind ? null : kind))
          }
          onToggleEnabled={toggleEnabled}
          onChange={changeSection}
          budgetId={budget.id}
        />
        </>
        )}
      </div>
    </div>
  );
}
