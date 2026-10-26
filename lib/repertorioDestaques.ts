import "server-only";
import { chatJson, MODELO_ROTEIRO } from "@/lib/roteiroAi";
import { noticiasDoTemaDesde } from "@/lib/repertorio";
import {
  inicioDaSemana,
  listaParaIa,
  montarDestaques,
  promptDestaques,
  schemaDestaques,
  type ConteudoDestaques,
  type DestaquesDaSemana,
} from "@/lib/repertorioIa";
import { diaDe } from "@/lib/repertorioTypes";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const TABELA = "repertorio_destaques";
/** Mínimo de notícias pra valer um resumo: com menos, é mais rápido ler a lista. */
const MINIMO = 3;
const MAXIMO = 60;

type Linha = {
  id: string;
  tema: string;
  semana: string;
  conteudo: ConteudoDestaques;
  total_noticias: number;
  gerado_em: string;
};

function paraDestaques(linha: Linha): DestaquesDaSemana {
  return {
    id: linha.id,
    tema: linha.tema,
    semana: linha.semana,
    totalNoticias: linha.total_noticias,
    geradoEm: linha.gerado_em,
    panorama: linha.conteudo?.panorama ?? "",
    destaques: linha.conteudo?.destaques ?? [],
    tendencias: linha.conteudo?.tendencias ?? [],
  };
}

/** O destaque mais recente do tema, desta semana ou de uma anterior. */
export async function ultimoDestaque(tema: string): Promise<DestaquesDaSemana | null> {
  const { data, error } = await getSupabaseServerClient()
    .from(TABELA)
    .select("id, tema, semana, conteudo, total_noticias, gerado_em")
    .eq("tema", tema)
    .order("semana", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Erro ao carregar destaques: ${error.message}`);
  return data ? paraDestaques(data as Linha) : null;
}

export function semanaAtual(agora = new Date()): string {
  return inicioDaSemana(diaDe(agora.toISOString()));
}

/**
 * Lê as notícias do tema dos últimos 7 dias, pede o resumo à IA e grava.
 * Gerar de novo na mesma semana substitui o anterior.
 */
export async function gerarDestaques(tema: string): Promise<DestaquesDaSemana> {
  const agora = new Date();
  const desde = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const noticias = await noticiasDoTemaDesde(tema, desde, MAXIMO);
  if (noticias.length < MINIMO) {
    throw new Error(
      noticias.length === 0
        ? `Não há notícias de ${tema} nos últimos 7 dias. Atualize as fontes e tente de novo.`
        : `Só ${noticias.length === 1 ? "1 notícia" : `${noticias.length} notícias`} de ${tema} nos últimos 7 dias: mais rápido ler a lista.`
    );
  }

  const { texto, usadas } = listaParaIa(noticias);
  const resposta = await chatJson<Parameters<typeof montarDestaques>[0]>({
    model: MODELO_ROTEIRO,
    system: promptDestaques(tema),
    user: texto,
    schema: schemaDestaques,
    temperature: 0.4,
  });
  const conteudo = montarDestaques(resposta, usadas);
  if (conteudo.destaques.length === 0) {
    throw new Error("A IA não devolveu nenhum destaque ligado às notícias. Tente de novo.");
  }

  const { data, error } = await getSupabaseServerClient()
    .from(TABELA)
    .upsert(
      {
        tema,
        semana: semanaAtual(agora),
        conteudo,
        total_noticias: usadas.length,
        modelo: MODELO_ROTEIRO,
        gerado_em: agora.toISOString(),
      },
      { onConflict: "tema,semana" }
    )
    .select("id, tema, semana, conteudo, total_noticias, gerado_em")
    .single();
  if (error) throw new Error(`Erro ao salvar destaques: ${error.message}`);
  return paraDestaques(data as Linha);
}
