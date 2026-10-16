import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pixKeyOf } from "@/lib/billingTypes";
import { diaPorExtenso, frasePrazo, linkWhatsApp, quando } from "@/lib/dinheiroTexto";

// "Hoje" fixo: quinta-feira, 15/10/2026.
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 15, 10, 0, 0));
});
afterEach(() => vi.useRealTimers());

describe("quando", () => {
  it("usa palavras para hoje, amanhã e ontem", () => {
    expect(quando("2026-10-15")).toBe("hoje");
    expect(quando("2026-10-16")).toBe("amanhã");
    expect(quando("2026-10-14")).toBe("ontem");
  });

  it("conta dias de atraso e mostra o dia da semana no futuro", () => {
    expect(quando("2026-10-10")).toBe("há 5 dias");
    expect(quando("2026-10-20")).toBe("ter 20");
  });
});

describe("frasePrazo", () => {
  it("diz que não há dia combinado", () => {
    expect(frasePrazo(null)).toBe("sem dia combinado");
  });

  it("fala de vencido, hoje e futuro", () => {
    expect(frasePrazo("2026-10-10")).toBe("venceu há 5 dias");
    expect(frasePrazo("2026-10-14")).toBe("venceu há 1 dia");
    expect(frasePrazo("2026-10-15")).toBe("vence hoje");
    expect(frasePrazo("2026-11-10")).toBe("vence dia 10 de novembro");
  });
});

describe("diaPorExtenso", () => {
  it("tira o zero à esquerda", () => {
    expect(diaPorExtenso("2026-03-05")).toBe("5 de março");
  });
});

describe("linkWhatsApp", () => {
  const cliente = { name: "Clínica Sorriso", contactName: "Juliana Prado", phone: "(11) 98765-4321" };

  it("monta o link com DDI 55 e a mensagem com nome e valor", () => {
    const url = linkWhatsApp(cliente, "outubro de 2026", 120000)!;
    expect(url.startsWith("https://wa.me/5511987654321?text=")).toBe(true);
    const texto = decodeURIComponent(url.split("text=")[1]);
    expect(texto).toContain("Oi, Juliana!");
    expect(texto).toContain("outubro de 2026");
    expect(texto).toMatch(/1\.200,00/);
  });

  it("coloca a chave Pix da conta escolhida, em linha própria", () => {
    const url = linkWhatsApp(cliente, "outubro de 2026", 120000, {
      label: "Inter",
      chave: "53.107.038/0001-24",
    })!;
    const texto = decodeURIComponent(url.split("text=")[1]);
    expect(texto).toContain("Chave Pix (Inter):\n53.107.038/0001-24");
    expect(texto.endsWith("Qualquer dúvida é só chamar!")).toBe(true);
  });

  it("sem conta, a mensagem sai sem o bloco do Pix", () => {
    const url = linkWhatsApp(cliente, "outubro de 2026", 120000)!;
    expect(decodeURIComponent(url.split("text=")[1])).not.toContain("Pix");
  });

  it("não gera link sem telefone válido", () => {
    expect(linkWhatsApp({ ...cliente, phone: null }, "outubro", 100)).toBeNull();
    expect(linkWhatsApp({ ...cliente, phone: "123" }, "outubro", 100)).toBeNull();
  });
});

describe("pixKeyOf", () => {
  it("pega a linha PIX da conta, com ou sem espaços e maiúsculas", () => {
    expect(pixKeyOf("PIX: 53.107.038/0001-24\nBanco: 077 - Inter")).toBe("53.107.038/0001-24");
    expect(pixKeyOf("Banco: X\n  pix :  ana@exemplo.com ")).toBe("ana@exemplo.com");
  });

  it("devolve null quando não há chave", () => {
    expect(pixKeyOf("Banco: 077\nConta: 123")).toBeNull();
    expect(pixKeyOf("PIX:   ")).toBeNull();
  });
});
