import "server-only";
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
export async function contextoDoCliente(cliente: string): Promise<string> {
  const nome = cliente.trim();
  if (!nome) return "";

  const { data, error } = await getSupabaseServerClient()
    .from("guides")
    .select("title, videos(title, position, scenes(script, position))")
    // ilike sem curinga = igual sem diferenciar maiúscula; escapa % e _ do nome.
    .ilike("client_name", nome.replace(/[%_\\]/g, "\\$&"))
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
