import { describe, expect, it } from "vitest";
import { verificarIntocado, type RoteiroOrganizado } from "@/lib/roteiroTypes";

const original = `CENA 1:
Oi, eu sou a Ana   e cuido do seu sorriso.
[close na fachada]

CENA 2 - Fala: Agende pelo link da bio.
Obs: gravar de manhã`;

function organizado(script1: string): RoteiroOrganizado {
  return {
    videos: [
      {
        titulo: "Apresentação",
        cenas: [
          {
            script: script1,
            descricao: ["close na fachada"],
            hooks_alternativos: [],
            ctas_alternativos: [],
          },
          {
            script: "Agende pelo link da bio.",
            descricao: [],
            hooks_alternativos: [],
            ctas_alternativos: [],
          },
        ],
        notas_producao: ["gravar de manhã"],
      },
    ],
  };
}

describe("verificarIntocado", () => {
  it("texto só recortado passa; quebra de linha e espaço não contam", () => {
    const r = verificarIntocado(original, organizado("Oi, eu sou a Ana e cuido do\nseu sorriso."));
    expect(r.alterados).toEqual([]);
  });

  it("palavra trocada vai pra alterados", () => {
    const r = verificarIntocado(original, organizado("Oi, eu sou a Ana e cuido do seu sorrisão."));
    expect(r.alterados).toEqual(["Oi, eu sou a Ana e cuido do seu sorrisão."]);
  });

  it("marcadores descartados aparecem em deFora; pontuação solta não", () => {
    const r = verificarIntocado(original, organizado("Oi, eu sou a Ana e cuido do seu sorriso."));
    expect(r.deFora).toEqual(["CENA 1:", "CENA 2 - Fala:", "Obs:"]);
  });
});
