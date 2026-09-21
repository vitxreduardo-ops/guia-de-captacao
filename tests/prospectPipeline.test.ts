import { describe, expect, it } from "vitest";
import {
  conversionRate,
  lostReasons,
  missingValue,
  openPipeline,
  totalsByStage,
  wonInMonth,
} from "@/lib/prospectPipeline";
import type {
  ProspectRow,
  ProspectStage,
  ProspectStageKind,
} from "@/lib/prospectTypes";

function stage(
  id: string,
  kind: ProspectStageKind,
  position: number
): ProspectStage {
  return { id, name: id, color: "#000", position, kind, playbook: "" };
}

const ATIVA = stage("ativa", "ativa", 1);
const GANHA = stage("ganha", "ganha", 2);
const PERDIDA = stage("perdida", "perdida", 3);
const NUTRICAO = stage("nutricao", "nutricao", 0);

function row(
  stageRef: ProspectStage,
  fields: Partial<ProspectRow> = {}
): ProspectRow {
  return {
    id: Math.random().toString(36).slice(2),
    name: "Contato",
    client_id: null,
    stage_id: stageRef.id,
    owner_id: null,
    contact_name: "",
    role: "",
    phone: "",
    email: "",
    handle: "",
    origin: "",
    next_contact_date: null,
    next_contact_time: null,
    next_contact_minutes: null,
    next_contact_what: "",
    lost_reason: "",
    notes: "",
    value: 0,
    budget_id: null,
    contract_id: null,
    closed_at: null,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    stage: stageRef,
    last_touch_at: null,
    touch_count: 0,
    ...fields,
  };
}

describe("openPipeline", () => {
  it("soma só o que está em andamento", () => {
    const rows = [
      row(ATIVA, { value: 1000 }),
      row(ATIVA, { value: 500 }),
      row(GANHA, { value: 9000 }),
      row(PERDIDA, { value: 7000 }),
      // Nutrição é "não agora": somá-la infla o funil com dinheiro que
      // ninguém está perseguindo.
      row(NUTRICAO, { value: 3000 }),
    ];
    expect(openPipeline(rows)).toEqual({ count: 2, value: 1500 });
  });
});

describe("wonInMonth", () => {
  it("usa closed_at, não updated_at", () => {
    const rows = [
      row(GANHA, {
        value: 2000,
        closed_at: "2026-09-10T12:00:00Z",
        updated_at: "2026-10-02T00:00:00Z",
      }),
      row(GANHA, { value: 5000, closed_at: "2026-08-30T12:00:00Z" }),
      row(ATIVA, { value: 8000, closed_at: "2026-09-11T12:00:00Z" }),
    ];
    expect(wonInMonth(rows, "2026-09")).toEqual({ count: 1, value: 2000 });
  });

  it("ignora o ganho sem data de fechamento", () => {
    expect(wonInMonth([row(GANHA, { value: 100 })], "2026-09")).toEqual({
      count: 0,
      value: 0,
    });
  });
});

describe("conversionRate", () => {
  it("divide por ganhos mais perdidos, não pelo funil inteiro", () => {
    const rows = [
      row(GANHA),
      row(PERDIDA),
      row(PERDIDA),
      row(ATIVA),
      row(ATIVA),
    ];
    expect(conversionRate(rows)).toBeCloseTo(1 / 3);
  });

  it("devolve null quando nada foi decidido", () => {
    expect(conversionRate([row(ATIVA), row(NUTRICAO)])).toBeNull();
  });
});

describe("lostReasons", () => {
  it("agrupa e ordena do mais comum, ignorando motivo em branco", () => {
    const rows = [
      row(PERDIDA, { lost_reason: "Preço" }),
      row(PERDIDA, { lost_reason: "Preço" }),
      row(PERDIDA, { lost_reason: "Sumiu" }),
      row(PERDIDA, { lost_reason: "   " }),
      row(GANHA, { lost_reason: "Preço" }),
    ];
    expect(lostReasons(rows)).toEqual([
      { reason: "Preço", count: 2 },
      { reason: "Sumiu", count: 1 },
    ]);
  });
});

describe("totalsByStage", () => {
  it("devolve as etapas na ordem do funil, inclusive as vazias", () => {
    const totais = totalsByStage([row(ATIVA, { value: 300 })], [
      ATIVA,
      NUTRICAO,
    ]);
    expect(totais.map((t) => t.stage.id)).toEqual(["nutricao", "ativa"]);
    expect(totais[1]).toMatchObject({ count: 1, value: 300 });
    expect(totais[0]).toMatchObject({ count: 0, value: 0 });
  });
});

describe("missingValue", () => {
  it("aponta o contato em andamento sem valor", () => {
    const semValor = row(ATIVA);
    const rows = [semValor, row(ATIVA, { value: 10 }), row(GANHA)];
    expect(missingValue(rows).map((r) => r.id)).toEqual([semValor.id]);
  });
});
