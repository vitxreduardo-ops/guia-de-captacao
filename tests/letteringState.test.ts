import { describe, expect, it } from "vitest";
import type { Layer } from "@/lib/lettering";
import {
  desfazer,
  despachar,
  encerrarGesto,
  historyOf,
  podeDesfazer,
  podeRefazer,
  reduce,
  refazer,
  type EditorState,
} from "@/lib/letteringState";

function camada(id: string, over: Partial<Layer> = {}): Layer {
  return {
    id,
    kind: "text",
    text: id,
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

const inicial: EditorState = { layers: [camada("a")], selectedId: "a" };

describe("reduce", () => {
  it("adiciona já escolhendo a camada nova", () => {
    const s = reduce(inicial, { type: "adicionar", layer: camada("b") });
    expect(s.layers.map((l) => l.id)).toEqual(["a", "b"]);
    expect(s.selectedId).toBe("b");
  });

  it("altera só a camada pedida", () => {
    const dois = reduce(inicial, { type: "adicionar", layer: camada("b") });
    const s = reduce(dois, { type: "alterar", id: "a", patch: { x: 10 } });
    expect(s.layers.find((l) => l.id === "a")!.x).toBe(10);
    expect(s.layers.find((l) => l.id === "b")!.x).toBe(540);
  });

  it("ao remover a escolhida, escolhe a última que sobrou", () => {
    const dois = reduce(inicial, { type: "adicionar", layer: camada("b") });
    const s = reduce(dois, { type: "remover", id: "b" });
    expect(s.selectedId).toBe("a");
  });

  it("remover a última deixa sem escolha", () => {
    const s = reduce(inicial, { type: "remover", id: "a" });
    expect(s.layers).toEqual([]);
    expect(s.selectedId).toBeNull();
  });

  it("remover outra não muda a escolha", () => {
    const dois = reduce(inicial, { type: "adicionar", layer: camada("b") });
    const s = reduce(dois, { type: "remover", id: "a" });
    expect(s.selectedId).toBe("b");
  });

  it("reordena", () => {
    const dois = reduce(inicial, { type: "adicionar", layer: camada("b") });
    const s = reduce(dois, { type: "reordenar", de: 0, para: 1 });
    expect(s.layers.map((l) => l.id)).toEqual(["b", "a"]);
  });
});

describe("histórico", () => {
  it("começa sem nada pra desfazer", () => {
    const h = historyOf(inicial);
    expect(podeDesfazer(h)).toBe(false);
    expect(podeRefazer(h)).toBe(false);
  });

  it("desfaz e refaz um passo", () => {
    let h = historyOf(inicial);
    h = despachar(h, { type: "adicionar", layer: camada("b") });
    expect(h.presente.layers).toHaveLength(2);

    h = desfazer(h);
    expect(h.presente.layers).toHaveLength(1);
    expect(podeRefazer(h)).toBe(true);

    h = refazer(h);
    expect(h.presente.layers).toHaveLength(2);
  });

  it("junta o arrasto inteiro num passo só", () => {
    let h = historyOf(inicial);
    for (const x of [100, 200, 300]) {
      h = despachar(h, {
        type: "alterar",
        id: "a",
        patch: { x },
        coalesce: "mover:a",
      });
    }
    expect(h.presente.layers[0].x).toBe(300);

    h = desfazer(h);
    // Volta pro começo do arrasto, não pro pixel anterior.
    expect(h.presente.layers[0].x).toBe(540);
  });

  it("gesto encerrado começa um passo novo", () => {
    let h = historyOf(inicial);
    h = despachar(h, { type: "alterar", id: "a", patch: { x: 100 }, coalesce: "mover:a" });
    h = encerrarGesto(h);
    h = despachar(h, { type: "alterar", id: "a", patch: { x: 200 }, coalesce: "mover:a" });

    h = desfazer(h);
    expect(h.presente.layers[0].x).toBe(100);
    h = desfazer(h);
    expect(h.presente.layers[0].x).toBe(540);
  });

  it("gestos diferentes não se misturam", () => {
    let h = historyOf(inicial);
    h = despachar(h, { type: "alterar", id: "a", patch: { x: 100 }, coalesce: "mover:a" });
    h = despachar(h, { type: "alterar", id: "a", patch: { rotation: 30 }, coalesce: "girar:a" });

    h = desfazer(h);
    expect(h.presente.layers[0].rotation).toBe(0);
    expect(h.presente.layers[0].x).toBe(100);
  });

  it("escolher camada não vira passo do histórico", () => {
    let h = historyOf(inicial);
    h = despachar(h, { type: "adicionar", layer: camada("b") });
    h = despachar(h, { type: "selecionar", id: "a" });
    expect(podeDesfazer(h)).toBe(true);

    h = desfazer(h);
    // Um desfazer só: volta a adição, sem gastar um passo com a escolha.
    expect(h.presente.layers).toHaveLength(1);
    expect(podeDesfazer(h)).toBe(false);
  });

  it("um passo novo apaga o que havia pra refazer", () => {
    let h = historyOf(inicial);
    h = despachar(h, { type: "adicionar", layer: camada("b") });
    h = desfazer(h);
    expect(podeRefazer(h)).toBe(true);

    h = despachar(h, { type: "adicionar", layer: camada("c") });
    expect(podeRefazer(h)).toBe(false);
  });

  it("desfazer devolve a camada removida", () => {
    let h = historyOf(inicial);
    h = despachar(h, { type: "remover", id: "a" });
    expect(h.presente.layers).toEqual([]);

    h = desfazer(h);
    expect(h.presente.layers.map((l) => l.id)).toEqual(["a"]);
    expect(h.presente.selectedId).toBe("a");
  });

  it("não empilha passo quando nada muda", () => {
    let h = historyOf(inicial);
    h = despachar(h, { type: "reordenar", de: 0, para: 0 });
    expect(podeDesfazer(h)).toBe(false);
  });
});

describe("duplicar", () => {
  it("põe a cópia logo acima da original e já a escolhe", () => {
    const dois = reduce(inicial, { type: "adicionar", layer: camada("b") });
    const s = reduce(dois, {
      type: "duplicar",
      id: "a",
      novoId: "copia",
      desloca: 24,
    });
    expect(s.layers.map((l) => l.id)).toEqual(["a", "copia", "b"]);
    expect(s.selectedId).toBe("copia");
  });

  it("copia o estilo inteiro e desloca a posição", () => {
    const base: EditorState = {
      layers: [camada("a", { color: "#ff0000", rotation: 30, x: 100, y: 200 })],
      selectedId: "a",
    };
    const s = reduce(base, {
      type: "duplicar",
      id: "a",
      novoId: "copia",
      desloca: 24,
    });
    const copia = s.layers[1];
    expect(copia.color).toBe("#ff0000");
    expect(copia.rotation).toBe(30);
    expect(copia).toMatchObject({ x: 124, y: 224 });
  });

  it("ignora id que não existe", () => {
    const s = reduce(inicial, {
      type: "duplicar",
      id: "sumiu",
      novoId: "copia",
      desloca: 24,
    });
    expect(s).toBe(inicial);
  });
});

describe("toques que não mudam nada", () => {
  it("escolher a mesma camada devolve o mesmo estado", () => {
    expect(reduce(inicial, { type: "selecionar", id: "a" })).toBe(inicial);
  });

  it("desmarcar quando já não havia escolha devolve o mesmo estado", () => {
    const vazio: EditorState = { layers: [camada("a")], selectedId: null };
    expect(reduce(vazio, { type: "selecionar", id: null })).toBe(vazio);
  });
});
