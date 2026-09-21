import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  normalizeSituation,
  type MessageTemplate,
} from "@/lib/messageText";

export type { MessageTemplate } from "@/lib/messageText";

export async function listMessageTemplates(): Promise<MessageTemplate[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("message_templates")
    .select("id, name, situation, position, body")
    .order("situation", { ascending: true })
    .order("position", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...row,
    situation: normalizeSituation(row.situation),
  }));
}

export async function createMessageTemplate(fields: {
  name: string;
  situation: string;
  body: string;
}) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("message_templates").insert({
    name: fields.name || "Novo modelo",
    situation: normalizeSituation(fields.situation),
    body: fields.body,
  });
  if (error) throw error;
}

export async function updateMessageTemplate(
  id: string,
  fields: { name: string; situation: string; body: string }
) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("message_templates")
    .update({
      name: fields.name || "Novo modelo",
      situation: normalizeSituation(fields.situation),
      body: fields.body,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteMessageTemplate(id: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("message_templates")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
