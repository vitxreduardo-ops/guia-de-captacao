import { NextResponse, type NextRequest } from "next/server";

/**
 * Logo dos links da Biblioteca. O serviço de favicon do Google responde 301
 * pro gstatic, e é esse salto que o navegador barra (`NotSameOrigin`) porque o
 * redirecionamento em si não traz `Cross-Origin-Resource-Policy`. Pedir daqui
 * resolve isso e ainda tira o Google do caminho do navegador de quem usa o
 * admin: quem revela os domínios da biblioteca passa a ser o servidor.
 */

/** Endpoint final, sem o 301 do `google.com/s2/favicons`. */
const FAVICON_ENDPOINT = "https://t0.gstatic.com/faviconV2";

/** Hostname simples: rótulos alfanuméricos separados por ponto. */
const HOSTNAME = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get("domain") ?? "";
  if (!HOSTNAME.test(domain)) {
    return NextResponse.json({ error: "Domínio inválido" }, { status: 400 });
  }

  // O domínio pedido vai como parâmetro; o host buscado é sempre o gstatic.
  const target = new URL(FAVICON_ENDPOINT);
  target.searchParams.set("client", "SOCIAL");
  target.searchParams.set("type", "FAVICON");
  target.searchParams.set("fallback_opts", "TYPE,SIZE,URL");
  target.searchParams.set("url", `https://${domain}`);
  target.searchParams.set("size", "64");

  let upstream: Response;
  try {
    upstream = await fetch(target, { signal: AbortSignal.timeout(5000) });
  } catch {
    return NextResponse.json({ error: "Sem favicon" }, { status: 404 });
  }

  const contentType = upstream.headers.get("content-type") ?? "";
  if (!upstream.ok || !contentType.startsWith("image/")) {
    return NextResponse.json({ error: "Sem favicon" }, { status: 404 });
  }

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": contentType,
      // Favicon muda de ano em ano; um dia de cache já poupa a ida ao gstatic
      // em toda visita à Biblioteca.
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
