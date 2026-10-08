import { describe, expect, it } from "vitest";
import {
  contractBlocks,
  applyToggles,
  contractTable,
  joinClauses,
  splitClauses,
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

describe("contractTable", () => {
  it("lê cabeçalho e linhas separados por ' | '", () => {
    expect(contractTable("A | B\n1 | 2\n3 | 4")).toEqual([
      ["A", "B"],
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  it("não vira tabela com uma linha só ou com linha sem coluna", () => {
    expect(contractTable("A | B")).toBeNull();
    expect(contractTable("A | B\ntexto solto")).toBeNull();
  });
});

describe("splitClauses / joinClauses", () => {
  const corpo = "Abertura.\n\n## 1. Objeto\n\nTexto.\n\nOutro.\n\n## 2. Prazo\n\n12 meses.";

  it("separa em cláusulas e volta ao mesmo texto", () => {
    const partes = splitClauses(corpo);
    expect(partes).toEqual([
      { title: null, text: "Abertura." },
      { title: "1. Objeto", text: "Texto.\n\nOutro." },
      { title: "2. Prazo", text: "12 meses." },
    ]);
    expect(joinClauses(partes)).toBe(corpo);
  });

  it("aceita \\r\\n do textarea e cláusula sem texto", () => {
    expect(splitClauses("## A\r\n\r\ntexto\r\n\r\n## B")).toEqual([
      { title: "A", text: "texto" },
      { title: "B", text: "" },
    ]);
    expect(joinClauses([{ title: "B", text: "" }])).toBe("## B");
  });

  it("corpo vazio não tem cláusulas", () => {
    expect(splitClauses("")).toEqual([]);
  });
});

describe("applyToggles", () => {
  const corpo = [
    "## Cláusula 1 — Partes",
    "texto solto.",
    "## Cláusula 2 — Objeto",
    "2.1. Primeiro.",
    "[[off]] 2.2. Segundo, desligado.",
    "A | B\n1 | 2",
    "2.3. Terceiro, conforme a Cláusula 3.",
    "2.3.1. Filho.",
    "## Cláusula 3 — Prazos",
    "3.1. Item, ver Cláusula 2.3.",
  ].join("\n\n");

  it("sem nada desligado, devolve o mesmo texto", () => {
    const limpo = corpo.replace("[[off]] ", "");
    expect(applyToggles(limpo)).toBe(limpo);
  });

  it("item desligado some com o que o explica e fecha a numeração", () => {
    const saida = applyToggles(corpo);
    expect(saida).not.toContain("Segundo");
    expect(saida).not.toContain("A | B");
    expect(saida).toContain("2.2. Terceiro, conforme a Cláusula 3.");
    expect(saida).toContain("2.2.1. Filho.");
    // a referência acompanha o item que mudou de número
    expect(saida).toContain("ver Cláusula 2.2.");
  });

  it("cláusula desligada renumera as seguintes e as referências a elas", () => {
    const saida = applyToggles(
      corpo.replace("## Cláusula 2 — Objeto", "## [[off]] Cláusula 2 — Objeto")
    );
    expect(saida).toContain("## Cláusula 2 — Prazos");
    expect(saida).toContain("2.1. Item");
    expect(saida).not.toContain("Terceiro");
  });

  it("item pai desligado leva os filhos", () => {
    const saida = applyToggles(
      corpo.replace("\n\n2.3. Terceiro", "\n\n[[off]] 2.3. Terceiro")
    );
    expect(saida).not.toContain("Filho");
  });
});
