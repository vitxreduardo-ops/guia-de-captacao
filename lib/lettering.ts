/**
 * Geometria das camadas do lettering.
 *
 * Cada camada é desenhada a partir do próprio centro: o canvas translada até
 * (x, y), gira, e o texto sai centrado ali. Isso deixa mover e girar simples —
 * e deixa a matemática daqui independente do canvas, que é o que permite
 * testá-la sem navegador.
 */

export type LayerKind = "text" | "emoji";

export type Layer = {
  id: string;
  kind: LayerKind;
  text: string;
  family: string;
  size: number;
  color: string;
  align: "left" | "center" | "right";
  lineHeight: number;
  tracking: number;
  stroke: number;
  strokeColor: string;
  shadow: boolean;
  shadowBlur: number;
  shadowX: number;
  shadowY: number;
  shadowColor: string;
  box: boolean;
  boxColor: string;
  boxPadding: number;
  boxRadius: number;
  /** Centro da camada, em coordenadas do palco. */
  x: number;
  y: number;
  /** Em graus, pra ficar legível no painel. */
  rotation: number;
};

export type Size = { width: number; height: number };
export type Point = { x: number; y: number };
export type Rect = { left: number; top: number; right: number; bottom: number };

/** Os quatro cantos da camada já girados, em coordenadas do palco. */
export function layerCorners(layer: Layer, size: Size): Point[] {
  const rad = (layer.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const hw = size.width / 2;
  const hh = size.height / 2;

  return [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ].map(([dx, dy]) => ({
    x: layer.x + dx * cos - dy * sin,
    y: layer.y + dx * sin + dy * cos,
  }));
}

/**
 * O ponto está sobre a camada? Em vez de girar a camada pra comparar, gira o
 * ponto no sentido contrário — aí a conta vira um retângulo alinhado.
 */
export function hitsLayer(point: Point, layer: Layer, size: Size): boolean {
  const rad = (-layer.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = point.x - layer.x;
  const dy = point.y - layer.y;
  const localX = dx * cos - dy * sin;
  const localY = dx * sin + dy * cos;

  return (
    Math.abs(localX) <= size.width / 2 && Math.abs(localY) <= size.height / 2
  );
}

/** Menor retângulo que cabe todas as camadas — é por ele que o PNG é cortado. */
export function unionBounds(boxes: Point[][]): Rect | null {
  const points = boxes.flat();
  if (points.length === 0) return null;

  return {
    left: Math.min(...points.map((p) => p.x)),
    top: Math.min(...points.map((p) => p.y)),
    right: Math.max(...points.map((p) => p.x)),
    bottom: Math.max(...points.map((p) => p.y)),
  };
}

/**
 * Qual camada recebe o clique: a de cima. As camadas são desenhadas na ordem
 * da lista, então a última desenhada é a que está por cima.
 */
export function topmostAt(
  point: Point,
  layers: Layer[],
  sizes: Map<string, Size>,
): Layer | null {
  for (let i = layers.length - 1; i >= 0; i--) {
    const size = sizes.get(layers[i].id);
    if (size && hitsLayer(point, layers[i], size)) return layers[i];
  }
  return null;
}

/** Distância entre dois dedos — é o que vira escala no pinça. */
export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Ângulo em graus entre dois dedos — é o que vira giro no pinça. */
export function angle(a: Point, b: Point): number {
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}

/**
 * Giro acumulado sem dar salto de 360°: passar de 179° pra -179° é um passo de
 * 2° pra esquerda, não uma volta inteira.
 */
export function shortestTurn(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}

/** Segura o valor entre um mínimo e um máximo. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
