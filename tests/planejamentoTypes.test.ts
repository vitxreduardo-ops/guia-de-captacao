import { describe, expect, it } from "vitest";
import { parseContent, passosDa, chaveMarcacao } from "@/lib/planejamentoTypes";

const base = new Date(2026, 10, 15);

describe("parseContent", () => {
  it("descarta entrega com dia fora do mês e numera ids pela ordem", () => {
    const c = parseContent(
      {
        ano: 2026,
        mes: 11,
        entregas: [
          { dia: 31, tipo: "feed", titulo: "Não existe" },
          { dia: 4, tipo: "feed", titulo: "B" },
          { dia: 3, tipo: "stories", titulo: "A" },
          { dia: 3, tipo: "stories", titulo: "A2" },
        ],
      },
      base,
    );
    expect(c.entregas.map((e) => e.titulo)).toEqual(["A", "A2", "B"]);
    expect(new Set(c.entregas.map((e) => e.id)).size).toBe(3);
  });

  it("formato antigo de 5 abas vira planejamento sem entregas", () => {
    const c = parseContent({ estrategia: { resumo: "x" }, calendario: { posts: [] } }, base);
    expect(c.entregas).toEqual([]);
    expect(c.ano).toBe(2026);
    expect(c.mes).toBe(11);
  });

  it("sem ano e mês usa a data de reserva", () => {
    expect(parseContent({}, new Date(2027, 0, 2)).mes).toBe(1);
  });

  it("só aceita referência http(s)", () => {
    const c = parseContent(
      { ano: 2026, mes: 11, entregas: [{ dia: 2, tipo: "stories", titulo: "R", referencias: [{ titulo: "a", url: "javascript:alert(1)" }, { titulo: "b", url: "https://x.com/y" }] }] },
      base,
    );
    expect(c.entregas[0].referencias.map((r) => r.url)).toEqual(["https://x.com/y"]);
  });

  it("calcula a semana pelo dia quando a IA não manda", () => {
    const c = parseContent(
      { ano: 2026, mes: 11, semanas: [{ numero: 1, inicio: 2, fim: 8 }, { numero: 2, inicio: 9, fim: 15 }], entregas: [{ dia: 11, tipo: "feed", titulo: "x" }] },
      base,
    );
    expect(c.entregas[0].semana).toBe(2);
  });
});

describe("passosDa", () => {
  const e = (x: object) => parseContent({ ano: 2026, mes: 11, entregas: [{ dia: 5, titulo: "t", ...x }] }, base).entregas[0];

  it("stories com fala: Gravei e Postei", () => {
    expect(passosDa(e({ tipo: "stories", fala: "oi" })).map((p) => p.label)).toEqual(["Gravei", "Postei"]);
  });
  it("stories sem fala nem telas: Fotografei", () => {
    expect(passosDa(e({ tipo: "stories" }))[0].label).toBe("Fotografei");
  });
  it("feed carrossel: Separei as fotos", () => {
    expect(passosDa(e({ tipo: "feed", formato: "Carrossel com 4 fotos" }))[0].label).toBe("Separei as fotos");
  });
  it("feed card: Revisei a legenda", () => {
    expect(passosDa(e({ tipo: "feed", card: "x" }))[0].label).toBe("Revisei a legenda");
  });
  it("chave de marcação junta entrega e passo", () => {
    expect(chaveMarcacao("e2", "p")).toBe("e2:p");
  });
});
