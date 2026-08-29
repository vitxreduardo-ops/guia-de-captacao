import type { Point, Rect, Size } from "@/lib/lettering";

/** Linha que aparece no palco quando a camada encosta num alinhamento. */
export type Guia = { eixo: "x" | "y"; pos: number };

export type Resultado = { x: number; y: number; guias: Guia[] };

/** As bordas que uma caixa oferece num eixo, a partir do centro e do tamanho. */
function bordas(centro: number, tamanho: number): number[] {
  return [centro - tamanho / 2, centro + tamanho / 2];
}

/**
 * Puxa a camada para o alinhamento mais próximo, dentro da tolerância.
 *
 * Procura em cada eixo separadamente: o imã horizontal não deve atrapalhar o
 * movimento vertical. Entre dois alinhamentos possíveis vence o que exige o
 * menor deslocamento — puxar para o mais longe brigaria com o dedo.
 */
export function snap(
  centro: Point,
  caixa: Size,
  outras: Rect[],
  stage: Size,
  tolerancia: number,
): Resultado {
  const guias: Guia[] = [];

  /**
   * Centro procura centro, borda procura borda. Deixar a borda alinhar com um
   * centro faria a peça grudar em lugar nenhum reconhecível — é ruído, não
   * alinhamento.
   */
  const resolver = (
    eixo: "x" | "y",
    posicao: number,
    tamanho: number,
    centrosAlvo: number[],
    bordasAlvo: number[],
  ) => {
    let melhor: { desloca: number; alvo: number } | null = null;

    const considerar = (minha: number, alvo: number) => {
      const desloca = alvo - minha;
      if (Math.abs(desloca) > tolerancia) return;
      if (!melhor || Math.abs(desloca) < Math.abs(melhor.desloca)) {
        melhor = { desloca, alvo };
      }
    };

    for (const alvo of centrosAlvo) considerar(posicao, alvo);
    for (const minha of bordas(posicao, tamanho)) {
      for (const alvo of bordasAlvo) considerar(minha, alvo);
    }

    if (!melhor) return posicao;
    const escolha: { desloca: number; alvo: number } = melhor;
    guias.push({ eixo, pos: escolha.alvo });
    return posicao + escolha.desloca;
  };

  return {
    x: resolver(
      "x",
      centro.x,
      caixa.width,
      [stage.width / 2, ...outras.map((o) => (o.left + o.right) / 2)],
      [0, stage.width, ...outras.flatMap((o) => [o.left, o.right])],
    ),
    y: resolver(
      "y",
      centro.y,
      caixa.height,
      [stage.height / 2, ...outras.map((o) => (o.top + o.bottom) / 2)],
      [0, stage.height, ...outras.flatMap((o) => [o.top, o.bottom])],
    ),
    guias,
  };
}
