import { describe, expect, it } from "vitest";
import {
  lineTotalCents,
  monthKey,
  nextMonthKey,
  parseBRLToCents,
  recentMonths,
  sumCents,
} from "@/lib/billingTypes";

describe("parseBRLToCents", () => {
  it("lê os formatos que a gente digita", () => {
    expect(parseBRLToCents("1.234,56")).toBe(123456);
    expect(parseBRLToCents("1234,56")).toBe(123456);
    expect(parseBRLToCents("1234.56")).toBe(123456);
    expect(parseBRLToCents("R$ 890")).toBe(89000);
    expect(parseBRLToCents("890")).toBe(89000);
    expect(parseBRLToCents("0,5")).toBe(50);
  });

  it("trata separador de milhar sem centavos", () => {
    expect(parseBRLToCents("1.234")).toBe(123400);
    expect(parseBRLToCents("12.345.678")).toBe(1234567800);
  });

  it("vira zero quando não há número", () => {
    expect(parseBRLToCents("")).toBe(0);
    expect(parseBRLToCents("R$")).toBe(0);
    expect(parseBRLToCents(null)).toBe(0);
  });
});

describe("totais", () => {
  it("multiplica quantidade pelo valor unitário", () => {
    expect(lineTotalCents({ quantity: 3, unit_price_cents: 25000 })).toBe(75000);
    expect(lineTotalCents({ quantity: 1, unit_price_cents: null })).toBe(0);
  });

  it("ignora valores negativos em vez de descontar da nota", () => {
    expect(lineTotalCents({ quantity: -2, unit_price_cents: 1000 })).toBe(0);
  });

  it("soma as linhas do mês", () => {
    expect(
      sumCents([
        { quantity: 2, unit_price_cents: 50000 },
        { quantity: 1, unit_price_cents: 12550 },
        { quantity: 1, unit_price_cents: null },
      ])
    ).toBe(112550);
  });
});

describe("mês de competência", () => {
  it("normaliza qualquer dia pro primeiro do mês", () => {
    expect(monthKey("2026-08-13")).toBe("2026-08-01");
    expect(monthKey(new Date(Date.UTC(2026, 7, 31)))).toBe("2026-08-01");
  });

  it("vira o ano no mês seguinte", () => {
    expect(nextMonthKey("2026-08-01")).toBe("2026-09-01");
    expect(nextMonthKey("2026-12-01")).toBe("2027-01-01");
  });

  it("lista os últimos meses do atual pro passado", () => {
    const months = recentMonths(new Date(2026, 0, 15), 3);
    expect(months).toEqual(["2026-01-01", "2025-12-01", "2025-11-01"]);
  });
});
