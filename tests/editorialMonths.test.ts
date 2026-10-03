import { describe, expect, it } from "vitest";
import { creatorColor, galleryTitle, groupByMonth, nextMonths, pendingSummary } from "@/lib/editorialMonths";
import { generatePassword } from "@/lib/passwords";

describe("calendário editorial", () => {
  it("agrupa ideias pelo mês, janeiro no índice 0", () => {
    const m = groupByMonth([
      { id: "a", month: "2026-03-01", title: "x", notes: "", internal: false },
      { id: "b", month: "2026-12-01", title: "y", notes: "", internal: false },
    ]);
    expect(m).toHaveLength(12);
    expect(m[2].map((i) => i.id)).toEqual(["a"]);
    expect(m[11].map((i) => i.id)).toEqual(["b"]);
  });

  it("monta o título da galeria com do/da", () => {
    expect(galleryTitle("14Bis", "do")).toBe("Galeria do 14Bis");
    expect(galleryTitle("Dra. Juliana", "da")).toBe("Galeria da Dra. Juliana");
  });
});

describe("helpers do portal", () => {
  it("nextMonths vira o ano", () => {
    const m = nextMonths(new Date(2026, 10, 15), 3);
    expect(m).toEqual([
      { year: 2026, month: 11 },
      { year: 2026, month: 12 },
      { year: 2027, month: 1 },
    ]);
  });

  it("pendingSummary fala como gente", () => {
    expect(pendingSummary(0, 0)).toBeNull();
    expect(pendingSummary(1, 0)).toBe("1 material esperando seu OK");
    expect(pendingSummary(2, 1)).toBe("2 materiais esperando seu OK · 1 em ajuste");
  });

  it("generatePassword só usa caracteres sem ambiguidade", () => {
    const p = generatePassword();
    expect(p).toHaveLength(8);
    expect(p).toMatch(/^[abcdefghjkmnpqrstuvwxyz23456789]+$/);
  });
});



describe("creatorColor", () => {
  it("é estável por pessoa", () => {
    expect(creatorColor("vitor.tatu")).toBe(creatorColor("vitor.tatu"));
    expect(creatorColor("vitor.tatu")).toMatch(/^#[0-9a-f]{6}$/);
  });
});

import { findClientLogo } from "@/lib/clientLogoMatch";

describe("findClientLogo", () => {
  const logos = [{ name: "14bis", logo_url: "u1" }, { name: "Creative Home", logo_url: "u2" }];
  it("casa sem ligar pra caixa, acento e espaço", () => {
    expect(findClientLogo("14Bis", logos)).toBe("u1");
    expect(findClientLogo("  creative  home ", logos)).toBe("u2");
  });
  it("sem logo no acervo devolve null", () => {
    expect(findClientLogo("Aerobite", logos)).toBeNull();
    expect(findClientLogo("", logos)).toBeNull();
  });
});

import { svgIsLight } from "@/lib/clientLogoMatch";

describe("svgIsLight", () => {
  it("branco é claro, preto e sem cor não", () => {
    expect(svgIsLight('<path style="fill: #fff"/>')).toBe(true);
    expect(svgIsLight('<path fill="#ffffff"/><path fill="white"/>')).toBe(true);
    expect(svgIsLight('<path fill="#000"/>')).toBe(false);
    expect(svgIsLight('<path fill="#fff"/><path fill="#222"/>')).toBe(false);
    expect(svgIsLight("<path/>")).toBe(false);
  });
});

import { driveTitle, monthWeeks } from "@/lib/editorialMonths";
import { sameName } from "@/lib/clientLogoMatch";

describe("calendário mensal", () => {
  it("outubro de 2026 começa numa quinta e tem 31 dias", () => {
    const weeks = monthWeeks(2026, 10);
    expect(weeks[0]).toEqual([null, null, null, null, 1, 2, 3]);
    expect(weeks.flat().filter(Boolean)).toHaveLength(31);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
  });
  it("driveTitle e sameName", () => {
    expect(driveTitle("14Bis", "do")).toBe("Drive do 14Bis");
    expect(sameName("14Bis", " 14bis ")).toBe(true);
    expect(sameName("14Bis", "Atta 3D")).toBe(false);
  });
});

import { tomorrowISO } from "@/lib/editorialMonths";

describe("tomorrowISO", () => {
  it("usa o dia de Brasília, não o de UTC", () => {
    // 01:00 UTC de 10/10 ainda é 22:00 de 09/10 em Brasília → amanhã = 10/10
    expect(tomorrowISO(new Date("2026-10-10T01:00:00Z"))).toBe("2026-10-10");
    expect(tomorrowISO(new Date("2026-10-10T15:00:00Z"))).toBe("2026-10-11");
    expect(tomorrowISO(new Date("2026-12-31T15:00:00Z"))).toBe("2027-01-01");
  });
});
