import "server-only";
import {
  NOTIFICATION_LIMIT,
  type Notification,
  type NotificationKind,
} from "@/lib/notificationTypes";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export { NOTIFICATION_LIMIT };
export type { Notification, NotificationKind };

/**
 * Cria a notificação. Só ignora quando não há destinatário — quem causou o
 * evento também é avisado, porque a campainha vale como registro do que
 * aconteceu, não só como aviso de novidade alheia.
 */
export async function notifyUser(params: {
  userId: string | null;
  actorId: string | null;
  kind: NotificationKind;
  title: string;
  body?: string;
  link?: string | null;
  entityId?: string | null;
}) {
  const { userId, actorId } = params;
  if (!userId) return;

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    actor_id: actorId,
    kind: params.kind,
    title: params.title,
    body: params.body ?? "",
    link: params.link ?? null,
    entity_id: params.entityId ?? null,
  });
  if (error) throw error;
}

export async function listNotifications(
  userId: string,
  limit = NOTIFICATION_LIMIT
): Promise<Notification[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Notification[];
}

export async function countUnreadNotifications(
  userId: string
): Promise<number> {
  const supabase = getSupabaseServerClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  if (error) throw error;
  return count ?? 0;
}

/** O `userId` no filtro impede marcar como lida a notificação de outra pessoa. */
export async function markNotificationRead(id: string, userId: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .is("read_at", null);
  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
  if (error) throw error;
}
