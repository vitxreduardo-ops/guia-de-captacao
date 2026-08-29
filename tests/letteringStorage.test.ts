import { describe, expect, it } from "vitest";
import type { Layer } from "@/lib/lettering";
import {
  desserializar,
  fontesFaltando,
  serializar,
} from "@/lib/letteringStorage";
import type { EditorState } from "@/lib/letteringState";

function camada(id: string, over: Partial<Layer> = {}): Layer {
  return {
    id,
    kind: "text",
    text: `texto ${id}`,
    family: "Georgia, serif",
    size: 120,
    color: "#111111",
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
    x: 540,
    y: 360,
    rotation: 0,
    ...over,
  };
}

describe("rascunho", () => {
  it("vai e volta inteiro", () => {
    const state: EditorState = {
      layers: [camada("a", { x: 12, rotation: 45 }), camada("b")],
      selectedId: "b",
    };
    expect(desserializar(serializar(state))).toEqual(state);
  });

  it("descarta formato de versão diferente", () => {
    const antigo = JSON.stringify({ versao: 0, layers: [camada("a")] });
    expect(desserializar(antigo)).toBeNull();
  });

  it("descarta lixo sem quebrar", () => {
    expect(desserializar("{isso não é json")).toBeNull();
    expect(desserializar(null)).toBeNull();
    expect(desserializar(JSON.stringify({ versao: 1, layers: [] }))).toBeNull();
  });

  it("conserta escolha apontando pra camada que não existe mais", () => {
    const texto = JSON.stringify({
      versao: 1,
      layers: [camada("a")],
      selectedId: "sumiu",
    });
    expect(desserializar(texto)!.selectedId).toBe("a");
  });

  it("joga fora camada sem forma de camada", () => {
    const texto = JSON.stringify({
      versao: 1,
      layers: [camada("a"), { id: 42 }, null],
      selectedId: "a",
    });
    expect(desserializar(texto)!.layers.map((l) => l.id)).toEqual(["a"]);
  });
});

describe("fontesFaltando", () => {
  it("aponta a fonte do cliente que não voltou com o rascunho", () => {
    const layers = [
      camada("a", { family: '"lettering-Bootzy-1"' }),
      camada("b", { family: "Georgia, serif" }),
    ];
    expect(fontesFaltando(layers, ["Georgia, serif"])).toEqual([
      '"lettering-Bootzy-1"',
    ]);
  });

  it("não reclama quando está tudo disponível", () => {
    expect(fontesFaltando([camada("a")], ["Georgia, serif"])).toEqual([]);
  });

  it("ignora fonte de sistema e de emoji, que nunca somem", () => {
    const layers = [
      camada("a", { family: '"Apple Color Emoji", sans-serif' }),
      camada("b", { family: "Impact, sans-serif" }),
    ];
    expect(fontesFaltando(layers, [])).toEqual([]);
  });
});
