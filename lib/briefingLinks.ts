import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";

export interface BriefingLink {
  id: string;
  slug: string;
  prospect_id: string | null;
  client_name: string;
  contact: string;
  servico: string;
  note: string;
  opened_at: string | null;
  answered_at: string | null;
  created_at: string;
}

/** O slug ganha um sufixo aleatório sempre, mesmo quando é único: o link vai
 *  por WhatsApp e ninguém deve conseguir adivinhar o do concorrente trocando
 *  o nome na barra de endereço. */
async function uniqueSlug(name: string) {
  const supabase = getSupabaseServerClient();
  const base = slugify(name) || "briefing";

  for (let tentativa = 0; tentativa < 10; tentativa += 1) {
    const candidato = `${base}-${Math.random().toString(36).slice(2, 8)}`;
    const { data, error } = await supabase
      .from("briefing_links")
      .select("id")
      .eq("slug", candidato)
      .maybeSingle();
    if (error) throw error;
    if (!data) return candidato;
  }
  return `${base}-${Date.now()}`;
}

export async function listBriefingLinks(): Promise<BriefingLink[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("briefing_links")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getBriefingLink(
  slug: string
): Promise<BriefingLink | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("briefing_links")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createBriefingLink(fields: {
  client_name: string;
  contact: string;
  servico: string;
  note: string;
  prospect_id?: string | null;
}): Promise<BriefingLink> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("briefing_links")
    .insert({
      ...fields,
      prospect_id: fields.prospect_id || null,
      slug: await uniqueSlug(fields.client_name),
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/** Só a primeira abertura conta: sem o `is null`, reabrir a página faria a
 *  data andar e "mandei e ele abriu na hora" viraria "abriu agora". */
export async function markBriefingLinkOpened(id: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("briefing_links")
    .update({ opened_at: new Date().toISOString() })
    .eq("id", id)
    .is("opened_at", null);
  if (error) console.error("Falha ao marcar abertura do briefing", error);
}

export async function markBriefingLinkAnswered(slug: string, briefingId: string) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("briefing_links")
    .update({ answered_at: new Date().toISOString() })
    .eq("slug", slug)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) return;

  const { error: linkError } = await supabase
    .from("briefings")
    .update({ link_id: data.id })
    .eq("id", briefingId);
  if (linkError) throw linkError;
}

export async function deleteBriefingLink(id: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("briefing_links").delete().eq("id", id);
  if (error) throw error;
}
