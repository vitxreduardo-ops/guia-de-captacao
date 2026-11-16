import "server-only";
import { rateLimit } from "@/lib/rateLimit";
import { telegram } from "@/lib/telegram/client";
import { consumeLinkToken, findActor } from "@/lib/telegram/identity";
import { setupHubTopics, topicOf } from "@/lib/telegram/topicRoutes";
import { HUB_TOPICS } from "@/lib/telegram/topics";
import type { ReplyTarget, TelegramDeps } from "@/lib/telegram/handler";

export async function sendTelegram(target: ReplyTarget, text: string) {
  await telegram("sendMessage", {
    chat_id: target.chatId,
    text,
    ...(target.threadId !== null ? { message_thread_id: target.threadId } : {}),
    ...(target.replyTo !== null
      ? { reply_parameters: { message_id: target.replyTo, allow_sending_without_reply: true } }
      : {}),
  });
}

function hubChatId(): number | null {
  const raw = process.env.TELEGRAM_HUB_CHAT_ID;
  return raw && /^-?\d+$/.test(raw) ? Number(raw) : null;
}

/** Dependências reais do handler. A fase 3 troca o `onMessage` pelo agente. */
export function telegramDeps(): TelegramDeps {
  return {
    hubChatId: hubChatId(),
    findActor,
    consumeLinkToken,
    topicOf,
    setupHubTopics,
    rateLimit,
    reply: sendTelegram,
    async onMessage(message) {
      const topic = HUB_TOPICS.find((t) => t.key === message.topic)?.name;
      await sendTelegram(
        message.target,
        `Recebi, ${message.actor.username}${topic ? ` (${topic})` : ""}. ` +
          "Por enquanto só confirmo o recebimento: entender e executar pedidos é a próxima etapa."
      );
    },
  };
}
