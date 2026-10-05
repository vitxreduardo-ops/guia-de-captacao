import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import { COOKIE_NAME, createSessionCookieValue, type Session } from "@/lib/auth";

const SEGREDO = "teste-local-1234567890";
process.env.ADMIN_PASSWORD = SEGREDO;

// Sem cookie: cobre o mapa de subdomínios e o caminho até o login.
const visita = (url: string) => proxy(new NextRequest(url));
const destino = (r: Response) => r.headers.get("location");
const reescrita = (r: Response) => r.headers.get("x-middleware-rewrite");

describe("subdomínios", () => {
  it("raiz do sistema sem sessão vai pro login limpo", async () => {
    expect(destino(await visita("https://sistema.tatuestudio.com.br/"))).toBe(
      "https://sistema.tatuestudio.com.br/login?next=%2F"
    );
  });

  it("/login do subdomínio é o login do app", async () => {
    expect(reescrita(await visita("https://cliente.tatuestudio.com.br/login"))).toBe(
      "https://cliente.tatuestudio.com.br/admin/login"
    );
  });

  it("link antigo com /admin perde o prefixo", async () => {
    expect(destino(await visita("https://sistema.tatuestudio.com.br/admin/agenda?d=1"))).toBe(
      "https://sistema.tatuestudio.com.br/agenda?d=1"
    );
  });

  it("/cliente no sistema troca de subdomínio", async () => {
    expect(destino(await visita("https://sistema.tatuestudio.com.br/cliente/materiais"))).toBe(
      "https://cliente.tatuestudio.com.br/materiais"
    );
  });

  it("links públicos e arquivos passam direto", async () => {
    for (const url of [
      "https://sistema.tatuestudio.com.br/guia/abc",
      "https://cliente.tatuestudio.com.br/cliente/manifest.webmanifest",
      "https://cliente.tatuestudio.com.br/api/favicon",
    ]) {
      const r = await visita(url);
      expect(destino(r)).toBeNull();
      expect(reescrita(r)).toBeNull();
    }
  });

  it("www segue como antes", async () => {
    expect(destino(await visita("https://www.tatuestudio.com.br/admin"))).toBe(
      "https://www.tatuestudio.com.br/admin/login?next=%2Fadmin"
    );
  });
});

describe("com sessão", () => {
  const logado = async (url: string, role: Session["role"]) => {
    const valor = await createSessionCookieValue({ userId: "u1", role, allowedSections: null }, SEGREDO);
    return proxy(new NextRequest(url, { headers: { cookie: `${COOKIE_NAME}=${valor}` } }));
  };

  it("admin no sistema vê a página por dentro do /admin", async () => {
    expect(reescrita(await logado("https://sistema.tatuestudio.com.br/agenda", "admin"))).toBe(
      "https://sistema.tatuestudio.com.br/admin/agenda"
    );
  });

  it("cliente no sistema vai pro subdomínio dele", async () => {
    expect(destino(await logado("https://sistema.tatuestudio.com.br/agenda", "client"))).toBe(
      "https://cliente.tatuestudio.com.br/"
    );
  });

  it("cliente logado no /login vai pro portal", async () => {
    expect(destino(await logado("https://cliente.tatuestudio.com.br/login", "client"))).toBe(
      "https://cliente.tatuestudio.com.br/"
    );
  });
});
