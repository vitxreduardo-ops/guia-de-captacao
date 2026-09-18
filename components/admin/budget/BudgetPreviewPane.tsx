"use client";

import { BudgetSections } from "@/components/budget/BudgetSections";
import type { BudgetSection } from "@/lib/budgetSections";

/**
 * A proposta como o cliente vai ver, ao lado do painel.
 *
 * São os mesmos componentes da página pública, então não existe versão do
 * preview que possa divergir do que foi publicado.
 *
 * A proposta ocupa a largura real da coluna, sem escala: assim os pontos de
 * quebra do CSS respondem ao espaço que ela tem de fato. Fechar o painel alarga
 * a coluna e a proposta reflui para desktop — é como se vê o layout largo sem
 * sair da tela de edição.
 */
export function BudgetPreviewPane({
  sections,
  clientName,
}: {
  sections: BudgetSection[];
  clientName: string;
}) {
  return (
    <div
      // A capa mede a altura por --budget-vh: aqui ela é a altura do painel, e
      // não a da janela, senão a capa passaria da moldura do preview.
      style={{ ["--budget-vh" as string]: "100%" }}
      className="h-full overflow-y-auto overscroll-contain rounded-lg border border-neutral-200 bg-white"
    >
      <BudgetSections sections={sections} clientName={clientName} />
    </div>
  );
}
