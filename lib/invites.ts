import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/users";

export interface Invite {
  id: string;
  token: string;
  role: UserRole;
  created_by: string | null;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
  /** Convite de cliente: a que cliente o novo login pertence e a função dele. */
  client_id: string | null;
  label: string;
}

// Convite de cliente vale por 14 dias; o de equipe não expira (como sempre foi).
const CLIENT_INVITE_DAYS = 14;

function generateToken() {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

export async function listPendingInvites(): Promise<Invite[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("invites")
    .select("*")
    .is("used_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createInvite(fields: {
  role: UserRole;
  createdBy: string;
}): Promise<Invite> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("invites")
    .insert({
      token: generateToken(),
      role: fields.role,
      created_by: fields.createdBy,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

/** Convites de cliente ainda abertos (não usados nem vencidos) de um cliente. */
export async function listPendingClientInvites(clientId: string): Promise<Invite[]> {
  const supabase = getSupabaseServerClient();
  const since = new Date(Date.now() - CLIENT_INVITE_DAYS * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("invites")
    .select("*")
    .eq("client_id", clientId)
    .is("used_at", null)
    .gte("created_at", since)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createClientInvite(fields: {
  clientId: string;
  label: string;
  createdBy: string;
}): Promise<Invite> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("invites")
    .insert({
      token: generateToken(),
      role: "client",
      client_id: fields.clientId,
      label: fields.label.trim(),
      created_by: fields.createdBy,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function getPendingInviteByToken(
  token: string
): Promise<Invite | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("invites")
    .select("*")
    .eq("token", token)
    .is("used_at", null)
    .maybeSingle();

  if (error) throw error;
  if (data?.role === "client") {
    const age = Date.now() - new Date(data.created_at).getTime();
    if (age > CLIENT_INVITE_DAYS * 86_400_000) return null;
  }
  return data;
}

export async function markInviteUsed(id: string, usedBy: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("invites")
    .update({ used_by: usedBy, used_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteInvite(id: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("invites").delete().eq("id", id);
  if (error) throw error;
}
