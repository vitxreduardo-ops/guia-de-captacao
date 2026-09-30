import "server-only";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { getUserById, type PublicUser } from "@/lib/users";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export interface PortalCard {
  id: string;
  title: string;
  format: string;
  cover_url: string | null;
  drive_url: string | null;
  caption: string;
  post_date: string | null;
  approved_at: string | null;
  changes_requested_at: string | null;
  client_feedback: string;
  guide: { slug: string; title: string } | null;
  column: { name: string; color: string } | null;
}

export interface PortalClient {
  id: string;
  name: string;
  slug: string;
  status: "draft" | "published";
}

/**
 * Quem está no portal e de qual cliente. Sem sessão de cliente, volta pro
 * login — o proxy já barra, mas action/página não deve confiar só nele.
 */
export async function requirePortalUser(): Promise<
  PublicUser & { client_id: string }
> {
  const session = await getCurrentSession();
  const user = session ? await getUserById(session.userId) : null;
  if (!user || user.role !== "client" || !user.client_id) {
    redirect("/admin/login?next=/cliente");
  }
  return user as PublicUser & { client_id: string };
}

export async function getPortalClient(clientId: string): Promise<PortalClient> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("gallery_clients")
    .select("id, name, slug, status")
    .eq("id", clientId)
    .single();
  if (error) throw error;
  return data as PortalClient;
}

export async function listPortalCards(clientId: string): Promise<PortalCard[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("backlog_cards")
    .select(
      "id, title, format, cover_url, drive_url, caption, post_date, approved_at, changes_requested_at, client_feedback, guide:guides(slug, title, status), column:backlog_columns(name, color)"
    )
    .eq("client_id", clientId)
    .order("post_date", { ascending: false, nullsFirst: true });
  if (error) throw error;

  return (data ?? []).map((row) => {
    const guide = row.guide as unknown as
      | { slug: string; title: string; status: string }
      | null;
    return {
      ...row,
      // Guia em rascunho ainda não é do cliente: o link público devolveria 404.
      guide:
        guide && guide.status === "published"
          ? { slug: guide.slug, title: guide.title }
          : null,
      column: row.column as unknown as PortalCard["column"],
    } as PortalCard;
  });
}

/**
 * Aprovar ou pedir ajuste, sempre checando que o card é deste cliente —
 * o id vem do formulário e não vale nada sozinho.
 */
export async function reviewPortalCard(params: {
  cardId: string;
  userId: string;
  clientId: string;
  feedback: string | null; // null = aprovou; texto = pediu ajuste
}): Promise<{ title: string } | null> {
  const supabase = getSupabaseServerClient();
  const now = new Date().toISOString();
  const approving = params.feedback === null;

  const { data, error } = await supabase
    .from("backlog_cards")
    .update({
      approved_at: approving ? now : null,
      approved_by: approving ? params.userId : null,
      changes_requested_at: approving ? null : now,
      client_feedback: approving ? "" : params.feedback,
      updated_at: now,
    })
    .eq("id", params.cardId)
    .eq("client_id", params.clientId)
    .select("title")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listCardAssigneeIds(cardId: string): Promise<string[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("backlog_card_assignees")
    .select("user_id")
    .eq("card_id", cardId);
  if (error) throw error;
  return (data ?? []).map((row) => row.user_id as string);
}
