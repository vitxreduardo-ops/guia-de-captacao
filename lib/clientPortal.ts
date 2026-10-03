import "server-only";
import { cookies } from "next/headers";
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
  gallery_article: "do" | "da";
  contact_name: string | null;
}

export const PREVIEW_COOKIE = "portal_preview";

/**
 * Só o login do próprio cliente, pras ações que gravam (aprovar, pedir
 * ajuste). A prévia do admin nunca passa por aqui: ela só lê.
 */
export async function requireClientUser(): Promise<
  PublicUser & { client_id: string }
> {
  const session = await getCurrentSession();
  const user = session ? await getUserById(session.userId) : null;
  if (!user || user.role !== "client" || !user.client_id) {
    redirect("/cliente/sair");
  }
  return user as PublicUser & { client_id: string };
}

/**
 * Quem está olhando o portal e de qual cliente: o cliente logado, ou um admin
 * em "ver como o cliente" (cookie de prévia, só leitura). Sessão que não é
 * nenhuma das duas volta pro login — o proxy já barra, mas a página não deve
 * confiar só nele.
 */
export async function getPortalSession(): Promise<{
  clientId: string;
  preview: boolean;
}> {
  const session = await getCurrentSession();
  const user = session ? await getUserById(session.userId) : null;

  if (user?.role === "client" && user.client_id) {
    return { clientId: user.client_id, preview: false };
  }
  if (user?.role === "admin") {
    const clientId = (await cookies()).get(PREVIEW_COOKIE)?.value;
    // Sem prévia escolhida o admin não tem o que ver aqui; sair levaria a
    // sessão dele junto.
    if (!clientId) redirect("/admin/area-do-cliente");
    return { clientId, preview: true };
  }
  redirect("/cliente/sair");
}

export async function getPortalClient(clientId: string): Promise<PortalClient> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("gallery_clients")
    .select("id, name, slug, status, gallery_article, contact_name")
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
      "id, title, format, cover_url, drive_url, caption, post_date, approved_at, changes_requested_at, client_feedback, guide:guides(slug, title, status), column:backlog_columns!inner(name, color, client_visible)"
    )
    .eq("client_id", clientId)
    .eq("column.client_visible", true)
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

/** Guias publicados ligados às entregas do cliente, sem repetir. */
export function listPortalGuides(cards: PortalCard[]) {
  const seen = new Map<string, { slug: string; title: string }>();
  for (const card of cards) if (card.guide) seen.set(card.guide.slug, card.guide);
  return [...seen.values()];
}

/** Postagens com data de hoje em diante, a mais próxima primeiro. */
export function listUpcoming(cards: PortalCard[], today: string, limit = 4) {
  return cards
    .filter((c) => c.post_date && c.post_date >= today)
    .sort((a, b) => (a.post_date! < b.post_date! ? -1 : 1))
    .slice(0, limit);
}
