"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { saveBudgetSectionsAction } from "@/app/admin/orcamentos/[id]/actions";
import { BudgetPreviewPane } from "@/components/admin/budget/BudgetPreviewPane";
import { BudgetSectionPanel } from "@/components/admin/budget/BudgetSectionPanel";
import type { BudgetSection } from "@/lib/budgetSections";
import type { BudgetWithSections } from "@/lib/budgets";

const DEBOUNCE_MS = 900;

type SaveState = "idle" | "pending" | "saving" | "saved" | "error";

const SAVE_LABEL: Record<SaveState, string> = {
  idle: "",
  pending: "Editando…",
  saving: "Salvando…",
  saved: "Salvo",
  error: "Não salvou",
};

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
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // O save lê daqui, e não da closure, para nunca gravar uma versão anterior
  // à última tecla digitada.
  const pending = useRef<BudgetSection[] | null>(null);

  const flush = useCallback(async () => {
    const payload = pending.current;
    if (!payload) return;
    pending.current = null;

    setSaveState("saving");
    try {
      await saveBudgetSectionsAction(budget.id, payload);
      setSaveState("saved");
    } catch (error) {
      console.error("[BudgetEditor] falhou ao salvar as seções:", error);
      setSaveState("error");
    }
  }, [budget.id]);

  const schedule = useCallback(
    (next: BudgetSection[], immediate = false) => {
      setSections(next);
      pending.current = next;
      setSaveState("pending");

      if (timer.current) clearTimeout(timer.current);
      // Ligar uma seção, adicionar ou remover um item não é digitação: são
      // cliques isolados, e esperar quase um segundo por eles só faz o "Salvo"
      // chegar atrasado.
      timer.current = setTimeout(flush, immediate ? 0 : DEBOUNCE_MS);
    },
    [flush]
  );

  // Fechar a aba com um save agendado perderia a última edição.
  useEffect(() => {
    function avisar(event: BeforeUnloadEvent) {
      if (pending.current) event.preventDefault();
    }
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, []);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

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
    <div data-live-pause className="grid gap-4 lg:h-[calc(100svh-9rem)] lg:grid-cols-[1fr_380px]">
      <BudgetPreviewPane
        sections={sections}
        clientName={budget.client_name}
      />

      <div className="flex min-h-0 flex-col gap-3 lg:overflow-y-auto">
        <div className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2.5">
          <span
            className={`text-xs ${
              saveState === "error" ? "text-red-600" : "text-neutral-500"
            }`}
            // O estado de salvamento muda sozinho: quem usa leitor de tela
            // precisa ouvir, mas sem interromper o que está sendo lido.
            role="status"
            aria-live="polite"
          >
            {SAVE_LABEL[saveState]}
          </span>
          <a
            href={`/orcamento/${budget.slug}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs font-medium text-neutral-700 hover:text-neutral-900"
          >
            Abrir proposta
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
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
        )}
      </div>
    </div>
  );
}
