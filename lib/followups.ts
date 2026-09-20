import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  normalizeSituation,
  type FollowupTemplate,
} from "@/lib/followupText";

export type { FollowupTemplate } from "@/lib/followupText";

/** Todos os modelos, agrupáveis por situação na tela. Ordem: situação e
 *  depois posição — é a ordem em que o `<select>` os oferece. */
export async function listFollowupTemplates(): Promise<FollowupTemplate[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("followup_templates")
    .select("id, name, situation, position, body")
    .order("situation", { ascending: true })
    .order("position", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...row,
    situation: normalizeSituation(row.situation),
  }));
}

export async function createFollowupTemplate(fields: {
  name: string;
  situation: string;
  body: string;
}) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("followup_templates").insert({
    name: fields.name || "Novo modelo",
    situation: normalizeSituation(fields.situation),
    body: fields.body,
  });
  if (error) throw error;
}

export async function updateFollowupTemplate(
  id: string,
  fields: { name: string; situation: string; body: string }
) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("followup_templates")
    .update({
      name: fields.name || "Novo modelo",
      situation: normalizeSituation(fields.situation),
      body: fields.body,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteFollowupTemplate(id: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("followup_templates")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
