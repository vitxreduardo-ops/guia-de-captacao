import "server-only";
import { feedPermitido, parseFeed } from "@/lib/rss";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  POR_PAGINA,
  termosDaBusca,
  type FiltroNoticias,
  type Fonte,
  type Noticia,
  type ResultadoColeta,
} from "@/lib/repertorioTypes";

const FONTES = "repertorio_fontes";
const NOTICIAS = "repertorio_noticias";

/** Teto por feed a cada coleta: portal grande manda até 100 itens de uma vez. */
const MAX_ITENS_POR_FEED = 50;
const TEMPO_LIMITE_MS = 15_000;
// Alguns portais recusam pedido sem User-Agent. Este diz quem é e por quê.
const USER_AGENT = "TatuRepertorio/1.0 (leitor de RSS; +https://tatuestudio.com.br)";

export async function listFontes(): Promise<Fonte[]> {
  const { data, error } = await getSupabaseServerClient()
    .from(FONTES)
    .select("*")
    .order("tema")
    .order("nome");
  if (error) throw new Error(`Erro ao carregar fontes: ${error.message}`);
  return (data ?? []) as Fonte[];
}

export async function getFonte(id: string): Promise<Fonte | null> {
  const { data, error } = await getSupabaseServerClient()
    .from(FONTES)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data as Fonte;
}

/** Temas que viram abas: só os de fonte ativa, pra aba vazia não aparecer. */
export function temasDe(fontes: Fonte[]): string[] {
  return [...new Set(fontes.filter((f) => f.ativa).map((f) => f.tema.trim()).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b, "pt-BR")
  );
}

export async function createFonte(fonte: { nome: string; feedUrl: string; tema: string }): Promise<Fonte> {
  const { data, error } = await getSupabaseServerClient()
    .from(FONTES)
    .insert({ nome: fonte.nome, feed_url: fonte.feedUrl, tema: fonte.tema })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") throw new Error("Esse feed já está cadastrado.");
    throw new Error(`Erro ao salvar fonte: ${error.message}`);
  }
  return data as Fonte;
}

export async function updateFonte(
  id: string,
  mudanca: Partial<Pick<Fonte, "nome" | "tema" | "ativa">>
) {
  const { error } = await getSupabaseServerClient().from(FONTES).update(mudanca).eq("id", id);
  if (error) throw new Error(`Erro ao atualizar fonte: ${error.message}`);
}

/** Apaga a fonte e as notícias dela (cascade), inclusive as guardadas. */
export async function deleteFonte(id: string) {
  const { error } = await getSupabaseServerClient().from(FONTES).delete().eq("id", id);
  if (error) throw new Error(`Erro ao apagar fonte: ${error.message}`);
}

type LinhaNoticia = {
  id: string;
  url: string;
  titulo: string;
  resumo: string;
  publicado_em: string | null;
  coletado_em: string;
  guardada: boolean;
  lida: boolean;
  fonte: { id: string; nome: string; tema: string; ativa: boolean };
};

// `ativa` vem junto porque o filtro de fonte desligada é feito sobre ela.
const SELECT_NOTICIA =
  "id, url, titulo, resumo, publicado_em, coletado_em, guardada, lida, fonte:repertorio_fontes!inner(id, nome, tema, ativa)";

function paraNoticia(linha: LinhaNoticia): Noticia {
  return {
    id: linha.id,
    url: linha.url,
    titulo: linha.titulo,
    resumo: linha.resumo,
    publicadoEm: linha.publicado_em,
    coletadoEm: linha.coletado_em,
    guardada: linha.guardada,
    lida: linha.lida,
    fonte: { id: linha.fonte.id, nome: linha.fonte.nome, tema: linha.fonte.tema },
  };
}

/**
 * Uma página da lista, mais recente primeiro. Pede uma a mais pra saber se
 * existe próxima página sem contar a tabela inteira.
 *
 * ponytail: a busca é `ilike`, então acento conta ("noticia" não acha
 * "notícia"). Se incomodar, coluna gerada com `unaccent` e índice trigram.
 */
export async function listNoticias(
  filtro: FiltroNoticias
): Promise<{ noticias: Noticia[]; temMais: boolean }> {
  const inicio = (filtro.pagina - 1) * POR_PAGINA;
  let consulta = getSupabaseServerClient()
    .from(NOTICIAS)
    .select(SELECT_NOTICIA)
    .eq("fonte.ativa", true)
    .order("publicado_em", { ascending: false, nullsFirst: false })
    .order("coletado_em", { ascending: false })
    .range(inicio, inicio + POR_PAGINA);

  if (filtro.tema) consulta = consulta.eq("fonte.tema", filtro.tema);
  if (filtro.visao === "guardadas") consulta = consulta.eq("guardada", true);
  if (filtro.visao === "nao-lidas") consulta = consulta.eq("lida", false);
  for (const termo of termosDaBusca(filtro.busca)) {
    consulta = consulta.or(`titulo.ilike.*${termo}*,resumo.ilike.*${termo}*`);
  }

  const { data, error } = await consulta;
  if (error) throw new Error(`Erro ao carregar notícias: ${error.message}`);
  const linhas = (data ?? []) as unknown as LinhaNoticia[];
  return {
    noticias: linhas.slice(0, POR_PAGINA).map(paraNoticia),
    temMais: linhas.length > POR_PAGINA,
  };
}

export async function getNoticia(id: string): Promise<Noticia | null> {
  const { data, error } = await getSupabaseServerClient()
    .from(NOTICIAS)
    .select(SELECT_NOTICIA)
    .eq("id", id)
    .maybeSingle();
  // Id malformado volta erro de sintaxe do uuid: tratado como "não achou".
  if (error || !data) return null;
  return paraNoticia(data as unknown as LinhaNoticia);
}

/** Notícias de um tema desde uma data, para os destaques da semana. */
export async function noticiasDoTemaDesde(tema: string, desde: string, limite: number): Promise<Noticia[]> {
  const { data, error } = await getSupabaseServerClient()
    .from(NOTICIAS)
    .select(SELECT_NOTICIA)
    .eq("fonte.ativa", true)
    .eq("fonte.tema", tema)
    .gte("coletado_em", desde)
    .order("publicado_em", { ascending: false, nullsFirst: false })
    .limit(limite);
  if (error) throw new Error(`Erro ao carregar notícias: ${error.message}`);
  return ((data ?? []) as unknown as LinhaNoticia[]).map(paraNoticia);
}

export async function marcarNoticia(id: string, mudanca: { guardada?: boolean; lida?: boolean }) {
  const { error } = await getSupabaseServerClient().from(NOTICIAS).update(mudanca).eq("id", id);
  if (error) throw new Error(`Erro ao atualizar notícia: ${error.message}`);
}

function mensagemDeErro(err: unknown): string {
  if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")) {
    return "O site demorou mais de 15 segundos para responder.";
  }
  return err instanceof Error ? err.message : String(err);
}

/** Busca um feed e grava o que for novo. Devolve quantas notícias entraram. */
export async function coletarFonte(fonte: Pick<Fonte, "id" | "feed_url">): Promise<number> {
  const supabase = getSupabaseServerClient();
  try {
    if (!feedPermitido(fonte.feed_url)) throw new Error("Endereço de feed não permitido.");
    const resposta = await fetch(fonte.feed_url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.9, */*;q=0.5",
      },
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
      cache: "no-store",
    });
    if (!resposta.ok) {
      throw new Error(
        resposta.status === 403 || resposta.status === 401
          ? `O site recusou a leitura (erro ${resposta.status}).`
          : `O site respondeu com erro ${resposta.status}.`
      );
    }
    const itens = parseFeed(await resposta.text()).slice(0, MAX_ITENS_POR_FEED);
    if (itens.length === 0) {
      throw new Error("Nenhuma notícia encontrada. Confira se o endereço é de um feed RSS.");
    }

    // ignoreDuplicates: link que já existe fica como está (guardada e lida
    // não voltam pro padrão), e o retorno traz só as linhas novas.
    const { data, error } = await supabase
      .from(NOTICIAS)
      .upsert(
        itens.map((item) => ({
          fonte_id: fonte.id,
          url: item.url,
          titulo: item.titulo.slice(0, 500),
          resumo: item.resumo,
          publicado_em: item.publicadoEm,
        })),
        { onConflict: "url", ignoreDuplicates: true }
      )
      .select("id");
    if (error) throw new Error(`Erro ao gravar notícias: ${error.message}`);

    await supabase
      .from(FONTES)
      .update({ ultima_coleta_em: new Date().toISOString(), ultimo_erro: null })
      .eq("id", fonte.id);
    return data?.length ?? 0;
  } catch (err) {
    const erro = mensagemDeErro(err);
    await supabase.from(FONTES).update({ ultimo_erro: erro }).eq("id", fonte.id);
    throw new Error(erro);
  }
}

/** Coleta todas as fontes ativas em paralelo. Uma fonte com erro não para as outras. */
export async function coletarFontes(): Promise<ResultadoColeta> {
  const { data, error } = await getSupabaseServerClient()
    .from(FONTES)
    .select("id, nome, feed_url")
    .eq("ativa", true);
  if (error) throw new Error(`Erro ao carregar fontes: ${error.message}`);
  const fontes = (data ?? []) as Pick<Fonte, "id" | "nome" | "feed_url">[];

  const resultados = await Promise.allSettled(fontes.map((fonte) => coletarFonte(fonte)));
  const resultado: ResultadoColeta = { fontes: fontes.length, novas: 0, erros: [] };
  resultados.forEach((r, i) => {
    if (r.status === "fulfilled") resultado.novas += r.value;
    else resultado.erros.push({ nome: fontes[i].nome, erro: mensagemDeErro(r.reason) });
  });
  return resultado;
}
