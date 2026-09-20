import { describe, expect, it } from "vitest";
import {
  outreachVars,
  renderOutreach,
  suggestAngle,
} from "@/lib/outreachText";
import type { RadarCompany } from "@/lib/prospectTypes";

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

describe("suggestAngle", () => {
  it("indicação vence qualquer observação sobre o perfil", () => {
    expect(
      suggestAngle(company({ referral: "Keila", produces_content: "nao" }))
    ).toBe("indicacao");
  });

  it("quem não posta recebe o modelo de perfil parado", () => {
    expect(suggestAngle(company({ produces_content: "nao" }))).toBe(
      "sem_conteudo"
    );
  });

  it("quem posta às vezes recebe o de falta de direção", () => {
    expect(suggestAngle(company({ produces_content: "as_vezes" }))).toBe(
      "conteudo_fraco"
    );
  });

  it("não sei e ainda não olhei caem no frio, não em chute", () => {
    // Chutar aqui é o único jeito de a mensagem sair dizendo algo falso
    // sobre o perfil de quem vai lê-la.
    expect(suggestAngle(company({ produces_content: "nao_sei" }))).toBe("frio");
    expect(suggestAngle(company({ produces_content: "" }))).toBe("frio");
  });
});

describe("outreachVars", () => {
  it("prefere o responsável pela comunicação ao contato genérico", () => {
    const vars = outreachVars(
      company({ comms_name: "Ana", contact: "contato@padaria.com" })
    );
    expect(vars.pessoa).toBe("Ana");
  });

  it("usa o ramo em minúscula, que entra no meio da frase", () => {
    expect(outreachVars(company()).ramo).toBe("alimentação");
  });
});

describe("renderOutreach", () => {
  it("tira a linha da indicação quando não houve indicação", () => {
    const texto = renderOutreach(
      "Oi!\n\n{{indicacao}} falou pra eu te procurar.\n\nAbraço.",
      outreachVars(company())
    );
    expect(texto).toBe("Oi!\n\nAbraço.");
  });

  it("preenche o que existe", () => {
    const texto = renderOutreach(
      "Oi, {{pessoa}}, sobre a {{empresa}} de {{ramo}}.",
      outreachVars(company({ comms_name: "Ana" }))
    );
    expect(texto).toBe("Oi, Ana, sobre a Padaria do Zé de alimentação.");
  });
});
