import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { fimDoDia, slugAleatorio, slugValido, urlValida } from "@/lib/shortLinkSlug";

const FUSO = "America/Sao_Paulo";
const DIAS_NO_GRAFICO = 14;

export interface ShortLink {
  id: string;
  slug: string;
  url: string;
  rotulo: string;
  client_id: string | null;
  avisar_primeiro_clique: boolean;
  primeiro_clique_em: string | null;
  ativo: boolean;
  expira_em: string | null;
  utm: boolean;
  cliques: number;
  created_at: string;
}

export interface ShortLinkClique {
  em: string;
  aparelho: string;
  pais: string | null;
  origem: string | null;
}

export interface ShortLinkStats {
  /** Últimos 14 dias, do mais antigo pro de hoje. `dia` em AAAA-MM-DD (Brasília). */
  dias: { dia: string; n: number }[];
  aparelhos: Record<string, number>;
  ultimos: ShortLinkClique[];
}

export type ShortLinkComStats = ShortLink & {
  stats: ShortLinkStats;
  /** Prazo já passou. Calculado aqui pra tela e servidor não discordarem. */
  expirado: boolean;
  /** Prazo em AAAA-MM-DD (Brasília), pro campo de data. */
  expiraDia: string;
};

/** AAAA-MM-DD no fuso de Brasília: o dia que a pessoa enxerga, não o do servidor (UTC). */
const diaLocal = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: FUSO });

export async function listShortLinks(): Promise<ShortLinkComStats[]> {
  const db = getSupabaseServerClient();
  const { data: links, error } = await db
    .from("short_links")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;

  // ponytail: uma consulta com os cliques dos últimos 14 dias de todos os
  // links; passando de ~5 mil cliques, agregar no banco (view ou rpc).
  const desde = new Date(Date.now() - DIAS_NO_GRAFICO * 86_400_000).toISOString();
  const { data: cliques, error: erroCliques } = await db
    .from("short_link_clicks")
    .select("link_id, clicked_at, aparelho, pais, origem")
    .gte("clicked_at", desde)
    .order("clicked_at", { ascending: false })
    .limit(5000);
  if (erroCliques) throw erroCliques;

  const hoje = Date.now();
  const dias = Array.from({ length: DIAS_NO_GRAFICO }, (_, i) =>
    diaLocal(new Date(hoje - (DIAS_NO_GRAFICO - 1 - i) * 86_400_000)),
  );

  return (links ?? []).map((link: ShortLink) => {
    const meus = (cliques ?? []).filter((c) => c.link_id === link.id);
    const porDia = new Map<string, number>();
    const aparelhos: Record<string, number> = {};
    for (const c of meus) {
      const dia = diaLocal(new Date(c.clicked_at));
      porDia.set(dia, (porDia.get(dia) ?? 0) + 1);
      aparelhos[c.aparelho] = (aparelhos[c.aparelho] ?? 0) + 1;
    }
    return {
      ...link,
      expirado: !!link.expira_em && new Date(link.expira_em).getTime() < hoje,
      expiraDia: link.expira_em ? diaLocal(new Date(link.expira_em)) : "",
      stats: {
        dias: dias.map((dia) => ({ dia, n: porDia.get(dia) ?? 0 })),
        aparelhos,
        ultimos: meus.slice(0, 5).map((c) => ({
          em: c.clicked_at,
          aparelho: c.aparelho,
          pais: c.pais,
          origem: c.origem,
        })),
      },
    };
  });
}

export interface ResolvedLink {
  url: string;
  linkId: string;
  rotulo: string;
  avisar: boolean;
  primeiro: boolean;
  utm: boolean;
}

/** Devolve o destino e registra o clique (se não for robô); null se o slug não existe. */
export async function resolveShortLink(
  slug: string,
  info: { aparelho: string; pais: string | null; origem: string | null; robo: boolean },
): Promise<ResolvedLink | null> {
  const { data, error } = await getSupabaseServerClient().rpc("registrar_clique_link", {
    p_slug: slug,
    p_aparelho: info.aparelho,
    p_pais: info.pais,
    p_origem: info.origem,
    p_robo: info.robo,
  });
  if (error) throw error;
  const r = (data as { url: string; link_id: string; rotulo: string; avisar: boolean; primeiro: boolean; utm: boolean }[] | null)?.[0];
  return r ? { url: r.url, linkId: r.link_id, rotulo: r.rotulo, avisar: r.avisar, primeiro: r.primeiro, utm: r.utm } : null;
}

export type CriarLinkResultado = { slug: string } | { erro: string };

/**
 * Cria o link curto. Sem nome pedido, reaproveita o que já existe pro mesmo
 * destino (apertar "encurtar" duas vezes não enche a lista) e gera um aleatório.
 */
export async function createShortLink(params: {
  url: string;
  slug?: string;
  rotulo?: string;
  clientId?: string | null;
  avisar?: boolean;
  /** AAAA-MM-DD; vazio = sem prazo. */
  expiraDia?: string;
  utm?: boolean;
}): Promise<CriarLinkResultado> {
  const url = params.url.trim();
  const pedido = (params.slug ?? "").trim().toLowerCase();
  if (!urlValida(url)) return { erro: "Cole um link que comece com http:// ou https://" };
  if (pedido && !slugValido(pedido)) {
    return { erro: "Nome inválido: use letras minúsculas, números e hífen (os que o sistema já usa não valem)." };
  }

  const db = getSupabaseServerClient();
  if (!pedido) {
    const { data } = await db.from("short_links").select("slug").eq("url", url).limit(1).maybeSingle();
    if (data) return { slug: data.slug };
  }

  const linha = {
    url,
    rotulo: (params.rotulo ?? "").trim(),
    client_id: params.clientId || null,
    avisar_primeiro_clique: params.avisar ?? true,
    expira_em: params.expiraDia ? fimDoDia(params.expiraDia) : null,
    utm: params.utm ?? false,
  };
  // Aleatório pode colidir (raro): tenta de novo algumas vezes.
  for (let i = 0; i < (pedido ? 1 : 5); i++) {
    const slug = pedido || slugAleatorio();
    const { error } = await db.from("short_links").insert({ ...linha, slug });
    if (!error) return { slug };
    if (error.code !== "23505") throw error;
    if (pedido) return { erro: "Esse nome já existe, escolha outro." };
  }
  return { erro: "Não consegui gerar um nome livre, tente de novo." };
}

/** Edita um link existente. O endereço curto não muda: quem recebeu continua abrindo o mesmo. */
export async function updateShortLink(
  id: string,
  campos: { url: string; rotulo: string; clientId: string | null; avisar: boolean; ativo: boolean; expiraDia: string; utm: boolean },
): Promise<{ erro: string } | null> {
  const url = campos.url.trim();
  if (!urlValida(url)) return { erro: "Cole um link que comece com http:// ou https://" };
  const { error } = await getSupabaseServerClient()
    .from("short_links")
    .update({
      url,
      rotulo: campos.rotulo.trim(),
      client_id: campos.clientId,
      avisar_primeiro_clique: campos.avisar,
      ativo: campos.ativo,
      expira_em: campos.expiraDia ? fimDoDia(campos.expiraDia) : null,
      utm: campos.utm,
    })
    .eq("id", id);
  if (error) throw error;
  return null;
}
