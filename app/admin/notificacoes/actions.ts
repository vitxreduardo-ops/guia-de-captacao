"use server";

import { revalidatePath } from "next/cache";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications";
import {
  deletePushSubscription,
  savePushSubscription,
  type PushSubscriptionJSON,
} from "@/lib/push";
import { getCurrentSession } from "@/lib/session";

// O `userId` vem sempre da sessão, nunca do cliente: é o que impede alguém de
// marcar como lida a notificação de outra pessoa mandando outro id.

export async function markNotificationReadAction(id: string) {
  const session = await getCurrentSession();
  if (!session) return;
  await markNotificationRead(id, session.userId);
  revalidatePath("/admin", "layout");
}

export async function markAllNotificationsReadAction() {
  const session = await getCurrentSession();
  if (!session) return;
  await markAllNotificationsRead(session.userId);
  revalidatePath("/admin", "layout");
}

export async function subscribePushAction(sub: PushSubscriptionJSON) {
  const session = await getCurrentSession();
  if (!session) return;
  // Vem do navegador: sem endpoint https e as duas chaves, o envio falharia
  // depois sem dizer por quê.
  if (
    typeof sub?.endpoint !== "string" ||
    !sub.endpoint.startsWith("https://") ||
    typeof sub.keys?.p256dh !== "string" ||
    typeof sub.keys?.auth !== "string"
  ) {
    throw new Error("Inscrição de push inválida");
  }
  await savePushSubscription(session.userId, sub);
}

export async function unsubscribePushAction(endpoint: string) {
  const session = await getCurrentSession();
  if (!session) return;
  await deletePushSubscription(session.userId, endpoint);
}
