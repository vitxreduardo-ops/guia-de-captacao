import { describe, expect, it } from "vitest";
import {
  SECTION_KINDS,
  blockTone,
  isEmpty,
  isNumbered,
  parseSections,
  sectionNumber,
  visibleSections,
  type BudgetSection,
} from "@/lib/budgetSections";

/** O que a migração 0051 produz para um orçamento antigo típico: capa, sobre
 *  com destaques, pacotes e FAQ preenchidos; as quatro seções novas desligadas. */
const backfilled = [
  {
    kind: "cover",
    enabled: true,
    data: {
      eyebrow: "PROPOSTA CRIATIVA · 2026",
      title: "Padaria Aurora",
      subtitle: "Uma direção audiovisual desenhada para transformar atenção.",
      cta: "Conhecer a proposta",
      videoUrl: "",
    },
  },
  {
    kind: "about",
    enabled: true,
    data: {
      eyebrow: "NOSSA LEITURA",
      title: "Sua marca não precisa apenas aparecer.",
      subtitle: "Sobre o estúdio",
      text: "A gente entra na operação para entender o que a marca comunica.",
      items: ["Direção criativa", "Produção audiovisual"],
      statNumber: "",
      statCaption: "",
    },
  },
  {
    kind: "portfolio",
    enabled: false,
    data: { eyebrow: "TRABALHOS SELECIONADOS", title: "", subtitle: "", projects: [] },
  },
  { kind: "logos", enabled: false, data: { eyebrow: "QUEM JÁ CONFIA", title: "", logos: [] } },
  { kind: "package1", enabled: false, data: { eyebrow: "", title: "", subtitle: "", items: [] } },
  { kind: "package1Extra", enabled: false, data: { eyebrow: "", title: "", subtitle: "", items: [] } },
  { kind: "package2Perks", enabled: false, data: { eyebrow: "", title: "", subtitle: "", items: [] } },
  { kind: "strategy", enabled: false, data: { eyebrow: "", title: "", subtitle: "", items: [] } },
  {
    kind: "pricing",
    enabled: true,
    data: {
      eyebrow: "INVESTIMENTO",
      title: "O que você recebe",
      subtitle: "",
      cta: "Escolher este pacote",
      packages: [
        {
          name: "START",
          price: 2400,
          subtitle: "",
          description: "",
          // Como o backfill copia `features` cru, a linha vazia do split chega até aqui.
          features: ["Direção criativa", "", "Captação mensal"],
          featured: false,
        },
      ],
    },
  },
  {
    kind: "faq",
    enabled: true,
    data: {
      eyebrow: "DÚVIDAS FREQUENTES",
      title: "Perguntas frequentes",
      items: [{ question: "Qual o prazo mínimo?", answer: "Três meses." }],
    },
  },
  {
    kind: "footer",
    enabled: true,
    data: { phrase: "", instagram: "", youtube: "", email: "", phone: "11999999999" },
  },
];

describe("parseSections", () => {
  it("devolve sempre as 11 seções na ordem canônica", () => {
    expect(parseSections(backfilled).map((s) => s.kind)).toEqual([
      ...SECTION_KINDS,
    ]);
  });

  it("preserva o conteúdo que a migração copiou", () => {
    const sections = parseSections(backfilled);
    const about = sections[1];
    expect(about.kind).toBe("about");
    if (about.kind !== "about") throw new Error("kind inesperado");
    expect(about.data.title).toBe("Sua marca não precisa apenas aparecer.");
    expect(about.data.subtitle).toBe("Sobre o estúdio");
    expect(about.data.items).toHaveLength(2);
  });

  it("descarta a linha vazia que o split de features deixa", () => {
    const pricing = parseSections(backfilled)[8];
    if (pricing.kind !== "pricing") throw new Error("kind inesperado");
    expect(pricing.data.packages[0].features).toEqual([
      "Direção criativa",
      "Captação mensal",
    ]);
    expect(pricing.data.packages[0].price).toBe(2400);
  });

  it("completa um orçamento sem a coluna preenchida, tudo desligado", () => {
    const sections = parseSections([]);
    expect(sections).toHaveLength(11);
    expect(sections.every((s) => !s.enabled)).toBe(true);
  });

  it("não quebra com jsonb corrompido", () => {
    for (const lixo of [null, "texto", 42, [{ kind: "inexistente" }], [null]]) {
      expect(parseSections(lixo)).toHaveLength(11);
    }
  });

  it("joga fora logo sem imagem e pergunta sem texto", () => {
    const sections = parseSections([
      { kind: "logos", enabled: true, data: { logos: [{ name: "A", url: "" }, { name: "B", url: "/b.svg" }] } },
      { kind: "faq", enabled: true, data: { items: [{ question: "  ", answer: "x" }] } },
    ]);
    const logos = sections[3];
    const faq = sections[9];
    if (logos.kind !== "logos" || faq.kind !== "faq") throw new Error("kind inesperado");
    expect(logos.data.logos).toEqual([{ name: "B", url: "/b.svg" }]);
    expect(faq.data.items).toEqual([]);
  });
});

describe("isEmpty", () => {
  it("considera vazia a seção ligada mas sem conteúdo", () => {
    const sections = parseSections([]);
    for (const section of sections) {
      // Capa e rodapé sempre aparecem: uma abre e o outro fecha a página.
      const sempreVisivel = section.kind === "cover" || section.kind === "footer";
      expect(isEmpty(section)).toBe(!sempreVisivel);
    }
  });

  it("mantém a capa de uma proposta sem nome de cliente", () => {
    // Regressão real: o orçamento "teste" em produção tem client_name e
    // hero_title1 vazios, e o hero renderizava assim mesmo.
    const [capa] = parseSections([
      { kind: "cover", enabled: true, data: { subtitle: "só o subtítulo" } },
    ]);
    expect(isEmpty(capa)).toBe(false);
  });
});

describe("visibleSections", () => {
  it("é o que o cliente vê: ligada e não vazia", () => {
    expect(visibleSections(parseSections(backfilled)).map((s) => s.kind)).toEqual([
      "cover",
      "about",
      "pricing",
      "faq",
      "footer",
    ]);
  });

  it("uma seção ligada e vazia não aparece nem consome número", () => {
    const sections = parseSections(backfilled).map((s) =>
      s.kind === "logos" ? { ...s, enabled: true } : s
    ) as BudgetSection[];

    const visiveis = visibleSections(sections);
    expect(visiveis.map((s) => s.kind)).not.toContain("logos");
    // A FAQ continua sendo a quarta: ligar uma seção vazia não empurra número.
    expect(sectionNumber(visiveis.findIndex((s) => s.kind === "faq"))).toBe("04");
  });

  it("mantém a alternância de cor que a página pública já tinha", () => {
    const tons = visibleSections(parseSections(backfilled)).map((_, i) =>
      blockTone(i).isDark
    );
    expect(tons).toEqual([true, false, true, false, true]);
  });
});

describe("isNumbered", () => {
  it("numera o miolo e deixa capa e rodapé de fora", () => {
    const numeradas = parseSections(backfilled).filter(isNumbered).map((s) => s.kind);
    expect(numeradas).not.toContain("cover");
    expect(numeradas).not.toContain("footer");
    expect(numeradas).toHaveLength(SECTION_KINDS.length - 2);
  });

  it("dá 01 à primeira seção depois da capa", () => {
    // É o cálculo que BudgetSections faz para montar a página.
    const visiveis = visibleSections(parseSections(backfilled));
    const numeros = visiveis.map((_, i) =>
      sectionNumber(visiveis.slice(0, i).filter(isNumbered).length)
    );
    // capa, sobre, pacotes, faq, rodapé
    expect(visiveis.map((s) => s.kind)).toEqual([
      "cover", "about", "pricing", "faq", "footer",
    ]);
    expect(numeros[1]).toBe("01");
    expect(numeros[2]).toBe("02");
    expect(numeros[3]).toBe("03");
  });
});
