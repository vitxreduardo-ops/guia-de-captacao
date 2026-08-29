import { describe, expect, it } from "vitest";
import {
  angle,
  clamp,
  distance,
  hitsLayer,
  layerCorners,
  shortestTurn,
  topmostAt,
  unionBounds,
  type Layer,
} from "@/lib/lettering";

function layer(over: Partial<Layer> = {}): Layer {
  return {
    id: "a",
    kind: "text",
    text: "oi",
    family: "Georgia, serif",
    size: 100,
    color: "#000000",
    align: "center",
    lineHeight: 1.1,
    tracking: 0,
    stroke: 0,
    strokeColor: "#ffffff",
    shadow: false,
    shadowBlur: 12,
    shadowX: 0,
    shadowY: 8,
    shadowColor: "#000000",
    box: false,
    boxColor: "#ffffff",
    boxPadding: 40,
    boxRadius: 24,
    x: 100,
    y: 100,
    rotation: 0,
    ...over,
  };
}

const size = { width: 200, height: 100 };

describe("hitsLayer", () => {
  it("pega o centro e recusa o que está fora", () => {
    const l = layer();
    expect(hitsLayer({ x: 100, y: 100 }, l, size)).toBe(true);
    expect(hitsLayer({ x: 199, y: 100 }, l, size)).toBe(true);
    expect(hitsLayer({ x: 201, y: 100 }, l, size)).toBe(false);
    expect(hitsLayer({ x: 100, y: 151 }, l, size)).toBe(false);
  });

  it("acompanha a rotação", () => {
    const reto = layer();
    const girado = layer({ rotation: 90 });
    // Ponto acima do centro: fora da camada deitada, dentro depois de girar.
    const ponto = { x: 100, y: 180 };
    expect(hitsLayer(ponto, reto, size)).toBe(false);
    expect(hitsLayer(ponto, girado, size)).toBe(true);
  });
});

describe("layerCorners", () => {
  it("gira em torno do próprio centro", () => {
    const cantos = layerCorners(layer({ rotation: 90 }), size);
    const xs = cantos.map((c) => Math.round(c.x));
    const ys = cantos.map((c) => Math.round(c.y));
    // Girado em 90°, a largura vira altura.
    expect(Math.max(...xs) - Math.min(...xs)).toBe(100);
    expect(Math.max(...ys) - Math.min(...ys)).toBe(200);
  });
});

describe("unionBounds", () => {
  it("abraça todas as camadas", () => {
    const a = layerCorners(layer({ x: 100, y: 100 }), size);
    const b = layerCorners(layer({ id: "b", x: 400, y: 300 }), size);
    expect(unionBounds([a, b])).toEqual({
      left: 0,
      top: 50,
      right: 500,
      bottom: 350,
    });
  });

  it("devolve nulo sem camada nenhuma", () => {
    expect(unionBounds([])).toBeNull();
  });
});

describe("topmostAt", () => {
  it("entrega a de cima quando duas se sobrepõem", () => {
    const baixo = layer({ id: "baixo" });
    const cima = layer({ id: "cima" });
    const sizes = new Map([
      ["baixo", size],
      ["cima", size],
    ]);
    expect(topmostAt({ x: 100, y: 100 }, [baixo, cima], sizes)?.id).toBe("cima");
    expect(topmostAt({ x: 900, y: 900 }, [baixo, cima], sizes)).toBeNull();
  });
});

describe("gestos de dois dedos", () => {
  it("mede distância e ângulo entre os dedos", () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(angle({ x: 0, y: 0 }, { x: 1, y: 0 })).toBe(0);
    expect(angle({ x: 0, y: 0 }, { x: 0, y: 1 })).toBe(90);
  });

  it("gira pelo caminho curto ao cruzar 180°", () => {
    expect(shortestTurn(179, -179)).toBe(2);
    expect(shortestTurn(-179, 179)).toBe(-2);
    expect(shortestTurn(10, 40)).toBe(30);
  });

  it("segura o valor no intervalo", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(99, 0, 10)).toBe(10);
  });
});
