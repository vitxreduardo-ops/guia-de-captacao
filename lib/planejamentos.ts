import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { parseContent, type PlanejamentoContent } from "@/lib/planejamentoTypes";

export interface Planejamento {
  id: string;
  client_id: string;
  slug: string;
  title: string;
  status: "draft" | "published";
  content: PlanejamentoContent;
  created_at: string;
  updated_at: string;
  client_name?: string;
}

type Row = Omit<Planejamento, "content" | "client_name"> & {
  content: unknown;
  client: { name: string } | null;
};

const COLS = "id, client_id, slug, title, status, content, created_at, updated_at, client:gallery_clients(name)";

const norm = (r: Row): Planejamento => ({
  ...r,
  content: parseContent(r.content, new Date(r.created_at)),
  client_name: r.client?.name,
});

function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 50);
}

export async function listPlanejamentos(clientId?: string): Promise<Planejamento[]> {
  let q = getSupabaseServerClient().from("planejamentos").select(COLS).order("created_at", { ascending: false });
  if (clientId) q = q.eq("client_id", clientId);
  const { data, error } = await q;
  if (error) throw error;
  return (data as unknown as Row[]).map(norm);
}

export async function getPlanejamentoBySlug(slug: string): Promise<Planejamento | null> {
  const { data, error } = await getSupabaseServerClient()
    .from("planejamentos")
    .select(COLS)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data ? norm(data as unknown as Row) : null;
}

export async function createPlanejamento(input: {
  clientId: string;
  clientName: string;
  title: string;
  content: PlanejamentoContent;
}): Promise<Planejamento> {
  // Sufixo aleatório: o link não pode ser adivinhado só pelo nome do cliente.
  const slug = `${slugify(`${input.clientName}-${input.title}`) || "planejamento"}-${Math.random().toString(36).slice(2, 7)}`;
  const { data, error } = await getSupabaseServerClient()
    .from("planejamentos")
    .insert({ client_id: input.clientId, slug, title: input.title, content: input.content })
    .select(COLS)
    .single();
  if (error) throw error;
  return norm(data as unknown as Row);
}

export async function setPlanejamentoStatus(id: string, status: "draft" | "published") {
  const { error } = await getSupabaseServerClient()
    .from("planejamentos")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function updatePlanejamentoContent(id: string, content: PlanejamentoContent) {
  const { error } = await getSupabaseServerClient()
    .from("planejamentos")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/** Marcações por planejamento, como chaves "e3:g" (ver chaveMarcacao). */
export async function listMarcacoes(planejamentoIds: string[]): Promise<Map<string, string[]>> {
  const mapa = new Map<string, string[]>();
  if (planejamentoIds.length === 0) return mapa;
  const { data, error } = await getSupabaseServerClient()
    .from("planejamento_marcacoes")
    .select("planejamento_id, entrega_id, passo")
    .in("planejamento_id", planejamentoIds);
  if (error) throw error;
  for (const m of data ?? []) {
    mapa.set(m.planejamento_id, [...(mapa.get(m.planejamento_id) ?? []), `${m.entrega_id}:${m.passo}`]);
  }
  return mapa;
}

export async function setMarcacao(planejamentoId: string, entregaId: string, passo: "g" | "p", feito: boolean) {
  const tabela = getSupabaseServerClient().from("planejamento_marcacoes");
  const { error } = feito
    ? await tabela.upsert({ planejamento_id: planejamentoId, entrega_id: entregaId, passo }, { ignoreDuplicates: true })
    : await tabela.delete().match({ planejamento_id: planejamentoId, entrega_id: entregaId, passo });
  if (error) throw error;
}

export async function deletePlanejamento(id: string) {
  const { error } = await getSupabaseServerClient().from("planejamentos").delete().eq("id", id);
  if (error) throw error;
}
