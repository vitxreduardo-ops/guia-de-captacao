import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { nextMonths } from "@/lib/editorialMonths";

export interface ClientAreaSummary {
  /** Ideias anotadas no mês atual e nos dois seguintes. */
  ideas: number;
  /** Materiais visíveis ao cliente que ainda esperam o OK dele. */
  waiting: number;
}

/**
 * O resumo de todos os clientes em duas consultas, pro cartão da grade dizer
 * quem precisa de atenção sem abrir um por um.
 */
export async function getClientAreaSummaries(): Promise<Record<string, ClientAreaSummary>> {
  const supabase = getSupabaseServerClient();
  const span = nextMonths(new Date(), 3);
  const first = (m: { year: number; month: number }) =>
    `${m.year}-${String(m.month).padStart(2, "0")}-01`;

  const [ideas, cards] = await Promise.all([
    supabase
      .from("editorial_ideas")
      .select("client_id")
      .gte("month", first(span[0]))
      .lte("month", first(span[2])),
    supabase
      .from("backlog_cards")
      .select("client_id, column:backlog_columns!inner(client_visible)")
      .not("client_id", "is", null)
      .is("approved_at", null)
      .eq("column.client_visible", true),
  ]);
  if (ideas.error) throw ideas.error;
  if (cards.error) throw cards.error;

  const out: Record<string, ClientAreaSummary> = {};
  const slot = (id: string) => (out[id] ??= { ideas: 0, waiting: 0 });
  for (const row of ideas.data ?? []) slot(row.client_id).ideas++;
  for (const row of cards.data ?? []) slot(row.client_id as string).waiting++;
  return out;
}

export interface ClientPost {
  id: string;
  title: string;
  format: string;
  post_date: string;
  /** A coluna do card está liberada ao cliente. */
  visible: boolean;
}

/** Postagens agendadas do cliente entre duas datas (`YYYY-MM-DD`, inclusive). */
export async function listClientPosts(clientId: string, from: string, to: string): Promise<ClientPost[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("backlog_cards")
    .select("id, title, format, post_date, column:backlog_columns(client_visible)")
    .eq("client_id", clientId)
    .gte("post_date", from)
    .lte("post_date", to)
    .order("post_date");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id as string,
    title: row.title as string,
    format: row.format as string,
    post_date: row.post_date as string,
    visible: Boolean((row.column as unknown as { client_visible: boolean } | null)?.client_visible),
  }));
}

export interface ClientMaterial {
  id: string;
  title: string;
  format: string;
  post_date: string | null;
  caption: string;
  drive_url: string | null;
  guide_id: string | null;
  media_image_ids: string[];
  column_id: string;
  column_name: string;
  column_visible: boolean;
  approved_at: string | null;
  changes_requested_at: string | null;
}

/** Todos os materiais do cliente, em qualquer coluna, pra equipe gerenciar. */
export async function listClientMaterials(clientId: string): Promise<ClientMaterial[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("backlog_cards")
    .select(
      "id, title, format, post_date, caption, drive_url, guide_id, media_image_ids, column_id, approved_at, changes_requested_at, column:backlog_columns(name, client_visible)"
    )
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => {
    const column = row.column as unknown as { name: string; client_visible: boolean } | null;
    return {
      id: row.id as string,
      title: row.title as string,
      format: row.format as string,
      post_date: row.post_date as string | null,
      caption: (row.caption as string) ?? "",
      drive_url: row.drive_url as string | null,
      guide_id: row.guide_id as string | null,
      media_image_ids: (row.media_image_ids as string[]) ?? [],
      column_id: row.column_id as string,
      column_name: column?.name ?? "",
      column_visible: Boolean(column?.client_visible),
      approved_at: row.approved_at as string | null,
      changes_requested_at: row.changes_requested_at as string | null,
    };
  });
}
