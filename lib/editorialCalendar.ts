import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { EditorialIdea } from "@/lib/editorialMonths";

const IDEA_SELECT =
  "id, month, title, notes, internal, creator:created_by(username, role)";

type IdeaRow = Omit<EditorialIdea, "created_by_name" | "created_by_role"> & {
  creator: { username: string; role: EditorialIdea["created_by_role"] } | null;
};

function toIdea({ creator, ...idea }: IdeaRow): EditorialIdea {
  return {
    ...idea,
    created_by_name: creator?.username ?? null,
    created_by_role: creator?.role ?? null,
  };
}

/** Ideias entre dois dias 1 (inclusive), `YYYY-MM-01`. */
export async function listIdeasBetween(
  clientId: string,
  from: string,
  to: string,
  options: { includeInternal: boolean }
): Promise<EditorialIdea[]> {
  const supabase = getSupabaseServerClient();
  const query = supabase
    .from("editorial_ideas")
    .select(IDEA_SELECT)
    .eq("client_id", clientId)
    .gte("month", from)
    .lte("month", to)
    .order("created_at");
  if (!options.includeInternal) query.eq("internal", false);

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as unknown as IdeaRow[]).map(toIdea);
}

export function listIdeas(
  clientId: string,
  year: number,
  options: { includeInternal: boolean }
) {
  return listIdeasBetween(clientId, `${year}-01-01`, `${year}-12-01`, options);
}

export async function createIdea(fields: {
  clientId: string;
  year: number;
  month: number; // 1-12
  title: string;
  notes: string;
  internal: boolean;
  createdBy: string | null;
}) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("editorial_ideas").insert({
    client_id: fields.clientId,
    month: `${fields.year}-${String(fields.month).padStart(2, "0")}-01`,
    title: fields.title,
    notes: fields.notes,
    internal: fields.internal,
    created_by: fields.createdBy,
  });
  if (error) throw error;
}

/** `clientId` no filtro: o id vem do formulário e só vale dentro do cliente certo. */
export async function deleteIdea(id: string, clientId: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("editorial_ideas")
    .delete()
    .eq("id", id)
    .eq("client_id", clientId);
  if (error) throw error;
}

export async function updateIdea(
  id: string,
  clientId: string,
  fields: Partial<{ title: string; notes: string; internal: boolean }>
) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("editorial_ideas")
    .update(fields)
    .eq("id", id)
    .eq("client_id", clientId);
  if (error) throw error;
}
