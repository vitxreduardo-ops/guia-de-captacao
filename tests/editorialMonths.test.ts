import { describe, expect, it } from "vitest";
import { galleryTitle, groupByMonth, nextMonths, pendingSummary } from "@/lib/editorialMonths";
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
