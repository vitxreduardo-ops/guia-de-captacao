import { describe, expect, it } from "vitest";
import {
  daysBetween,
  dueLabel,
  dueStatus,
  remindersSummary,
} from "@/lib/reminderText";

const HOJE = "2026-09-21";

describe("dueStatus", () => {
  it("separa vencido, hoje e futuro", () => {
    expect(dueStatus("2026-09-20", HOJE)).toBe("vencido");
    expect(dueStatus(HOJE, HOJE)).toBe("hoje");
    expect(dueStatus("2026-09-22", HOJE)).toBe("proximo");
  });

  it("não escorrega na virada do mês", () => {
    expect(dueStatus("2026-08-31", "2026-09-01")).toBe("vencido");
  });
});

describe("dueLabel", () => {
  it("diz hoje, ontem e amanhã por extenso", () => {
    expect(dueLabel(HOJE, HOJE)).toBe("hoje");
    expect(dueLabel("2026-09-20", HOJE)).toBe("ontem");
    expect(dueLabel("2026-09-22", HOJE)).toBe("amanhã");
  });

  it("conta os dias nos dois sentidos", () => {
    expect(dueLabel("2026-09-16", HOJE)).toBe("há 5 dias");
    expect(dueLabel("2026-09-28", HOJE)).toBe("em 7 dias");
  });

  it("atravessa o mês sem errar a conta", () => {
    expect(dueLabel("2026-08-31", "2026-09-02")).toBe("há 2 dias");
  });
});

describe("remindersSummary", () => {
  it("escreve o singular à mão", () => {
    expect(remindersSummary(1, 0)).toBe("1 follow-up pra fazer");
    expect(remindersSummary(0, 1)).toBe("1 pagamento em aberto");
  });

  it("junta os dois quando há os dois", () => {
    expect(remindersSummary(3, 2)).toBe(
      "3 follow-ups pra fazer · 2 pagamentos em aberto"
    );
  });

  it("devolve null quando não há nada, pra tela não mostrar caixa vazia", () => {
    expect(remindersSummary(0, 0)).toBeNull();
  });
});
