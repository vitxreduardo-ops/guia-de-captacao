"use client";

import { Eye, EyeOff, Minus, Plus } from "lucide-react";
import {
  SECTION_LABELS,
  isEmpty,
  isNumbered,
  sectionNumber,
  type BudgetSection,
} from "@/lib/budgetSections";
import { SectionFields } from "@/components/admin/budget/SectionFields";

const FOCUS_RING =
  "focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-1 focus-visible:outline-none";

/**
 * A lista das onze seções da proposta.
 *
 * A numeração é a mesma que o cliente vê — conta só as seções visíveis e pula
 * capa e rodapé — então bater o olho aqui e na proposta dá o mesmo mapa. Uma
 * seção que está ligada mas sem conteúdo aparece marcada como vazia, porque do
 * lado do cliente ela simplesmente não existe e isso não pode ser surpresa.
 */
export function BudgetSectionPanel({
  sections,
  openKind,
  onToggleOpen,
  onToggleEnabled,
  onChange,
  budgetId,
}: {
  sections: BudgetSection[];
  openKind: string | null;
  onToggleOpen: (kind: string) => void;
  onToggleEnabled: (kind: string) => void;
  onChange: (section: BudgetSection) => void;
  budgetId: string;
}) {
  const visiveis = sections.filter((s) => s.enabled && !isEmpty(s));

  return (
    <div className="rounded-lg border border-neutral-200 bg-white">
      <p className="px-4 py-3 text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-500">
        Seções da proposta
      </p>

      <div className="divide-y divide-neutral-200 border-t border-neutral-200">
        {sections.map((section) => {
          const aberta = openKind === section.kind;
          const vazia = isEmpty(section);
          const numero = isNumbered(section)
            ? sectionNumber(
                visiveis.slice(0, visiveis.indexOf(section)).filter(isNumbered).length
              )
            : "—";

          return (
            <div key={section.kind}>
              <div className="flex items-center gap-2 px-4 py-2.5">
                <span className="w-6 shrink-0 text-[11px] font-bold tabular-nums text-neutral-400">
                  {section.enabled && !vazia ? numero : "—"}
                </span>

                <button
                  type="button"
                  onClick={() => onToggleOpen(section.kind)}
                  aria-expanded={aberta}
                  className={`flex flex-1 items-center gap-2 text-left text-sm ${FOCUS_RING} ${
                    section.enabled ? "text-neutral-900" : "text-neutral-400"
                  }`}
                >
                  {SECTION_LABELS[section.kind]}
                  {section.enabled && vazia ? (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                      vazia
                    </span>
                  ) : null}
                </button>

                <button
                  type="button"
                  onClick={() => onToggleEnabled(section.kind)}
                  aria-pressed={section.enabled}
                  title={
                    section.enabled
                      ? "Esconder esta seção do cliente"
                      : "Mostrar esta seção para o cliente"
                  }
                  className={`rounded p-1 ${FOCUS_RING} ${
                    section.enabled
                      ? "text-neutral-600 hover:text-neutral-900"
                      : "text-neutral-300 hover:text-neutral-500"
                  }`}
                >
                  {section.enabled ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                  <span className="sr-only">
                    {section.enabled ? "Esconder seção" : "Mostrar seção"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onToggleOpen(section.kind)}
                  aria-hidden
                  tabIndex={-1}
                  className="rounded p-1 text-neutral-400 hover:text-neutral-700"
                >
                  {aberta ? (
                    <Minus className="h-4 w-4" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </button>
              </div>

              {aberta ? (
                <div className="px-4 pb-4">
                  <SectionFields
                    section={section}
                    onChange={onChange}
                    budgetId={budgetId}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
