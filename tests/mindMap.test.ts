import { describe, expect, it } from "vitest";
import {
  clearOffsets, flipIfCrossed, isDark, setBoxColorAll, moveNode, preorder, revealUpTo, addChild, addSibling, findNode, layout, newMap, parseMap, removeNode, updateNode,
  type MindNode,
} from "@/lib/mindMap";

const leaf = (id: string, text = id): MindNode => ({ id, text, children: [] });
const tree: MindNode = {
  id: "r", text: "Raiz",
  children: [
    { id: "a", text: "A", children: [leaf("a1"), leaf("a2")] },
    leaf("b"), leaf("c"),
  ],
};

describe("edição da árvore", () => {
  it("adiciona filho e reabre o ramo fechado", () => {
    const fechado = updateNode(tree, "a", { collapsed: true });
    const next = addChild(fechado, "a", leaf("a3"));
    expect(findNode(next, "a")?.children.map((c) => c.id)).toEqual(["a1", "a2", "a3"]);
    expect(findNode(next, "a")?.collapsed).toBe(false);
  });

  it("irmão entra logo abaixo; irmão da raiz vira filho", () => {
    const next = addSibling(tree, "a1", leaf("x"));
    expect(findNode(next, "a")?.children.map((c) => c.id)).toEqual(["a1", "x", "a2"]);
    expect(addSibling(tree, "r", leaf("y")).children.at(-1)?.id).toBe("y");
  });

  it("remove o nó com os filhos, mas nunca a raiz", () => {
    expect(findNode(removeNode(tree, "a"), "a1")).toBeNull();
    expect(removeNode(tree, "r")).toBe(tree);
  });

  it("não mexe no que não mudou", () => {
    expect(updateNode(tree, "zzz", { text: "x" })).toBe(tree);
  });
});

describe("parseMap", () => {
  it("descarta lixo e limita o texto", () => {
    const m = parseMap({ id: "r", text: "a".repeat(999), color: "red", children: [null, 3, { text: "ok" }] });
    expect(m.text).toHaveLength(200);
    expect(m.color).toBeUndefined();
    expect(m.children).toHaveLength(1);
    expect(m.children[0].id).toBeTruthy();
  });
  it("entrada inválida vira mapa vazio", () => {
    expect(parseMap("x").children).toEqual([]);
  });
});

describe("modelos", () => {
  it("em branco é só o centro; funil já vem com topo, meio e fundo", () => {
    expect(newMap("X").children).toEqual([]);
    const f = newMap("X", "funil");
    expect(f.text).toBe("X");
    expect(f.children.map((c) => c.text)).toEqual(
      expect.arrayContaining(["Topo · Atração", "Meio · Consideração", "Fundo · Conversão"])
    );
    const ids = JSON.stringify(f).match(/"id":"[^"]+"/g)!;
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("layout", () => {
  it("divide os ramos: maior metade à direita, e cada lado fica de seu lado", () => {
    const { items } = layout(tree);
    const side = (id: string) => items.find((i) => i.node.id === id)!.side;
    expect([side("a"), side("b"), side("c")]).toEqual([1, 1, -1]);
    expect(side("a1")).toBe(1);
  });

  it("pai fica centrado nos filhos e ramo fechado ocupa uma linha só", () => {
    const y = (m: MindNode, id: string) => layout(m).items.find((i) => i.node.id === id)!.y;
    expect(y(tree, "a")).toBeCloseTo((y(tree, "a1") + y(tree, "a2")) / 2);
    const fechado = updateNode(tree, "a", { collapsed: true });
    expect(layout(fechado).items.find((i) => i.node.id === "a1")).toBeUndefined();
  });

  it("nenhum texto da mesma coluna se sobrepõe", () => {
    const ys = layout(newMap("T")).items.filter((i) => i.side === 1).map((i) => i.y);
    expect(new Set(ys).size).toBe(ys.length);
  });
});

describe("moveNode", () => {
  it("vira filho, ou entra antes/depois do alvo", () => {
    expect(findNode(moveNode(tree, "b", "a", "child"), "a")?.children.map((c) => c.id)).toEqual(["a1", "a2", "b"]);
    expect(moveNode(tree, "c", "a", "before").children.map((c) => c.id)).toEqual(["c", "a", "b"]);
    expect(moveNode(tree, "a", "c", "after").children.map((c) => c.id)).toEqual(["b", "c", "a"]);
  });
  it("não entra no próprio ramo nem mexe na raiz", () => {
    expect(moveNode(tree, "a", "a1", "child")).toBe(tree);
    expect(moveNode(tree, "r", "a", "child")).toBe(tree);
  });
  it("soltar 'ao lado' da raiz vira filho dela", () => {
    expect(moveNode(tree, "a1", "r", "after").children.map((c) => c.id)).toEqual(["a", "b", "c", "a1"]);
  });
});

describe("apresentação passo a passo", () => {
  it("revela em pré-ordem, tudo aberto", () => {
    expect(preorder(tree)).toEqual(["r", "a", "a1", "a2", "b", "c"]);
    const ids = (n: MindNode): string[] => [n.id, ...n.children.flatMap(ids)];
    expect(ids(revealUpTo(tree, 0))).toEqual(["r"]);
    expect(ids(revealUpTo(tree, 2))).toEqual(["r", "a", "a1"]);
    expect(ids(revealUpTo(tree, 4))).toEqual(["r", "a", "a1", "a2", "b"]);
    expect(ids(revealUpTo(updateNode(tree, "a", { collapsed: true }), 3))).toEqual(["r", "a", "a1", "a2"]);
  });
});

describe("campos novos", () => {
  it("aceita só link http(s) e limita nota", () => {
    const m = parseMap({ text: "x", icon: "🔥", note: "n".repeat(5000), link: "javascript:alert(1)" });
    expect(m.icon).toBe("🔥");
    expect(m.note).toHaveLength(2000);
    expect(m.link).toBeUndefined();
    expect(parseMap({ text: "x", link: "https://a.com" }).link).toBe("https://a.com");
  });
  it("cor de um nó vale pra ele e pros filhos", () => {
    const t = updateNode(tree, "a1", { color: "#123456" });
    const l = layout(updateNode(t, "a", { color: "#abcdef" }));
    const c = (id: string) => l.items.find((i) => i.node.id === id)!.color;
    expect(c("a")).toBe("#abcdef");
    expect(c("a2")).toBe("#abcdef");
    expect(c("a1")).toBe("#123456");
  });
});

describe("posição livre", () => {
  const y = (m: MindNode, id: string) => layout(m).items.find((i) => i.node.id === id)!;
  it("mover um nó leva os filhos junto, sem mexer nos outros", () => {
    const moved = updateNode(tree, "a", { ox: 100, oy: -50 });
    for (const id of ["a", "a1", "a2"]) {
      expect(y(moved, id).x).toBe(y(tree, id).x + 100);
      expect(y(moved, id).y).toBe(y(tree, id).y - 50);
    }
    expect(y(moved, "b").x).toBe(y(tree, "b").x);
  });
  it("deslocamento do filho soma ao do pai", () => {
    const m = updateNode(updateNode(tree, "a", { ox: 100 }), "a1", { ox: 10 });
    expect(y(m, "a1").x).toBe(y(tree, "a1").x + 110);
    expect(y(m, "a2").x).toBe(y(tree, "a2").x + 100);
  });
  it("reorganizar zera tudo; parse limita valores", () => {
    const m = updateNode(updateNode(tree, "a", { ox: 100 }), "a1", { oy: 7 });
    expect(JSON.stringify(clearOffsets(m))).not.toMatch(/"o[xy]"/);
    expect(parseMap({ text: "x", ox: 1e9, oy: "z" })).toMatchObject({ ox: 20000 });
    expect(parseMap({ text: "x", oy: "z" }).oy).toBeUndefined();
  });
});

describe("fundo", () => {
  it("parse aceita só cor hex e limita a opacidade", () => {
    expect(parseMap({ text: "x", bg: "#FFF6E3", dotOpacity: 7 })).toMatchObject({ bg: "#fff6e3", dotOpacity: 1 });
    expect(parseMap({ text: "x", bg: "red", dotOpacity: "a" }).bg).toBeUndefined();
  });
  it("detecta fundo escuro", () => {
    expect(isDark("#2b3236")).toBe(true);
    expect(isDark("#fff6e3")).toBe(false);
  });
});

describe("caixa", () => {
  it("parse aceita box e cor hex", () => {
    expect(parseMap({ text: "x", box: true, boxColor: "#ABCDEF" })).toMatchObject({ box: true, boxColor: "#abcdef" });
    expect(parseMap({ text: "x", box: "sim", boxColor: "azul" })).not.toHaveProperty("box");
  });
  it("caixa aumenta a largura do nó", () => {
    const w = (m: MindNode) => layout(m).items.find((i) => i.node.id === "b")!.w;
    expect(w(updateNode(tree, "b", { box: true }))).toBe(w(tree) + 28);
  });
  it("pintar todas só mexe nas caixas e na raiz", () => {
    const m = setBoxColorAll(updateNode(tree, "b", { box: true }), "#112233");
    expect(findNode(m, "b")?.boxColor).toBe("#112233");
    expect(m.boxColor).toBe("#112233");
    expect(findNode(m, "c")?.boxColor).toBeUndefined();
    expect(findNode(setBoxColorAll(m, undefined), "b")?.boxColor).toBeUndefined();
  });
});

describe("arrastar ramo pro outro lado", () => {
  const big: MindNode = updateNode(tree, "c", { ox: 0 });
  const withKid = addChild(big, "c", { id: "c1", text: "filho", children: [] });
  const at = (m: MindNode, id: string) => layout(m).items.find((i) => i.node.id === id)!;

  it("ramo que cruza a raiz vira pro novo lado e fica onde foi solto", () => {
    const dragged = updateNode(withKid, "c", { ox: 700 });
    const before = at(dragged, "c");
    expect(before.side).toBe(-1);
    const next = flipIfCrossed(dragged, "c");
    const after = at(next, "c");
    expect(after.side).toBe(1);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
    expect(at(next, "c1").x).toBeGreaterThan(after.x); // filhos abrem pra direita
  });
  it("sem cruzar, ou nó que não é ramo, nada muda; voltar desvira", () => {
    const near = updateNode(withKid, "c", { ox: -50 });
    expect(flipIfCrossed(near, "c")).toBe(near);
    const deep = updateNode(withKid, "c1", { ox: 900 });
    expect(flipIfCrossed(deep, "c1")).toBe(deep);
    const flipped = flipIfCrossed(updateNode(withKid, "c", { ox: 700 }), "c");
    const back = flipIfCrossed(updateNode(flipped, "c", { ox: (flipped.children[2].ox ?? 0) - 900 }), "c");
    expect(at(back, "c").side).toBe(-1);
  });
  it("reorganizar tira o lado escolhido", () => {
    const f = flipIfCrossed(updateNode(withKid, "c", { ox: 700 }), "c");
    expect(JSON.stringify(clearOffsets(f))).not.toMatch(/"side"/);
  });
});
