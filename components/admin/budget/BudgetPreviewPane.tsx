"use client";

import { useEffect, useRef, useState } from "react";
import { BudgetSections } from "@/components/budget/BudgetSections";
import type { BudgetSection } from "@/lib/budgetSections";

/** A largura em que a proposta é desenhada — o desktop padrão de construção. */
const LARGURA = 1440;

/**
 * A proposta como o cliente vai ver, ao lado do painel.
 *
 * São os mesmos componentes da página pública, então não existe versão do
 * preview que possa divergir do que foi publicado.
 *
 * A proposta é sempre montada em 1440px e encolhida para caber na coluna: é a
 * largura em que ela vai ser vista de verdade, e assim o editor nunca mostra o
 * layout estreito por acidente nem obriga a rolar para o lado. A escala sai de
 * uma medição real da coluna — unidade de container aqui erra quando o painel
 * abre e fecha.
 */
export function BudgetPreviewPane({
  sections,
  clientName,
}: {
  sections: BudgetSection[];
  clientName: string;
}) {
  const moldura = useRef<HTMLDivElement>(null);
  const [caixa, setCaixa] = useState({ largura: LARGURA, altura: 0 });

  useEffect(() => {
    const alvo = moldura.current;
    if (!alvo) return;

    const observer = new ResizeObserver(([entry]) => {
      setCaixa({
        largura: entry.contentRect.width,
        altura: entry.contentRect.height,
      });
    });
    observer.observe(alvo);
    return () => observer.disconnect();
  }, []);

  const escala = caixa.largura / LARGURA;

  return (
    <div
      ref={moldura}
      // A capa mede a altura por --budget-vh: na página é a janela, aqui é a
      // moldura. Em pixels, e não em porcentagem, porque o elemento que recebe
      // a variável não tem altura definida — altura em porcentagem sem
      // referência resolve como `auto` e a capa encolhe até o conteúdo. O valor
      // é dividido pela escala porque o conteúdo vive no tamanho de antes de
      // encolher.
      style={{
        ["--budget-vh" as string]: `${caixa.altura / escala}px`,
      }}
      className="h-full overflow-y-auto overflow-x-hidden overscroll-contain rounded-lg border border-neutral-200 bg-white"
    >
      <div
        style={{
          width: LARGURA,
          transform: `scale(${escala})`,
          transformOrigin: "top left",
          // O elemento continua ocupando 1440px de altura no fluxo mesmo depois
          // de encolhido; isto devolve o espaço que sobraria embaixo.
          marginBottom: `calc(${escala - 1} * 100%)`,
        }}
      >
        <BudgetSections sections={sections} clientName={clientName} />
      </div>
    </div>
  );
}
