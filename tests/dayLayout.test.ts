import { describe, expect, it } from "vitest";
import { layoutDay } from "@/lib/dayLayout";

/** Atalho: um compromisso descrito só pelo que o layout enxerga. */
function event(id: string, startMinutes: number, endMinutes: number) {
  return { id, startMinutes, endMinutes };
}

describe("layoutDay", () => {
  it("dia vazio não produz nada", () => {
    expect(layoutDay([])).toEqual([]);
  });

  it("compromisso sozinho ocupa a coluna inteira", () => {
    const [only] = layoutDay([event("a", 540, 600)]);
    expect(only.column).toBe(0);
    expect(only.columns).toBe(1);
  });

  it("dois que se sobrepõem dividem a largura", () => {
    const positioned = layoutDay([event("a", 540, 660), event("b", 600, 720)]);
    expect(positioned.map((item) => item.event.id)).toEqual(["a", "b"]);
    expect(positioned.map((item) => item.column)).toEqual([0, 1]);
    expect(positioned.every((item) => item.columns === 2)).toBe(true);
  });

  it("compromissos separados no tempo ficam ambos em largura cheia", () => {
    const positioned = layoutDay([event("manha", 540, 600), event("tarde", 840, 900)]);
    expect(positioned.every((item) => item.columns === 1)).toBe(true);
    expect(positioned.every((item) => item.column === 0)).toBe(true);
  });

  it("encostar um no fim do outro não conta como sobreposição", () => {
    const positioned = layoutDay([event("a", 540, 600), event("b", 600, 660)]);
    expect(positioned.every((item) => item.columns === 1)).toBe(true);
  });

  it("reaproveita a faixa que ficou livre dentro do mesmo grupo", () => {
    // "a" cobre o grupo inteiro; "b" e "c" não se encostam, então cabem
    // ambos na segunda faixa.
    const positioned = layoutDay([
      event("a", 540, 780),
      event("b", 560, 600),
      event("c", 620, 660),
    ]);
    const byId = Object.fromEntries(
      positioned.map((item) => [item.event.id, item])
    );
    expect(byId.a.column).toBe(0);
    expect(byId.b.column).toBe(1);
    expect(byId.c.column).toBe(1);
    expect(positioned.every((item) => item.columns === 2)).toBe(true);
  });

  it("três simultâneos viram três faixas", () => {
    const positioned = layoutDay([
      event("a", 540, 660),
      event("b", 550, 670),
      event("c", 560, 680),
    ]);
    expect(positioned.map((item) => item.column).sort()).toEqual([0, 1, 2]);
    expect(positioned.every((item) => item.columns === 3)).toBe(true);
  });

  it("não depende da ordem de entrada", () => {
    const entrada = [event("b", 600, 720), event("a", 540, 660)];
    const positioned = layoutDay(entrada);
    expect(positioned.map((item) => item.event.id)).toEqual(["a", "b"]);
    // E não mexe no array recebido.
    expect(entrada.map((item) => item.id)).toEqual(["b", "a"]);
  });

  it("grupos independentes contam colunas separadamente", () => {
    const positioned = layoutDay([
      event("manha1", 540, 660),
      event("manha2", 600, 700),
      event("tarde", 840, 900),
    ]);
    const byId = Object.fromEntries(
      positioned.map((item) => [item.event.id, item])
    );
    expect(byId.manha1.columns).toBe(2);
    expect(byId.manha2.columns).toBe(2);
    expect(byId.tarde.columns).toBe(1);
  });
});
