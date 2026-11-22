import { NextResponse, after, type NextRequest } from "next/server";
import { aparelhoDoUserAgent, comUtm, ehRobo, slugValido } from "@/lib/shortLinkSlug";
import { resolveShortLink } from "@/lib/shortLinks";
import { notifyAdmins } from "@/lib/notifications";
import { slugify } from "@/lib/slug";

/**
 * Encurtador: tatuestudio.com.br/<slug>. Rota estática do app (guia, login…)
 * sempre ganha desta, e `slugValido` impede criar slug com esses nomes.
 * 302 e não 301: o destino pode ser trocado e o navegador não pode guardar.
 */
async function tratar(request: NextRequest, params: Promise<{ slug: string }>, soDestino: boolean) {
  const { slug } = await params;
  const casa = new URL("/", request.url);
  if (!slugValido(slug)) return NextResponse.redirect(casa, 302);

  const ua = request.headers.get("user-agent") ?? "";
  let origem: string | null = null;
  try {
    origem = new URL(request.headers.get("referer") ?? "").hostname || null;
  } catch {}

  const link = await resolveShortLink(slug, {
    aparelho: aparelhoDoUserAgent(ua),
    pais: request.headers.get("x-vercel-ip-country"),
    origem,
    robo: soDestino || ehRobo(ua),
  });
  if (!link) return NextResponse.redirect(casa, 302);

  // Depois da resposta: o aviso (push, campainha) não atrasa quem clicou.
  if (link.primeiro && link.avisar) {
    after(() =>
      notifyAdmins({
        actorId: null,
        kind: "link_opened",
        title: `${link.rotulo || `tatuestudio.com.br/${slug}`} foi aberto`,
        body: `Primeiro clique às ${new Date().toLocaleTimeString("pt-BR", { timeStyle: "short", timeZone: "America/Sao_Paulo" })}`,
        link: "/admin/links",
        entityId: link.linkId,
      }).catch((err) => console.error("Falha no aviso de link aberto", err)),
    );
  }
  return NextResponse.redirect(link.utm ? comUtm(link.url, slugify(link.rotulo) || slug) : link.url, 302);
}

export const GET = (request: NextRequest, { params }: { params: Promise<{ slug: string }> }) =>
  tratar(request, params, false);

// HEAD é verificador de link, nunca pessoa: resolve o destino sem contar clique.
export const HEAD = (request: NextRequest, { params }: { params: Promise<{ slug: string }> }) =>
  tratar(request, params, true);
