import { describe, expect, it } from "vitest";
import {
  agruparPorDia,
  diaDe,
  haQuanto,
  lerPagina,
  lerVisao,
  rotuloDoDia,
  termosDaBusca,
} from "@/lib/repertorioTypes";

describe("diaDe", () => {
  it("usa o fuso de Brasília, não o UTC do servidor", () => {
    // 01:30 UTC do dia 26 ainda é noite do dia 25 aqui.
    expect(diaDe("2026-10-26T01:30:00Z")).toBe("2026-10-25");
    expect(diaDe("2026-10-26T12:00:00Z")).toBe("2026-10-26");
  });
});

describe("rotuloDoDia", () => {
  it("chama hoje e ontem pelo nome", () => {
    expect(rotuloDoDia("2026-10-26", "2026-10-26")).toBe("Hoje");
    expect(rotuloDoDia("2026-10-25", "2026-10-26")).toBe("Ontem");
  });

  it("vira ontem na virada do mês", () => {
    expect(rotuloDoDia("2026-10-31", "2026-11-01")).toBe("Ontem");
  });

  it("mostra a data nos outros dias, com ano só se for outro", () => {
    expect(rotuloDoDia("2026-10-20", "2026-10-26")).toMatch(/^20 de out/);
    expect(rotuloDoDia("2025-12-30", "2026-01-05")).toMatch(/2025/);
  });
});

describe("agruparPorDia", () => {
  it("agrupa em ordem e usa a coleta quando falta a data do feed", () => {
    const grupos = agruparPorDia([
      { publicadoEm: "2026-10-26T12:00:00Z", coletadoEm: "2026-10-26T13:00:00Z" },
      { publicadoEm: null, coletadoEm: "2026-10-26T09:00:00Z" },
      { publicadoEm: "2026-10-24T15:00:00Z", coletadoEm: "2026-10-26T09:00:00Z" },
    ]);
    expect(grupos.map((g) => [g.dia, g.noticias.length])).toEqual([
      ["2026-10-26", 2],
      ["2026-10-24", 1],
    ]);
  });
});

describe("termosDaBusca", () => {
  it("tira o que mudaria o filtro e palavras de uma letra", () => {
    expect(termosDaBusca("retail, (media)* a %IA")).toEqual(["retail", "media", "IA"]);
  });

  it("limita a cinco termos e aceita vazio", () => {
    expect(termosDaBusca("um dois tres quatro cinco seis")).toHaveLength(5);
    expect(termosDaBusca(undefined)).toEqual([]);
  });
});

describe("haQuanto", () => {
  const agora = new Date("2026-10-26T12:00:00Z");
  it("escreve em minutos, horas e dias", () => {
    expect(haQuanto("2026-10-26T11:59:40Z", agora)).toBe("agora");
    expect(haQuanto("2026-10-26T11:20:00Z", agora)).toBe("há 40 min");
    expect(haQuanto("2026-10-26T09:00:00Z", agora)).toBe("há 3 h");
    expect(haQuanto("2026-10-25T10:00:00Z", agora)).toBe("há 1 dia");
    expect(haQuanto("2026-10-22T12:00:00Z", agora)).toBe("há 4 dias");
  });
});

describe("lerVisao e lerPagina", () => {
  it("cai no padrão com valor estranho", () => {
    expect(lerVisao("guardadas")).toBe("guardadas");
    expect(lerVisao("qualquer")).toBe("todas");
    expect(lerPagina("3")).toBe(3);
    expect(lerPagina("-1")).toBe(1);
    expect(lerPagina("abc")).toBe(1);
    expect(lerPagina("99999")).toBe(500);
  });
});
