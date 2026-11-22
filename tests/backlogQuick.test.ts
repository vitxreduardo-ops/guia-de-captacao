import { describe, expect, it } from "vitest";
import { matchesQuick, type BacklogCard } from "@/lib/backlogTypes";

const HOJE = "2026-11-22";
const card = (post_date: string | null) => ({ post_date }) as BacklogCard;

const aFazer = { billable: false, paid: false };
const entregue = { billable: true, paid: false };
const recebido = { billable: true, paid: true };

describe("matchesQuick", () => {
  it("atrasado: data passada e coluna ainda não faturável", () => {
    expect(matchesQuick(card("2026-11-21"), aFazer, ["late"], HOJE)).toBe(true);
    expect(matchesQuick(card(HOJE), aFazer, ["late"], HOJE)).toBe(false);
    expect(matchesQuick(card(null), aFazer, ["late"], HOJE)).toBe(false);
  });

  it("entrega concluída não está atrasada, mesmo com data velha", () => {
    expect(matchesQuick(card("2026-10-01"), entregue, ["late"], HOJE)).toBe(false);
  });

  it("aguardando pagamento: faturável e ainda não recebida", () => {
    expect(matchesQuick(card(null), entregue, ["awaiting_payment"], HOJE)).toBe(true);
    expect(matchesQuick(card(null), recebido, ["awaiting_payment"], HOJE)).toBe(false);
    expect(matchesQuick(card(null), aFazer, ["awaiting_payment"], HOJE)).toBe(false);
  });

  it("os atalhos somam (OU)", () => {
    const quicks = ["late", "awaiting_payment"] as const;
    expect(matchesQuick(card("2026-11-01"), aFazer, [...quicks], HOJE)).toBe(true);
    expect(matchesQuick(card(null), entregue, [...quicks], HOJE)).toBe(true);
    expect(matchesQuick(card(null), recebido, [...quicks], HOJE)).toBe(false);
  });

  it("coluna que não existe não casa", () => {
    expect(matchesQuick(card("2026-11-01"), undefined, ["late"], HOJE)).toBe(false);
  });
});
