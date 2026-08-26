import { describe, expect, it } from "vitest";
import {
  addDaysKey,
  addMonthsKey,
  daysOf,
  highlightOf,
  isAgendaView,
  isDayKey,
  rangeOf,
  stepOf,
  weekStartOf,
} from "@/lib/agendaRange";

describe("addDaysKey", () => {
  it("anda dentro do mês", () => {
    expect(addDaysKey("2026-09-02", 3)).toBe("2026-09-05");
    expect(addDaysKey("2026-09-02", -1)).toBe("2026-09-01");
  });

  it("atravessa mês e ano", () => {
    expect(addDaysKey("2026-08-31", 1)).toBe("2026-09-01");
    expect(addDaysKey("2026-09-01", -1)).toBe("2026-08-31");
    expect(addDaysKey("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("respeita ano bissexto", () => {
    expect(addDaysKey("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDaysKey("2026-02-28", 1)).toBe("2026-03-01");
  });
});

describe("weekStartOf", () => {
  it("recua até o domingo", () => {
    // 2026-09-02 é uma quarta-feira.
    expect(weekStartOf("2026-09-02")).toBe("2026-08-30");
  });

  it("devolve o próprio dia quando já é domingo", () => {
    expect(weekStartOf("2026-08-30")).toBe("2026-08-30");
  });

  it("não escorrega de dia por causa de fuso", () => {
    // O servidor pode estar em qualquer fuso; a conta é feita em UTC.
    expect(weekStartOf("2026-01-01")).toBe("2025-12-28");
  });
});

describe("rangeOf", () => {
  it("dia mostra só a âncora", () => {
    expect(rangeOf("dia", "2026-09-02")).toEqual({
      start: "2026-09-02",
      count: 1,
    });
  });

  it("4 dias começa na âncora, como no Google", () => {
    expect(rangeOf("4dias", "2026-09-02")).toEqual({
      start: "2026-09-02",
      count: 4,
    });
  });

  it("semana recua para o domingo", () => {
    expect(rangeOf("semana", "2026-09-02")).toEqual({
      start: "2026-08-30",
      count: 7,
    });
  });

  it("mês cobre seis linhas a partir do domingo que abre o mês", () => {
    expect(rangeOf("mes", "2026-09-02")).toEqual({
      start: "2026-08-30",
      count: 42,
    });
  });
});

describe("stepOf", () => {
  it("anda um dia, quatro dias ou uma semana", () => {
    expect(stepOf("dia", "2026-09-02")).toEqual({
      back: "2026-09-01",
      next: "2026-09-03",
    });
    expect(stepOf("4dias", "2026-09-02")).toEqual({
      back: "2026-08-29",
      next: "2026-09-06",
    });
    expect(stepOf("semana", "2026-09-02")).toEqual({
      back: "2026-08-26",
      next: "2026-09-09",
    });
  });

  it("no mês pula para o dia 1º do mês vizinho", () => {
    expect(stepOf("mes", "2026-09-02")).toEqual({
      back: "2026-08-01",
      next: "2026-10-01",
    });
  });

  it("vira o ano nos dois sentidos", () => {
    expect(stepOf("mes", "2026-01-15").back).toBe("2025-12-01");
    expect(stepOf("mes", "2026-12-15").next).toBe("2027-01-01");
  });
});

describe("highlightOf", () => {
  it("marca o intervalo exibido nas visões de grade", () => {
    expect(highlightOf("semana", "2026-09-02")).toEqual({
      start: "2026-08-30",
      end: "2026-09-05",
    });
    expect(highlightOf("dia", "2026-09-02")).toEqual({
      start: "2026-09-02",
      end: "2026-09-02",
    });
  });

  it("no mês marca o mês, não as seis linhas", () => {
    expect(highlightOf("mes", "2026-09-02")).toEqual({
      start: "2026-09-01",
      end: "2026-09-30",
    });
  });

  it("acha o último dia de fevereiro em ano bissexto", () => {
    expect(highlightOf("mes", "2028-02-10").end).toBe("2028-02-29");
  });
});

describe("daysOf", () => {
  it("monta as colunas com o número do dia", () => {
    expect(daysOf("2026-08-30", 3)).toEqual([
      { key: "2026-08-30", day: 30 },
      { key: "2026-08-31", day: 31 },
      { key: "2026-09-01", day: 1 },
    ]);
  });

  it("monta as 42 células do mês", () => {
    const cells = daysOf("2026-08-30", 42);
    expect(cells).toHaveLength(42);
    expect(cells[41].key).toBe("2026-10-10");
  });
});

describe("addMonthsKey", () => {
  it("anda de mês virando o ano", () => {
    expect(addMonthsKey("2026-12", 1)).toBe("2027-01");
    expect(addMonthsKey("2026-01", -1)).toBe("2025-12");
  });
});

describe("validação do que vem no endereço", () => {
  it("aceita só as quatro visões", () => {
    expect(isAgendaView("semana")).toBe(true);
    expect(isAgendaView("mes")).toBe(true);
    expect(isAgendaView("ano")).toBe(false);
    expect(isAgendaView(undefined)).toBe(false);
  });

  it("aceita só data no formato da grade", () => {
    expect(isDayKey("2026-09-02")).toBe(true);
    expect(isDayKey("02/09/2026")).toBe(false);
    expect(isDayKey("2026-9-2")).toBe(false);
    expect(isDayKey(undefined)).toBe(false);
  });
});
