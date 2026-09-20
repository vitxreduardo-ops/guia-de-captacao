import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeAngle, type OutreachTemplate } from "@/lib/outreachText";

export type { OutreachTemplate } from "@/lib/outreachText";

export async function listOutreachTemplates(): Promise<OutreachTemplate[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("outreach_templates")
    .select("id, name, angle, position, body")
    .order("angle", { ascending: true })
    .order("position", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...row,
    angle: normalizeAngle(row.angle),
  }));
}

export async function createOutreachTemplate(fields: {
  name: string;
  angle: string;
  body: string;
}) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("outreach_templates").insert({
    name: fields.name || "Nova abordagem",
    angle: normalizeAngle(fields.angle),
    body: fields.body,
  });
  if (error) throw error;
}

export async function updateOutreachTemplate(
  id: string,
  fields: { name: string; angle: string; body: string }
) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("outreach_templates")
    .update({
      name: fields.name || "Nova abordagem",
      angle: normalizeAngle(fields.angle),
      body: fields.body,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteOutreachTemplate(id: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("outreach_templates")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
