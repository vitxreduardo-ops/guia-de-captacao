import { describe, expect, it } from "vitest";
import {
  daysSinceTouch,
  renderFollowup,
  suggestSituation,
  whatsappLink,
} from "@/lib/followupText";
import type { ProspectStage, ProspectStageKind } from "@/lib/prospectTypes";

function stage(name: string, kind: ProspectStageKind = "ativa"): ProspectStage {
  return { id: name, name, color: "#000", position: 0, kind, playbook: "" };
}

const vars = {
  nome: "Ana",
  empresa: "Padaria do Zé",
  dias: 12,
  combinado: "mandar a proposta",
  valor: 2500,
};

describe("daysSinceTouch", () => {
  it("conta dias inteiros", () => {
    const agora = new Date("2026-09-20T12:00:00Z");
    expect(daysSinceTouch("2026-09-08T12:00:00Z", agora)).toBe(12);
  });

  it("devolve null quando nunca houve contato", () => {
    // Zero diria "faz 0 dias" na mensagem; nunca é outra coisa.
    expect(daysSinceTouch(null)).toBeNull();
  });
});

describe("suggestSituation", () => {
  it("nutrição manda, mesmo com pouco tempo parado", () => {
    const p = { stage: stage("Nutrição", "nutricao"), touch_count: 3, notes: "" };
    expect(suggestSituation(p, 2)).toBe("nutricao");
  });

  it("dois meses parados viram reativar, não cobrança", () => {
    const p = { stage: stage("Proposta enviada"), touch_count: 4, notes: "" };
    expect(suggestSituation(p, 70)).toBe("reativar");
  });

  it("proposta enviada pede o modelo de proposta sem retorno", () => {
    const p = { stage: stage("Proposta enviada"), touch_count: 2, notes: "" };
    expect(suggestSituation(p, 9)).toBe("pos_proposta");
  });

  it("negociação pede a decisão", () => {
    const p = { stage: stage("Negociação"), touch_count: 5, notes: "" };
    expect(suggestSituation(p, 4)).toBe("decisao");
  });

  it("contato sem nenhum registro não é cobrado por decisão", () => {
    const p = { stage: stage("Radar"), touch_count: 0, notes: "" };
    expect(suggestSituation(p, null)).toBe("sem_resposta");
  });
});

describe("renderFollowup", () => {
  it("troca as variáveis preenchidas", () => {
    expect(renderFollowup("Oi, {{nome}}, faz {{dias}} dias.", vars)).toBe(
      "Oi, Ana, faz 12 dias."
    );
  });

  it("remove a linha inteira quando a variável está vazia", () => {
    const texto = renderFollowup(
      "Oi, {{nome}}!\n\nFiquei de {{combinado}}.\n\nAbraço.",
      { ...vars, combinado: "" }
    );
    expect(texto).toBe("Oi, Ana!\n\nAbraço.");
  });

  it("não deixa buraco de três quebras onde a linha saiu", () => {
    const texto = renderFollowup("A\n\n{{combinado}}\n\nB", {
      ...vars,
      combinado: "",
    });
    expect(texto).toBe("A\n\nB");
  });
});

describe("whatsappLink", () => {
  it("põe o 55 quando falta", () => {
    expect(whatsappLink("(11) 99999-8888", "oi")).toBe(
      "https://wa.me/5511999998888?text=oi"
    );
  });

  it("não duplica o 55 de quem já tem", () => {
    expect(whatsappLink("5511999998888", "oi")).toBe(
      "https://wa.me/5511999998888?text=oi"
    );
  });

  it("devolve null sem telefone utilizável", () => {
    expect(whatsappLink("", "oi")).toBeNull();
    expect(whatsappLink("999", "oi")).toBeNull();
  });
});
