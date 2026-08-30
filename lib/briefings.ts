import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const BRIEFING_RETENTION_DAYS = 30;

export interface Briefing {
  id: string;
  client_name: string;
  contact: string;
  answers: Record<string, string>;
  created_at: string;
}

/**
 * Apaga o que passou da validade. Roda junto do insert porque briefing chega
 * de vez em quando e não vale um cron só pra isso.
 */
// ponytail: limpeza carona no insert — se ficar meses sem briefing novo, os
// antigos só somem no próximo envio. Vira cron se isso passar a importar.
async function purgeExpired() {
  const limit = new Date(
    Date.now() - BRIEFING_RETENTION_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("briefings")
    .delete()
    .lt("created_at", limit);
  if (error) console.error("Falha ao limpar briefings vencidos", error);
}

export async function createBriefing(input: {
  client_name: string;
  contact: string;
  answers: Record<string, string>;
}): Promise<Briefing> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("briefings")
    .insert(input)
    .select()
    .single();
  if (error) throw error;

  await purgeExpired();

  return data as Briefing;
}

export async function listBriefings(): Promise<Briefing[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("briefings")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Briefing[];
}

export async function deleteBriefing(id: string): Promise<void> {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("briefings").delete().eq("id", id);
  if (error) throw error;
}
