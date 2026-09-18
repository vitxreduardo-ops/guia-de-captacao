"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { BudgetSections } from "@/components/budget/BudgetSections";
import type { BudgetSection } from "@/lib/budgetSections";

/** A largura em que a proposta é desenhada — o desktop padrão de construção. */
const LARGURA = 1440;

const PASSO = 0.25;
const MIN = 0.25;
const MAX = 2;

/** Arredonda para o passo de cima ou de baixo a partir de onde o zoom está. */
function proximoPasso(atual: number, direcao: 1 | -1) {
  const passos = Math.round(atual / PASSO);
  const alvo = (passos + direcao) * PASSO;
  return Math.min(Math.max(Number(alvo.toFixed(2)), MIN), MAX);
}

/**
 * A proposta como o cliente vai ver, ao lado do painel.
 *
 * São os mesmos componentes da página pública, então não existe versão do
 * preview que possa divergir do que foi publicado.
 *
 * A proposta é sempre montada em 1440px — a largura em que ela vai ser vista de
 * verdade — e encolhida para caber na coluna. A escala sai de uma medição real
 * da coluna: unidade de container aqui erra quando o painel abre e fecha.
 *
 * O zoom parte desse encaixe e é o jeito de ler o texto sem fechar o painel.
 * Acima do encaixe a proposta passa da coluna e ganha rolagem lateral — que aí
 * é escolha de quem está olhando, não imposição.
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
  // null = acompanhando o encaixe. Um número fixa o zoom naquele valor, e ele
  // deixa de mudar quando o painel abre ou fecha.
  const [zoom, setZoom] = useState<number | null>(null);

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

  const encaixe = caixa.largura / LARGURA;
  const escala = zoom ?? encaixe;

  // Pela forma funcional: dois cliques seguidos no mesmo tick precisam somar
  // dois passos, e ler `escala` da closure daria o mesmo valor nas duas vezes.
  const mudarZoom = (direcao: 1 | -1) =>
    setZoom((atual) => proximoPasso(atual ?? encaixe, direcao));

  return (
    <div className="relative h-full">
      <div
        ref={moldura}
        // A capa mede a altura por --budget-vh: na página é a janela, aqui é a
        // moldura. Em pixels, e não em porcentagem, porque o elemento que
        // recebe a variável não tem altura definida — altura em porcentagem sem
        // referência resolve como `auto` e a capa encolhe até o conteúdo. O
        // valor é dividido pela escala porque o conteúdo vive no tamanho de
        // antes de encolher.
        style={{ ["--budget-vh" as string]: `${caixa.altura / escala}px` }}
        className="h-full overflow-auto overscroll-contain rounded-lg border border-neutral-200 bg-white"
      >
        <div
          style={{
            width: LARGURA,
            transform: `scale(${escala})`,
            transformOrigin: "top left",
            // O elemento continua ocupando o tamanho de antes de encolher no
            // fluxo; isto devolve o espaço que sobraria embaixo e ao lado.
            marginBottom: `calc(${escala - 1} * 100%)`,
            marginRight: LARGURA * (escala - 1),
          }}
        >
          <BudgetSections sections={sections} clientName={clientName} />
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-lg border border-neutral-200 bg-white/90 p-1 shadow-sm backdrop-blur">
        <ZoomBotao
          titulo="Diminuir o zoom"
          onClick={() => mudarZoom(-1)}
          desabilitado={escala <= MIN}
        >
          <Minus className="h-3.5 w-3.5" />
        </ZoomBotao>

        <button
          type="button"
          onClick={() => setZoom(zoom === null ? 1 : null)}
          title={
            zoom === null
              ? "Ver em tamanho real"
              : "Voltar a encaixar na largura"
          }
          className="pointer-events-auto min-w-16 rounded-md px-2 py-1 text-[11px] font-medium tabular-nums text-neutral-700 hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none"
        >
          {Math.round(escala * 100)}%
          {zoom === null ? (
            <span className="ml-1 text-neutral-400">ajuste</span>
          ) : null}
        </button>

        <ZoomBotao
          titulo="Aumentar o zoom"
          onClick={() => mudarZoom(1)}
          desabilitado={escala >= MAX}
        >
          <Plus className="h-3.5 w-3.5" />
        </ZoomBotao>
      </div>
    </div>
  );
}

function ZoomBotao({
  titulo,
  onClick,
  desabilitado,
  children,
}: {
  titulo: string;
  onClick: () => void;
  desabilitado: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desabilitado}
      title={titulo}
      className="pointer-events-auto rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-30 disabled:hover:bg-transparent focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none"
    >
      {children}
      <span className="sr-only">{titulo}</span>
    </button>
  );
}
