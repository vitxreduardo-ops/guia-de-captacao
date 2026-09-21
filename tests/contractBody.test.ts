import { describe, expect, it } from "vitest";
import {
  contractBlocks,
  missingContractVars,
  renderContractBody,
} from "@/lib/contractBody";

const base = {
  client_name: "Padaria do Zé",
  client_document: "12.345.678/0001-90",
  scope: "Quatro vídeos por mês.",
  price: 2500,
  payment_terms: "Todo dia 5.",
  start_date: "2026-10-01",
  duration_months: 6,
};

describe("renderContractBody", () => {
  it("troca as variáveis preenchidas", () => {
    const texto = renderContractBody(
      "{{cliente}} paga {{valor}} a partir de {{inicio}}, por {{meses}} meses.",
      base
    );
    // `R$\u00a0` com espaço fixo é o que o Intl devolve em pt-BR; escrever o
    // espaço comum aqui faz o teste falhar com as duas strings idênticas na
    // tela.
    expect(texto).toBe(
      "Padaria do Zé paga R$\u00a02.500,00 a partir de 01/10/2026, por 6 meses."
    );
  });

  it("mantém a variável visível quando o campo está vazio", () => {
    const texto = renderContractBody("Valor de {{valor}}.", {
      ...base,
      price: 0,
    });
    expect(texto).toBe("Valor de {{valor}}.");
  });

  it("não desloca a data pelo fuso do servidor", () => {
    const texto = renderContractBody("{{inicio}}", {
      ...base,
      start_date: "2026-01-01",
    });
    expect(texto).toBe("01/01/2026");
  });

  it("lista só as variáveis citadas que faltam", () => {
    const faltando = missingContractVars("{{cliente}} {{valor}} {{escopo}}", {
      ...base,
      price: 0,
      scope: "",
    });
    expect(faltando).toEqual(["valor", "escopo"]);
  });
});

describe("contractBlocks", () => {
  it("separa parágrafos quando o textarea manda CRLF", () => {
    expect(contractBlocks("## Partes\r\n\r\nTexto da cláusula.")).toEqual([
      "## Partes",
      "Texto da cláusula.",
    ]);
  });

  it("separa parágrafos com quebra normal", () => {
    expect(contractBlocks("Um.\n\nDois.")).toEqual(["Um.", "Dois."]);
  });
});
