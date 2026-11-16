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
import { getCurrentSession, requireTeam } from "@/lib/session";
import { createLinkToken, getLinkedTelegram, unlinkTelegram } from "@/lib/telegram/identity";

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

// --------------------------------------------------------------- Telegram

/** @ do Telegram ligado a quem está logado; null = não conectado. */
export async function getTelegramStatusAction(): Promise<{ linked: string | null; enabled: boolean }> {
  const session = await requireTeam();
  return {
    linked: await getLinkedTelegram(session.userId),
    enabled: Boolean(process.env.TELEGRAM_BOT_USERNAME && process.env.TELEGRAM_BOT_TOKEN),
  };
}

/** Link `t.me` com o código de uso único; abrir e tocar em Iniciar já vincula. */
export async function connectTelegramAction(): Promise<string> {
  const session = await requireTeam();
  const bot = process.env.TELEGRAM_BOT_USERNAME;
  if (!bot) throw new Error("Bot do Telegram não configurado.");
  const token = await createLinkToken(session.userId);
  return `https://t.me/${bot.replace(/^@/, "")}?start=${token}`;
}

export async function disconnectTelegramAction() {
  const session = await requireTeam();
  await unlinkTelegram(session.userId);
}
