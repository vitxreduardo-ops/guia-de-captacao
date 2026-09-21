import { describe, expect, it } from "vitest";
import {
  addDaysISO,
  daysLate,
  matchesSearch,
  normalizeStageKind,
  queueBucket,
} from "@/lib/prospectTypes";
import { compareByNextContact } from "@/lib/prospects";
import type { ProspectRow } from "@/lib/prospectTypes";

const HOJE = "2026-09-13";

function row(fields: Partial<ProspectRow>): ProspectRow {
  return {
    id: "x",
    name: "Contato",
    client_id: null,
    stage_id: "s",
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
    value: 0,
    budget_id: null,
    contract_id: null,
    closed_at: null,
    notes: "",
    created_at: "",
    updated_at: "",
    stage: {
      id: "s",
      name: "Etapa",
      color: "#000",
      position: 0,
      kind: "ativa",
      playbook: "",
    },
    last_touch_at: null,
    touch_count: 0,
    ...fields,
  };
}

describe("queueBucket", () => {
  it("separa sem data, atrasado, hoje, semana e depois", () => {
    expect(queueBucket(null, HOJE)).toBe("sem-data");
    expect(queueBucket("2026-09-12", HOJE)).toBe("atrasado");
    expect(queueBucket(HOJE, HOJE)).toBe("hoje");
    expect(queueBucket("2026-09-14", HOJE)).toBe("semana");
    // O sétimo dia ainda é "semana"; o oitavo já é "depois".
    expect(queueBucket("2026-09-20", HOJE)).toBe("semana");
    expect(queueBucket("2026-09-21", HOJE)).toBe("depois");
  });

  it("atravessa a virada do mês sem tropeçar", () => {
    expect(queueBucket("2026-10-01", "2026-09-30")).toBe("semana");
    expect(queueBucket("2026-09-30", "2026-10-01")).toBe("atrasado");
    expect(addDaysISO("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("daysLate", () => {
  it("conta os dias inteiros de atraso", () => {
    expect(daysLate("2026-09-12", HOJE)).toBe(1);
    expect(daysLate("2026-08-30", HOJE)).toBe(14);
  });
});

describe("compareByNextContact", () => {
  it("põe a data mais próxima primeiro e o sem data por último", () => {
    const ordenado = [
      row({ id: "sem", name: "Sem data" }),
      row({ id: "depois", next_contact_date: "2026-09-20" }),
      row({ id: "hoje", next_contact_date: HOJE }),
    ].sort(compareByNextContact);
    expect(ordenado.map((item) => item.id)).toEqual(["hoje", "depois", "sem"]);
  });

  it("no mesmo dia, quem tem hora vem antes de quem não tem", () => {
    const ordenado = [
      row({ id: "dia-inteiro", next_contact_date: HOJE }),
      row({ id: "tarde", next_contact_date: HOJE, next_contact_time: "16:30" }),
      row({ id: "manha", next_contact_date: HOJE, next_contact_time: "09:00" }),
    ].sort(compareByNextContact);
    expect(ordenado.map((item) => item.id)).toEqual([
      "manha",
      "tarde",
      "dia-inteiro",
    ]);
  });

  it("sem data nenhuma, ordena por nome", () => {
    const ordenado = [row({ name: "Zebra" }), row({ name: "Abelha" })].sort(
      compareByNextContact
    );
    expect(ordenado.map((item) => item.name)).toEqual(["Abelha", "Zebra"]);
  });
});

describe("normalizeStageKind", () => {
  it("aceita os quatro tipos e cai em ativa no resto", () => {
    expect(normalizeStageKind("perdida")).toBe("perdida");
    expect(normalizeStageKind("nutricao")).toBe("nutricao");
    expect(normalizeStageKind("qualquer coisa")).toBe("ativa");
    expect(normalizeStageKind(null)).toBe("ativa");
  });
});

describe("busca do radar", () => {
  it("acha com e sem acento, nos dois sentidos", () => {
    expect(matchesSearch("Saúde", "saude")).toBe(true);
    expect(matchesSearch("Saude", "saúde")).toBe(true);
    expect(matchesSearch("Serviços", "servicos")).toBe(true);
    expect(matchesSearch("Agronegócio", "agronegocio")).toBe(true);
  });

  it("acha pelo começo da palavra", () => {
    expect(matchesSearch("Agronegócio", "agro")).toBe(true);
  });

  it("exige todas as palavras, em qualquer ordem", () => {
    const linha = "Padaria do Zé Alimentação Barreiras";
    expect(matchesSearch(linha, "padaria barreiras")).toBe(true);
    expect(matchesSearch(linha, "barreiras padaria")).toBe(true);
    expect(matchesSearch(linha, "padaria salvador")).toBe(false);
  });

  it("termo vazio não filtra nada", () => {
    expect(matchesSearch("qualquer coisa", "   ")).toBe(true);
  });
});
