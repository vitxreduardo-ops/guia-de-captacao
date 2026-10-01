import "server-only";
import { getCurrentClientScope } from "@/lib/clientAccess";
import { listGalleryClients } from "@/lib/galleries";
import { listGuideClientNames } from "@/lib/guides";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const MAX_GUIAS = 5;
const MAX_CARACTERES = 6000;

type GuiaComCenas = {
  title: string;
  videos: { title: string; position: number; scenes: { script: string; position: number }[] }[];
};

/**
 * Os roteiros já planejados nos guias do cliente, em texto, pro chat pegar
 * o jeito de falar e não repetir pauta. Vem dos guias porque o histórico do
 * gerador não guarda cliente.
 *
 * ponytail: só os 5 guias mais recentes e corta em 6 mil caracteres; se
 * precisar de mais memória do cliente, resumir os antigos em vez de mandar tudo.
 */
// ilike sem curinga = igual sem diferenciar maiúscula; escapa % e _ do nome.
const nomeExato = (nome: string) => nome.trim().replace(/[%_\\]/g, "\\$&");

/**
 * Clientes do seletor do chat. Sem restrição: cadastro + nomes usados nos
 * guias. Com acesso restrito: só os clientes cadastrados que a pessoa pode
 * ver (nome solto de guia não tem id pra conferir).
 */
export async function clientesDoChat(): Promise<string[]> {
  const scope = await getCurrentClientScope();
  if (scope === null) return (await listGuideClientNames()).map((c) => c.nome);
  return (await listGalleryClients({ clientScope: scope })).map((c) => c.name);
}

/** Pode usar este cliente no chat? Mesma regra do seletor. */
export async function clientePermitido(nome: string): Promise<boolean> {
  const scope = await getCurrentClientScope();
  if (scope === null) return true;
  const perfil = await perfilDoCliente(nome);
  return perfil !== null && scope.includes(perfil.id);
}

/** Cliente do cadastro com esse nome, ou null se o nome só existe nos guias. */
export async function perfilDoCliente(
  nome: string
): Promise<{ id: string; descricao: string } | null> {
  if (!nome.trim()) return null;
  const { data, error } = await getSupabaseServerClient()
    .from("gallery_clients")
    .select("id, descricao_roteiro")
    .ilike("name", nomeExato(nome))
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? { id: data.id, descricao: data.descricao_roteiro ?? "" } : null;
}

export async function salvarDescricaoDoCliente(id: string, descricao: string) {
  const { error } = await getSupabaseServerClient()
    .from("gallery_clients")
    .update({ descricao_roteiro: descricao })
    .eq("id", id);
  if (error) throw error;
}

export async function contextoDoCliente(cliente: string): Promise<string> {
  const nome = cliente.trim();
  if (!nome) return "";

  const { data, error } = await getSupabaseServerClient()
    .from("guides")
    .select("title, videos(title, position, scenes(script, position))")
    .ilike("client_name", nomeExato(nome))
    .order("created_at", { ascending: false })
    .limit(MAX_GUIAS);
  if (error) throw error;

  const linhas: string[] = [];
  for (const guia of (data ?? []) as GuiaComCenas[]) {
    linhas.push(`Guia: ${guia.title}`);
    for (const video of [...guia.videos].sort((a, b) => a.position - b.position)) {
      const cenas = [...video.scenes]
        .sort((a, b) => a.position - b.position)
        .map((c) => c.script.trim())
        .filter(Boolean);
      if (cenas.length === 0) continue;
      linhas.push(`- Vídeo "${video.title}": ${cenas.join(" / ")}`);
    }
  }

  const texto = linhas.join("\n");
  return texto.length > MAX_CARACTERES ? `${texto.slice(0, MAX_CARACTERES)}…` : texto;
}
