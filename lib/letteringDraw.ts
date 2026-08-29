import type { Layer, Size } from "@/lib/lettering";

/** O PNG sai em 3x pra dar resolução de story sem precisar pedir o tamanho. */
export const EXPORT_SCALE = 3;

/**
 * Teto de canvas do iOS. Passando disso o Safari não avisa: devolve um canvas
 * em branco, e o PNG sai vazio. O lado máximo é o limite mais apertado, que
 * aparece em iPhone mais antigo.
 */
const MAX_CANVAS_AREA = 16_000_000;
const MAX_CANVAS_SIDE = 4096;

/**
 * Maior escala que ainda cabe no canvas — em 1080x1920, 3x já daria 18,7
 * milhões de pixels e estouraria o limite do iPhone.
 */
export function safeScale(
  width: number,
  height: number,
  wanted = EXPORT_SCALE,
): number {
  const porArea = Math.sqrt(MAX_CANVAS_AREA / (width * height));
  const porLado = MAX_CANVAS_SIDE / Math.max(width, height);
  return Math.max(1, Math.min(wanted, porArea, porLado));
}

/** Tela do story. É o palco onde as camadas são posicionadas. */
export const STAGE = { width: 1080, height: 1920 };

type Layout = Size & {
  /**
   * Onde cravar a âncora do texto pra que o desenho saia centrado na camada.
   * Emoji e fontes com swash não são simétricos em volta da âncora, então
   * assumir o centro desalinha o desenho da moldura de seleção.
   */
  anchorX: number;
  anchorY: number;
  lines: string[];
  step: number;
  /** Distância da âncora até a base da primeira linha. */
  firstBaseline: number;
  /** O quanto contorno, respiro do box e sombra crescem pra fora do texto. */
  grow: number;
  textWidth: number;
  textHeight: number;
};

/**
 * Mede a camada inteira medindo os extremos reais do desenho, não a largura de
 * avanço: itálico, swash e emoji saem da caixa do avanço e seriam cortados.
 */
export function layoutLayer(
  ctx: CanvasRenderingContext2D,
  layer: Layer,
): Layout {
  const lines = layer.text.split("\n");
  ctx.letterSpacing = `${layer.tracking}px`;
  ctx.font = `${layer.size}px ${layer.family}`;
  ctx.textAlign = layer.align;
  ctx.textBaseline = "alphabetic";

  const metrics = lines.map((line) => ctx.measureText(line || " "));
  const step = layer.size * layer.lineHeight;

  // Todos os extremos são medidos a partir de uma âncora em (0, 0), com as
  // linhas empilhadas pelo passo da entrelinha.
  const left = Math.min(...metrics.map((m) => -m.actualBoundingBoxLeft));
  const right = Math.max(...metrics.map((m) => m.actualBoundingBoxRight));
  const top = Math.min(
    ...metrics.map((m, i) => i * step - m.actualBoundingBoxAscent),
  );
  const bottom = Math.max(
    ...metrics.map((m, i) => i * step + m.actualBoundingBoxDescent),
  );

  const textWidth = Math.max(right - left, 1);
  const textHeight = Math.max(bottom - top, 1);

  const shadowReach = layer.shadow
    ? layer.shadowBlur + Math.max(Math.abs(layer.shadowX), Math.abs(layer.shadowY))
    : 0;
  const grow = layer.stroke + (layer.box ? layer.boxPadding : 0) + shadowReach;

  return {
    width: textWidth + grow * 2,
    height: textHeight + grow * 2,
    // O centro do desenho fica em (left+right)/2; a âncora é o quanto empurrar
    // pro outro lado pra esse centro cair no centro da camada.
    anchorX: -(left + right) / 2,
    anchorY: -(top + bottom) / 2,
    lines,
    step,
    firstBaseline: 0,
    grow,
    textWidth,
    textHeight,
  };
}

export function measureLayer(
  ctx: CanvasRenderingContext2D,
  layer: Layer,
): Size {
  const { width, height } = layoutLayer(ctx, layer);
  return { width, height };
}

/**
 * Desenha a camada a partir do próprio centro: quem chama já posicionou o
 * canvas em (x, y) e girou. Aqui é tudo relativo ao centro.
 */
export function drawLayer(ctx: CanvasRenderingContext2D, layer: Layer) {
  const layout = layoutLayer(ctx, layer);

  // A sombra vai no que estiver por baixo: tendo box, é o box que projeta,
  // senão cada letra projeta a sua. Se ficasse nos dois, a do texto bateria
  // dentro do box e sujaria o fundo.
  const applyShadow = () => {
    ctx.shadowColor = layer.shadow ? layer.shadowColor : "transparent";
    ctx.shadowBlur = layer.shadow ? layer.shadowBlur : 0;
    ctx.shadowOffsetX = layer.shadow ? layer.shadowX : 0;
    ctx.shadowOffsetY = layer.shadow ? layer.shadowY : 0;
  };
  const clearShadow = () => {
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  };

  if (layer.box) {
    const inner = layer.boxPadding;
    applyShadow();
    ctx.fillStyle = layer.boxColor;
    ctx.beginPath();
    // O raio não pode passar da metade do lado menor, senão o canvas reclama e
    // não desenha nada.
    const boxW = layout.textWidth + inner * 2;
    const boxH = layout.textHeight + inner * 2;
    ctx.roundRect(
      -boxW / 2,
      -boxH / 2,
      boxW,
      boxH,
      Math.min(layer.boxRadius, Math.min(boxW, boxH) / 2),
    );
    ctx.fill();
    clearShadow();
  }

  ctx.fillStyle = layer.color;

  // lineWidth dobrado e o preenchimento por cima: o traço do canvas fica metade
  // pra dentro da letra, e essa metade some sob o fill. Sobra exatamente a
  // espessura pedida, por fora.
  ctx.strokeStyle = layer.strokeColor;
  ctx.lineWidth = layer.stroke * 2;
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;

  if (!layer.box) applyShadow();

  layout.lines.forEach((line, i) => {
    const y = layout.anchorY + i * layout.step;
    if (layer.stroke > 0) ctx.strokeText(line, layout.anchorX, y);
    ctx.fillText(line, layout.anchorX, y);
  });

  clearShadow();
}
