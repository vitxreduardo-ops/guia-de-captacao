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
}

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
