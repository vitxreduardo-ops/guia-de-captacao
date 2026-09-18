"use client";

import { BudgetSections } from "@/components/budget/BudgetSections";
import type { BudgetSection } from "@/lib/budgetSections";

/**
 * A proposta como o cliente vai ver, ao lado do painel.
 *
 * São os mesmos componentes da página pública, então não existe versão do
 * preview que possa divergir do que foi publicado. O que muda é só a moldura:
 * a proposta é desenhada na largura de um desktop e encolhida para caber na
 * coluna, com transform — assim os pontos de quebra do CSS continuam valendo
 * como valem de verdade, em vez de a proposta virar mobile dentro do editor.
 */
export function BudgetPreviewPane({
  sections,
  clientName,
}: {
  sections: BudgetSection[];
  clientName: string;
}) {
  const LARGURA = 1280;

  return (
    <div className="h-full overflow-y-auto overscroll-contain rounded-lg border border-neutral-200 bg-white">
      <div
        // A escala sai da largura real da coluna via container query units, e
        // a altura acompanha para o contêiner não sobrar nem faltar embaixo.
        className="origin-top-left [container-type:inline-size]"
      >
        <div
          style={{
            width: LARGURA,
            transform: `scale(var(--preview-scale))`,
            transformOrigin: "top left",
            // 100cqw / 1280 — a conta que faz a proposta caber na coluna.
            ["--preview-scale" as string]: `calc(100cqw / ${LARGURA})`,
            marginBottom: `calc((1 - (100cqw / ${LARGURA})) * -100%)`,
          }}
        >
          <BudgetSections sections={sections} clientName={clientName} />
        </div>
      </div>
    </div>
  );
}
