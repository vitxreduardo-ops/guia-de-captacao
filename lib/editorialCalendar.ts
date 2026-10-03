import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { EditorialIdea } from "@/lib/editorialMonths";

export async function listIdeas(
  clientId: string,
  year: number,
  options: { includeInternal: boolean }
): Promise<EditorialIdea[]> {
  const supabase = getSupabaseServerClient();
  const query = supabase
    .from("editorial_ideas")
    .select("id, month, title, notes, internal")
    .eq("client_id", clientId)
    .gte("month", `${year}-01-01`)
    .lte("month", `${year}-12-31`)
    .order("created_at");
  if (!options.includeInternal) query.eq("internal", false);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as EditorialIdea[];
}

export async function createIdea(fields: {
  clientId: string;
  year: number;
  month: number; // 1-12
  title: string;
  notes: string;
  internal: boolean;
}) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("editorial_ideas").insert({
    client_id: fields.clientId,
    month: `${fields.year}-${String(fields.month).padStart(2, "0")}-01`,
    title: fields.title,
    notes: fields.notes,
    internal: fields.internal,
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
