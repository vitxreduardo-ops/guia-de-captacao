"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { BudgetSections } from "@/components/budget/BudgetSections";
import type { BudgetSection } from "@/lib/budgetSections";

/** A largura em que a proposta é desenhada — o desktop padrão de construção. */
const LARGURA = 1440;

const PASSO = 0.25;
const MIN = 0.75;
const MAX = 2;

/** Arredonda para o passo de cima ou de baixo a partir de onde o zoom está. */
function proximoPasso(atual: number, direcao: 1 | -1) {
  const passos = Math.round(atual / PASSO);
  const alvo = (passos + direcao) * PASSO;
  return Math.min(Math.max(Number(alvo.toFixed(2)), MIN), MAX);
}

/** A janela que o zoom simula: dobrar o zoom é metade da largura. */
export function larguraDaJanela(zoom: number | null) {
  return Math.round(LARGURA / (zoom ?? 1));
}

/**
 * Os botões de zoom, na barra do painel.
 *
 * Ficam ao lado de "Abrir proposta" em vez de flutuar sobre a proposta: o
 * canvas é o que se está olhando, e um controle por cima dele tapa justamente
 * o rodapé da seção que estiver à vista.
 */
export function ZoomControls({
  zoom,
  onChange,
}: {
  zoom: number | null;
  onChange: (zoom: number | null) => void;
}) {
  const nivel = zoom ?? 1;

  // Pela forma funcional não dá — o estado é de fora. Mas o cálculo parte de
  // `nivel`, que é sempre o valor do render mais recente.
  const mudar = (direcao: 1 | -1) => onChange(proximoPasso(nivel, direcao));

  return (
    <div className="flex items-center gap-0.5">
      <ZoomBotao
        titulo="Diminuir o zoom"
        onClick={() => mudar(-1)}
        desabilitado={nivel <= MIN}
      >
        <Minus className="h-3.5 w-3.5" />
      </ZoomBotao>

      <button
        type="button"
        onClick={() => onChange(null)}
        title={`Janela de ${larguraDaJanela(zoom)}px — clique para voltar ao padrão`}
        className="min-w-[4.5rem] rounded-md px-1.5 py-1 text-[11px] font-medium tabular-nums text-neutral-700 hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none"
      >
        {Math.round(nivel * 100)}%
        <span className="ml-1 text-neutral-400">{larguraDaJanela(zoom)}px</span>
      </button>

      <ZoomBotao
        titulo="Aumentar o zoom"
        onClick={() => mudar(1)}
        desabilitado={nivel >= MAX}
      >
        <Plus className="h-3.5 w-3.5" />
      </ZoomBotao>
    </div>
  );
}

/**
 * A proposta como o cliente vai ver, ao lado do painel.
 *
 * São os mesmos componentes da página pública, então não existe versão do
 * preview que possa divergir do que foi publicado.
 *
 * A proposta é montada numa largura de janela e encolhida para caber na coluna.
 * A escala sai de uma medição real da coluna: unidade de container aqui erra
 * quando o painel abre e fecha.
 *
 * O zoom não amplia a proposta — ele estreita a janela simulada. Ampliar 1440px
 * fixos passaria da coluna e obrigaria a rolar para o lado, que é justamente o
 * que o encaixe existe para evitar. Estreitando a janela, o conteúdo cresce na
 * tela e continua cabendo inteiro: dobrar o zoom é ver a proposta como ela
 * ficaria numa janela de 720px, ampliada até preencher a coluna.
 *
 * O preço é que, estreitando bastante, o layout reflui de verdade — o que é
 * informação útil, e não defeito: é como a proposta vai aparecer para quem abrir
 * numa tela menor.
 */
export function BudgetPreviewPane({
  sections,
  clientName,
  zoom,
}: {
  sections: BudgetSection[];
  clientName: string;
  /** null = a janela padrão de 1440. O controle mora na barra do painel. */
  zoom: number | null;
}) {
  const moldura = useRef<HTMLDivElement>(null);
  const [caixa, setCaixa] = useState({ largura: 0, altura: 0 });

  // useLayoutEffect, e não useEffect: a primeira medição precisa acontecer
  // antes da pintura, senão a proposta pisca em tamanho real antes de encolher.
  useLayoutEffect(() => {
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

  const larguraJanela = larguraDaJanela(zoom);
  // Sempre encaixa: a escala é sempre a que faz a janela simulada caber. Antes
  // da primeira medição não há escala que se possa calcular, e renderizar em
  // tamanho real seria o piscar que o useLayoutEffect existe para evitar.
  const medida = caixa.largura > 0;
  const escala = medida ? caixa.largura / larguraJanela : 1;

  return (
    <div className="h-full">
      <div
        ref={moldura}
        // A capa mede a altura por --budget-vh: na página é a janela, aqui é a
        // moldura. Em pixels, e não em porcentagem, porque o elemento que
        // recebe a variável não tem altura definida — altura em porcentagem sem
        // referência resolve como `auto` e a capa encolhe até o conteúdo. O
        // valor é dividido pela escala porque o conteúdo vive no tamanho de
        // antes de encolher.
        style={{ ["--budget-vh" as string]: `${caixa.altura / escala}px` }}
        className="h-full overflow-y-auto overflow-x-hidden overscroll-contain rounded-lg border border-neutral-200 bg-white"
      >
        <div
          style={{
            width: larguraJanela,
            transform: `scale(${escala})`,
            transformOrigin: "top left",
            // O elemento continua ocupando o tamanho de antes de encolher no
            // fluxo; isto devolve o espaço que sobraria embaixo e ao lado.
            marginBottom: `calc(${escala - 1} * 100%)`,
            marginRight: larguraJanela * (escala - 1),
          }}
        >
          {medida ? (
            <BudgetSections sections={sections} clientName={clientName} />
          ) : null}
        </div>
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
      className="rounded-md p-1.5 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-30 disabled:hover:bg-transparent focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none"
    >
      {children}
      <span className="sr-only">{titulo}</span>
    </button>
  );
}
