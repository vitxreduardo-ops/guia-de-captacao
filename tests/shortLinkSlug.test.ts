import { describe, expect, it } from "vitest";
import { aparelhoDoUserAgent, comUtm, ehRobo, fimDoDia, slugAleatorio, slugValido, urlValida } from "@/lib/shortLinkSlug";

describe("encurtador", () => {
  it("aceita slug simples e barra rota do app", () => {
    expect(slugValido("proposta-14bis")).toBe(true);
    expect(slugValido("guia")).toBe(false);
    expect(slugValido("Admin")).toBe(false);
    expect(slugValido("-x")).toBe(false);
    expect(slugValido("a/b")).toBe(false);
  });
  it("só http(s)", () => {
    expect(urlValida("https://exemplo.com/x?y=1")).toBe(true);
    expect(urlValida("javascript:alert(1)")).toBe(false);
  });
  it("aleatório é válido", () => {
    for (let i = 0; i < 50; i++) expect(slugValido(slugAleatorio())).toBe(true);
  });
  it("prévia de mensageiro é robô, navegador de gente não", () => {
    expect(ehRobo("WhatsApp/2.23.20 A")).toBe(true);
    expect(ehRobo("facebookexternalhit/1.1")).toBe(true);
    expect(ehRobo("")).toBe(true);
    const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1";
    expect(ehRobo(iphone)).toBe(false);
    expect(aparelhoDoUserAgent(iphone)).toBe("celular");
    expect(aparelhoDoUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120")).toBe("computador");
  });
  it("UTM entra sem sobrescrever o que já existe", () => {
    expect(comUtm("https://a.com/p?x=1", "proposta-14bis")).toBe(
      "https://a.com/p?x=1&utm_source=tatu&utm_medium=link-curto&utm_campaign=proposta-14bis",
    );
    expect(comUtm("https://a.com/?utm_source=insta", "c")).toContain("utm_source=insta");
    expect(comUtm("https://a.com/?utm_source=insta", "c")).not.toContain("utm_source=tatu");
  });
  it("prazo vai até o fim do dia em Brasília", () => {
    expect(fimDoDia("2026-12-31")).toBe("2027-01-01T02:59:59.000Z");
    expect(fimDoDia("31/12/2026")).toBeNull();
    expect(fimDoDia("")).toBeNull();
  });
});
