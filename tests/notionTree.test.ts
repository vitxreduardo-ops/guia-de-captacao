import { describe, expect, it } from "vitest";
import { blocksToPlainText, buildTree, canMove, descendantIds, filterByTags, makeSnippet, pagePath, tagCounts, type PageMeta } from "@/lib/notionTree";

const p = (id: string, parent_id: string | null, position = 0): PageMeta => ({
  id, parent_id, title: id, icon: "", position, favorite: false, tags: [],
  archived_at: null, updated_at: "2026-01-01T00:00:00Z",
});

const pages = [p("a", null, 1), p("b", "a", 2), p("c", "a", 1), p("d", "c"), p("e", null, 0)];

describe("buildTree", () => {
  it("aninha por parent_id e ordena por position", () => {
    const tree = buildTree(pages);
    expect(tree.map((n) => n.id)).toEqual(["e", "a"]);
    expect(tree[1].children.map((n) => n.id)).toEqual(["c", "b"]);
    expect(tree[1].children[0].children.map((n) => n.id)).toEqual(["d"]);
  });
  it("órfão (pai inexistente) vai pra raiz", () => {
    expect(buildTree([p("x", "sumiu")]).map((n) => n.id)).toEqual(["x"]);
  });
});

describe("descendantIds", () => {
  it("devolve a subárvore toda", () => {
    expect(descendantIds(pages, "a").sort()).toEqual(["b", "c", "d"]);
  });
});

describe("canMove", () => {
  it("recusa mover para si mesmo ou para um descendente", () => {
    expect(canMove(pages, "a", "a")).toBe(false);
    expect(canMove(pages, "a", "d")).toBe(false);
  });
  it("aceita outro galho e a raiz", () => {
    expect(canMove(pages, "d", "e")).toBe(true);
    expect(canMove(pages, "d", null)).toBe(true);
  });
});

describe("blocksToPlainText", () => {
  it("junta texto de blocos e filhos", () => {
    const blocks = [
      { type: "paragraph", content: [{ type: "text", text: "olá " }, { type: "text", text: "mundo" }], children: [
        { type: "heading", content: [{ type: "text", text: "filho" }], children: [] },
      ] },
      { type: "bookmark", props: { url: "https://x.com", title: "Título" }, children: [] },
    ];
    expect(blocksToPlainText(blocks)).toBe("olá mundo\nfilho\nTítulo https://x.com");
  });
  it("lixo vira string vazia", () => {
    expect(blocksToPlainText(null)).toBe("");
    expect(blocksToPlainText("x")).toBe("");
  });
});

describe("pagePath", () => {
  it("vai da raiz até a página", () => {
    expect(pagePath(pages, "d").map((x) => x.id)).toEqual(["a", "c", "d"]);
  });
  it("página inexistente = vazio; ciclo não trava", () => {
    expect(pagePath(pages, "zzz")).toEqual([]);
    expect(pagePath([p("x", "y"), p("y", "x")], "x").length).toBe(2);
  });
});

describe("makeSnippet", () => {
  it("recorta em volta do termo, sem diferenciar maiúscula", () => {
    const t = "a".repeat(100) + " ARTIFACT novo " + "b".repeat(100);
    const s = makeSnippet(t, "artifact", 10);
    expect(s.startsWith("…")).toBe(true);
    expect(s.endsWith("…")).toBe(true);
    expect(s).toContain("ARTIFACT");
  });
  it("sem ocorrência devolve o começo", () => {
    expect(makeSnippet("oi mundo", "zzz")).toBe("oi mundo");
  });
});

describe("tags", () => {
  const t = (id: string, tags: string[]): PageMeta => ({ ...p(id, null), tags });
  const list = [t("1", ["Referência", "vídeo"]), t("2", ["referencias"]), t("3", ["Vídeos"]), t("4", [])];
  it("tagCounts junta grafias parecidas e ordena pelo uso", () => {
    const counts = tagCounts(list, new Map([["referencia", "Referência"], ["video", "vídeo"]]));
    expect(counts.map((c) => [c.tag, c.count])).toEqual([["Referência", 2], ["vídeo", 2]]);
  });
  it("filterByTags exige todas as tags; vazio devolve tudo", () => {
    expect(filterByTags(list, ["referencia"]).map((x) => x.id)).toEqual(["1", "2"]);
    expect(filterByTags(list, ["referencia", "video"]).map((x) => x.id)).toEqual(["1"]);
    expect(filterByTags(list, [])).toHaveLength(4);
  });
});
