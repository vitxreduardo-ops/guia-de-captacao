import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAME, getSession } from "@/lib/auth";

// Subdomínio → pasta de dentro do app. sistema.tatuestudio.com.br/agenda é
// /admin/agenda por dentro; no www (e no localhost) tudo segue como antes.
const SUBDOMINIOS: Record<string, string> = { sistema: "/admin", cliente: "/cliente" };

// Rotas da raiz que valem em qualquer subdomínio: links públicos que o painel
// gera a partir do host atual, a API e os ícones.
const RAIZ = new Set([
  "api", "briefing", "contrato", "convite", "galeria", "guia", "orcamento",
  "signup", "splash", "apple-icon", "_next",
]);

const dentro = (path: string, prefixo: string) =>
  path === prefixo || path.startsWith(prefixo + "/");

export async function proxy(request: NextRequest) {
  const url = request.nextUrl;
  // Header, não `url.hostname`: no dev o Next monta a URL com "localhost".
  const host = (request.headers.get("host") ?? url.host).split(":")[0];
  const [sub, ...resto] = host.split(".");
  const prefixo = SUBDOMINIOS[sub];
  // Arquivo (o manifesto do portal) nunca muda de endereço.
  const arquivo = /\.[a-z]+$/i.test(url.pathname);

  /** Caminho interno → endereço que o navegador deve ver. */
  const fora = (interno: string): URL => {
    const alvo = url.clone();
    alvo.hostname = host;
    alvo.pathname = interno;
    alvo.search = "";
    if (!prefixo) return alvo;
    if (interno === "/admin/login") {
      alvo.pathname = "/login";
      return alvo;
    }
    for (const [outroSub, outroPrefixo] of Object.entries(SUBDOMINIOS)) {
      if (dentro(interno, outroPrefixo)) {
        alvo.hostname = [outroSub, ...resto].join(".");
        alvo.pathname = interno.slice(outroPrefixo.length) || "/";
      }
    }
    return alvo;
  };

  let path = url.pathname;
  if (prefixo && !arquivo) {
    // Link antigo com prefixo (os do próprio app ainda são assim): manda pro
    // endereço limpo, inclusive trocando de subdomínio se for o caso.
    // ponytail: um salto extra por clique; tirar o /admin dos ~250 hrefs se pesar.
    if (dentro(path, "/admin") || dentro(path, "/cliente")) {
      const alvo = fora(path);
      alvo.search = url.search;
      return NextResponse.redirect(alvo);
    }
    if (path === "/login") path = "/admin/login";
    else if (!RAIZ.has(path.split("/")[1])) path = prefixo + (path === "/" ? "" : path);
  }

  const seguir = () => {
    if (path === url.pathname) return NextResponse.next();
    const alvo = url.clone();
    alvo.pathname = path;
    return NextResponse.rewrite(alvo);
  };

  // O manifesto é buscado pelo navegador sem sessão, para instalar o portal.
  if (path === "/cliente/manifest.webmanifest") return seguir();
  if (!dentro(path, "/admin") && !dentro(path, "/cliente")) return seguir();

  const isLoginPage = path === "/admin/login";
  const secret = process.env.ADMIN_PASSWORD;
  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  const session = secret ? await getSession(cookie, secret) : null;

  const isPortal = dentro(path, "/cliente");
  const home = session?.role === "client" || prefixo === "/cliente" ? "/cliente" : "/admin";

  if (isLoginPage) {
    if (session) {
      return NextResponse.redirect(fora(home));
    }
    return seguir();
  }

  if (!session) {
    const loginUrl = fora("/admin/login");
    loginUrl.searchParams.set("next", url.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Cliente só existe no portal; o resto do sistema é interno.
  if (session.role === "client" && !isPortal) {
    return NextResponse.redirect(fora("/cliente"));
  }
  if (isPortal) return seguir();

  // Admin sempre passa; `allowedSections` nula é "sem restrição" (o padrão).
  // `/admin/usuarios` é sempre admin-only, checado à parte em requireAdmin().
  if (session.role !== "admin" && session.allowedSections !== null) {
    const section = path.split("/")[2];
    if (section && !session.allowedSections.includes(section)) {
      return NextResponse.redirect(fora("/admin"));
    }
  }

  return seguir();
}

export const config = {
  // Tudo menos estáticos: no subdomínio até `/` precisa passar por aqui.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js).*)"],
};
