import { describe, expect, it } from "vitest";
import { sessionCookieOptions } from "@/lib/auth";

describe("cookie de sessão", () => {
  it("vale pro domínio todo nos subdomínios, pra prévia do portal achar o login", () => {
    expect(sessionCookieOptions("sistema.tatuestudio.com.br").domain).toBe("tatuestudio.com.br");
    expect(sessionCookieOptions("cliente.tatuestudio.com.br:443").domain).toBe("tatuestudio.com.br");
  });

  it("fica só no host no localhost e em outros endereços", () => {
    expect(sessionCookieOptions("localhost:3000").domain).toBeUndefined();
    expect(sessionCookieOptions("guia-de-captacao.vercel.app").domain).toBeUndefined();
  });
});
