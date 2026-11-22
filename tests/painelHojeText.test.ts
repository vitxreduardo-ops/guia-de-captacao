import { describe, expect, it } from "vitest";
import {
  addDays,
  attentionItems,
  longDate,
  weekFrom,
  weekdayShort,
} from "@/lib/painelHojeText";

const HOJE = "2026-11-22";

describe("datas da semana", () => {
  it("atravessa a virada do mês e do ano", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays(HOJE, -30)).toBe("2026-10-23");
  });

  it("devolve sete dias começando hoje", () => {
    const week = weekFrom(HOJE);
    expect(week).toHaveLength(7);
    expect(week[0]).toBe(HOJE);
    expect(week[6]).toBe("2026-11-28");
  });

  it("escreve o dia em português", () => {
    expect(weekdayShort(HOJE)).toBe("Dom");
    expect(longDate(HOJE)).toBe("Domingo, 22 de novembro");
  });
});

describe("attentionItems", () => {
  const base = {
    today: HOJE,
    payments: [],
    followups: [],
    lateDeliveries: [],
    todos: [],
    money: (cents: number) => `R$ ${cents / 100}`,
  };

  it("fila vazia quando nada passou do dia", () => {
    expect(
      attentionItems({
        ...base,
        payments: [{ clientId: "a", clientName: "A", dueDate: "2026-11-25", cents: 100 }],
        todos: [{ id: "t", text: "x", done: false, due_date: "2026-11-23" }],
      })
    ).toEqual([]);
  });

  it("ordena do mais antigo ao mais novo e ignora tarefa feita", () => {
    const items = attentionItems({
      ...base,
      payments: [{ clientId: "a", clientName: "Clínica", dueDate: "2026-10-10", cents: 165000 }],
      followups: [{ id: "p", name: "Lead", next_contact_date: HOJE, next_contact_what: null }],
      lateDeliveries: [{ id: "d", title: "Reel", date: "2026-11-21", clientName: "Padaria" }],
      todos: [
        { id: "t1", text: "feita", done: true, due_date: "2026-11-01" },
        { id: "t2", text: "aberta", done: false, due_date: "2026-11-20" },
      ],
    });
    expect(items.map((item) => item.kind)).toEqual([
      "pagamento",
      "tarefa",
      "entrega",
      "follow-up",
    ]);
    expect(items[0].detail).toBe("R$ 1650 · venceu há 43 dias");
  });
});
