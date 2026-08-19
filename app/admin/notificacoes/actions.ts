"use server";

import { revalidatePath } from "next/cache";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications";
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
