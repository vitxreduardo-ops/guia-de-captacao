import { describe, expect, it } from "vitest";
import {
  companyVars,
  pickTemplate,
  daysSinceTouch,
  prospectVars,
  renderMessage,
  suggestForProspect,
  whatsappLink,
} from "@/lib/messageText";
import type {
  ProspectRow,
  ProspectStage,
  ProspectStageKind,
  RadarCompany,
} from "@/lib/prospectTypes";

function stage(name: string, kind: ProspectStageKind = "ativa"): ProspectStage {
  return { id: name, name, color: "#000", position: 0, kind, playbook: "" };
}

function company(fields: Partial<RadarCompany> = {}): RadarCompany {
  return {
    id: "r1",
    company: "Padaria do Zé",
    sector: "Alimentação",
    instagram: "@padariadoze",
    produces_content: "",
    contact: "",
    comms_name: "",
    referral: "",
    notes: "",
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    ...fields,
  };
}

const vars = {
  nome: "Ana",
  pessoa: "Ana",
  empresa: "Padaria do Zé",
  dias: "12",
  combinado: "mandar a proposta",
  valor: "R$ 2.500,00",
  ramo: "alimentação",
  indicacao: "",
  perfil: "",
};

describe("daysSinceTouch", () => {
  it("conta dias inteiros", () => {
    expect(
      daysSinceTouch("2026-09-08T12:00:00Z", new Date("2026-09-20T12:00:00Z"))
    ).toBe(12);
  });

  it("devolve null quando nunca houve contato", () => {
    // Zero diria "faz 0 dias" na mensagem; nunca é outra coisa.
    expect(daysSinceTouch(null)).toBeNull();
  });
});

describe("suggestForProspect", () => {
  it("contato sem nenhum registro é apresentação, não cobrança", () => {
    // A etapa pode ter sido arrastada à mão sem ninguém ter falado com ele.
    expect(
      suggestForProspect({ stage: stage("Negociação"), touch_count: 0 }, null)
    ).toBe("apresentar");
  });

  it("dois meses parados viram recomeçar", () => {
    expect(
      suggestForProspect(
        { stage: stage("Proposta enviada"), touch_count: 4 },
        70
      )
    ).toBe("recomecar");
  });

  it("proposta e negociação pedem a decisão", () => {
    expect(
      suggestForProspect(
        { stage: stage("Proposta enviada"), touch_count: 2 },
        9
      )
    ).toBe("saber_decisao");
    expect(
      suggestForProspect({ stage: stage("Negociação"), touch_count: 3 }, 4)
    ).toBe("saber_decisao");
  });

  it("depois da conversa o próximo passo é a proposta", () => {
    expect(
      suggestForProspect({ stage: stage("Conversa marcada"), touch_count: 1 }, 2)
    ).toBe("mandar_proposta");
  });

  it("nutrição volta na data", () => {
    expect(
      suggestForProspect(
        { stage: stage("Nutrição", "nutricao"), touch_count: 3 },
        5
      )
    ).toBe("voltar_depois");
  });
});

describe("renderMessage", () => {
  it("troca as variáveis preenchidas", () => {
    expect(renderMessage("Oi, {{nome}}, faz {{dias}} dias.", vars)).toBe(
      "Oi, Ana, faz 12 dias."
    );
  });

  it("remove a linha inteira quando a variável está vazia", () => {
    expect(
      renderMessage("Oi, {{nome}}!\n\n{{indicacao}} me falou de vocês.\n\nAbraço.", vars)
    ).toBe("Oi, Ana!\n\nAbraço.");
  });

  it("não deixa buraco de três quebras onde a linha saiu", () => {
    expect(renderMessage("A\n\n{{indicacao}}\n\nB", vars)).toBe("A\n\nB");
  });
});

describe("variáveis", () => {
  it("a empresa do Radar usa o ramo em minúscula, que entra no meio da frase", () => {
    expect(companyVars(company()).ramo).toBe("alimentação");
  });

  it("prefere o responsável pela comunicação ao contato genérico", () => {
    expect(
      companyVars(company({ comms_name: "Ana", contact: "oi@padaria.com" }))
        .pessoa
    ).toBe("Ana");
  });

  it("o contato sem pessoa anotada cai no nome da empresa", () => {
    const prospect = {
      contact_name: "",
      name: "Padaria do Zé",
      next_contact_what: "",
      value: 0,
      origin: "",
      handle: "",
    } as ProspectRow;
    expect(prospectVars(prospect, 3).nome).toBe("Padaria do Zé");
  });
});

describe("whatsappLink", () => {
  it("põe o 55 quando falta e não duplica quem já tem", () => {
    expect(whatsappLink("(11) 99999-8888", "oi")).toBe(
      "https://wa.me/5511999998888?text=oi"
    );
    expect(whatsappLink("5511999998888", "oi")).toBe(
      "https://wa.me/5511999998888?text=oi"
    );
  });

  it("devolve null sem telefone utilizável", () => {
    expect(whatsappLink("999", "oi")).toBeNull();
  });
});

describe("pickTemplate", () => {
  const modelos = [
    {
      id: "indicacao",
      name: "Indicação",
      situation: "apresentar" as const,
      position: 0,
      body: "Oi!\n{{indicacao}} falou de vocês.",
    },
    {
      id: "frio",
      name: "Frio",
      situation: "apresentar" as const,
      position: 1,
      body: "Oi!\nTrabalho com {{ramo}}.",
    },
  ];

  it("abre o modelo que perde menos linhas", () => {
    // Sem indicação, o de indicação perderia uma linha logo ao abrir.
    const escolhido = pickTemplate(modelos, "apresentar", {
      ...vars,
      indicacao: "",
    });
    expect(escolhido?.id).toBe("frio");
  });

  it("escolhe mesmo quando todos perdem alguma linha", () => {
    // No Radar quase nunca há nome da pessoa: com a régua do "inteiro ou
    // nada", todos empatariam e a escolha viraria a ordem da lista.
    const comCumprimento = modelos.map((m) => ({
      ...m,
      body: `Oi, {{pessoa}}!\n${m.body}`,
    }));
    const escolhido = pickTemplate(comCumprimento, "apresentar", {
      ...vars,
      pessoa: "",
      indicacao: "",
    });
    expect(escolhido?.id).toBe("frio");
  });

  it("usa o de indicação quando há quem indicou", () => {
    const escolhido = pickTemplate(modelos, "apresentar", {
      ...vars,
      indicacao: "Keila",
    });
    expect(escolhido?.id).toBe("indicacao");
  });

  it("sem modelo da situação, cai em qualquer um em vez de tela vazia", () => {
    // `vars` não tem indicação, então entre os dois sobra o que fica inteiro.
    expect(pickTemplate(modelos, "recomecar", vars)?.id).toBe("frio");
    expect(pickTemplate([], "recomecar", vars)).toBeNull();
  });
});
