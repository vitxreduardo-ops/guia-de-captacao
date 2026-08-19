// Tipos das notificações, sem "server-only": a campainha roda no cliente e
// precisa deles. O acesso ao banco fica em lib/notifications.ts.

export type NotificationKind =
  "card_assigned" | "todo_assigned" | "card_moved" | "card_approved";

export interface Notification {
  id: string;
  user_id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  link: string | null;
  entity_id: string | null;
  actor_id: string | null;
  read_at: string | null;
  created_at: string;
}

/** Quantas notificações a campainha mostra de uma vez. */
export const NOTIFICATION_LIMIT = 15;
