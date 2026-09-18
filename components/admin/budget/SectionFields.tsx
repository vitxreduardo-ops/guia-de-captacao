"use client";

import type { BudgetSection } from "@/lib/budgetSections";

/**
 * Os campos de uma seção. Cada kind tem a sua forma, então isto é um switch.
 *
 * Ainda vazio: o painel já abre, liga e desliga seção; a edição de campo entra
 * na próxima fatia.
 */
export function SectionFields({
  section,
}: {
  section: BudgetSection;
  onChange: (section: BudgetSection) => void;
  budgetId: string;
}) {
  return (
    <p className="rounded-md border border-dashed border-neutral-300 px-3 py-4 text-center text-xs text-neutral-400">
      Campos de {section.kind} entram na próxima fatia.
    </p>
  );
}
