import { describe, expect, it } from "vitest";
import { inicioDaSemana, listaParaIa, montarDestaques } from "@/lib/repertorioIa";
import type { Noticia } from "@/lib/repertorioTypes";

function noticia(n: number, extra: Partial<Noticia> = {}): Noticia {
  return {
    id: `id-${n}`,
    url: `https://portal.com.br/${n}`,
    titulo: `Título ${n}`,
    resumo: `Resumo ${n}`,
    publicadoEm: "2026-10-23T18:00:00Z",
    coletadoEm: "2026-10-26T09:00:00Z",
    guardada: false,
    lida: false,
    fonte: { id: "f", nome: n % 2 ? "GKPB" : "Propmark", tema: "Marketing" },
    ...extra,
  };
}

describe("inicioDaSemana", () => {
  it("volta pra segunda-feira", () => {
    expect(inicioDaSemana("2026-10-26")).toBe("2026-10-26"); // segunda
    expect(inicioDaSemana("2026-10-25")).toBe("2026-10-19"); // domingo
    expect(inicioDaSemana("2026-10-28")).toBe("2026-10-26"); // quarta
  });
});

describe("listaParaIa", () => {
  it("numera a partir de 1 com fonte, data, título e resumo", () => {
    const { texto, usadas } = listaParaIa([noticia(1), noticia(2)]);
    expect(usadas).toHaveLength(2);
    expect(texto).toBe("[1] GKPB · 2026-10-23\nTítulo 1\nResumo 1\n\n[2] Propmark · 2026-10-23\nTítulo 2\nResumo 2");
  });

  it("para antes do limite em vez de cortar uma notícia no meio", () => {
    const longa = (n: number) => noticia(n, { titulo: "T".repeat(400), resumo: "R ".repeat(400) });
    const { texto, usadas } = listaParaIa(Array.from({ length: 200 }, (_, i) => longa(i + 1)));
    expect(texto.length).toBeLessThanOrEqual(18_000);
    expect(usadas.length).toBeGreaterThan(10);
    expect(usadas.length).toBeLessThan(200);
    expect(texto.trim().endsWith("…")).toBe(true);
  });
});

describe("montarDestaques", () => {
  const usadas = [noticia(1), noticia(2), noticia(3)];

  it("troca os números pelas notícias e descarta número inexistente", () => {
    const conteudo = montarDestaques(
      {
        panorama: " Semana calma. ",
        destaques: [{ titulo: "A", fato: "Fato A", leitura: "Leitura A", fontes: [1, 9, 1] }],
        tendencias: [],
      },
      usadas
    );
    expect(conteudo.panorama).toBe("Semana calma.");
    expect(conteudo.destaques[0].noticias).toEqual([
      { id: "id-1", titulo: "Título 1", url: "https://portal.com.br/1", fonte: "GKPB" },
    ]);
  });

  it("tira destaque sem notícia válida que o sustente", () => {
    const conteudo = montarDestaques(
      {
        panorama: "",
        destaques: [
          { titulo: "Inventado", fato: "Sem fonte", leitura: "", fontes: [42] },
          { titulo: "Ok", fato: "Com fonte", leitura: "", fontes: [2] },
        ],
        tendencias: [],
      },
      usadas
    );
    expect(conteudo.destaques.map((d) => d.titulo)).toEqual(["Ok"]);
  });

  it("só aceita tendência com duas notícias diferentes", () => {
    const conteudo = montarDestaques(
      {
        panorama: "",
        destaques: [],
        tendencias: [
          { nome: "Uma só", explicacao: "", fontes: [1] },
          { nome: "Duas", explicacao: "", fontes: [1, 3] },
        ],
      },
      usadas
    );
    expect(conteudo.tendencias.map((t) => t.nome)).toEqual(["Duas"]);
  });

  it("aguenta resposta quebrada sem lançar", () => {
    expect(montarDestaques({} as never, usadas)).toEqual({ panorama: "", destaques: [], tendencias: [] });
  });
});
