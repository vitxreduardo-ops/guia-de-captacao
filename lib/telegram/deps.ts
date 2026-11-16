import "server-only";
import { rateLimit } from "@/lib/rateLimit";
import { telegram } from "@/lib/telegram/client";
import { consumeLinkToken, findActor } from "@/lib/telegram/identity";
import { setupHubTopics, threadOfTopic, topicOf } from "@/lib/telegram/topicRoutes";
import { HUB_TOPICS, type HubTopic } from "@/lib/telegram/topics";
import {
  actionButtonData,
  type IncomingMessage,
  type ReplyTarget,
  type TelegramDeps,
} from "@/lib/telegram/handler";
import { replyTopic, runAgent } from "@/lib/agent/core";
import { callResponses } from "@/lib/agent/openai";
import { AGENT_TOOLS } from "@/lib/agent/tools";
import { todayKey } from "@/lib/agent/tools/tasks";
import { loadHistory, saveTurn } from "@/lib/agent/memory";
import { createPendingAction, resolvePendingAction } from "@/lib/agent/confirmation";

type Keyboard = { text: string; callback_data: string }[][];

export async function sendTelegram(target: ReplyTarget, text: string, keyboard?: Keyboard) {
  return telegram<{ message_id: number }>("sendMessage", {
    chat_id: target.chatId,
    // Teto do Telegram é 4096; a resposta do modelo não deveria chegar perto.
    text: text.slice(0, 4000),
    ...(target.threadId !== null ? { message_thread_id: target.threadId } : {}),
    ...(target.replyTo !== null
      ? { reply_parameters: { message_id: target.replyTo, allow_sending_without_reply: true } }
      : {}),
    ...(keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {}),
  });
}

function hubChatId(): number | null {
  const raw = process.env.TELEGRAM_HUB_CHAT_ID;
  return raw && /^-?\d+$/.test(raw) ? Number(raw) : null;
}

/** Link de uma mensagem dentro de um tópico de supergrupo privado. */
export function topicMessageLink(chatId: number, threadId: number, messageId: number): string {
  return `https://t.me/c/${String(chatId).replace(/^-100/, "")}/${threadId}/${messageId}`;
}

/**
 * No Tatu | HUB a resposta vai pro tópico do assunto (relatório em
 * Relatórios, OS em Ordens de Serviço). Onde a pessoa perguntou fica só um
 * aviso com o link, pra ela não perder a resposta.
 */
async function deliver(message: IncomingMessage, topic: HubTopic | null, text: string, keyboard?: Keyboard) {
  if (message.source !== "hub" || !topic || topic === message.topic) {
    return sendTelegram(message.target, text, keyboard);
  }
  const threadId = await threadOfTopic(message.chatId, topic);
  if (threadId === null) return sendTelegram(message.target, text, keyboard);

  // Fora do contexto da pergunta, a resposta leva a pergunta junto.
  const asked = message.text.length > 200 ? `${message.text.slice(0, 200)}…` : message.text;
  const sent = await sendTelegram(
    { chatId: message.chatId, threadId, replyTo: null },
    `${message.actor.username}: "${asked}"\n\n${text}`,
    keyboard
  );
  const name = HUB_TOPICS.find((t) => t.key === topic)?.name ?? topic;
  await sendTelegram(message.target, `Respondi em ${name}: ${topicMessageLink(message.chatId, threadId, sent.message_id)}`);
  return sent;
}

async function answerWithAgent(message: IncomingMessage) {
  const { actor, target } = message;
  // Cada pergunta custa: 60 por hora por pessoa cobre o uso e corta loop.
  if (!(await rateLimit(`agente:${actor.userId}`, 60, 60 * 60))) {
    await sendTelegram(target, "Você passou do limite de pedidos desta hora. Tenta daqui a pouco.");
    return;
  }
  // "digitando…" enquanto o modelo pensa; falhar aqui não importa.
  telegram("sendChatAction", {
    chat_id: message.chatId,
    action: "typing",
    ...(message.threadId !== null ? { message_thread_id: message.threadId } : {}),
  }).catch(() => {});

  const key = { userId: actor.userId, chatId: message.chatId, threadId: message.threadId };
  const topic = HUB_TOPICS.find((t) => t.key === message.topic)?.name;
  const where =
    message.source === "private"
      ? "conversa privada no Telegram"
      : `grupo Tatu | HUB${topic ? `, tópico ${topic}` : ", tópico Geral"}`;

  const result = await runAgent({
    actor,
    text: message.text,
    history: await loadHistory(key),
    where,
    today: todayKey(),
    tools: AGENT_TOOLS,
    callModel: callResponses,
  });

  const topicKey = replyTopic(result);

  if (result.kind === "reply") {
    await deliver(message, topicKey, result.text);
    await saveTurn(key, message.text, result.text);
    return;
  }

  const actionId = await createPendingAction({
    userId: actor.userId,
    telegramUserId: message.telegramUserId,
    chatId: message.chatId,
    threadId: message.threadId,
    operation: result.tool.name,
    params: result.params,
    summary: result.summary,
    idempotencyKey: `${message.chatId}:${message.messageId}:${result.tool.name}`,
  });
  await deliver(message, topicKey, `${result.summary}\n\nConfirma?`, [
    [
      { text: "CONFIRMAR", callback_data: actionButtonData(actionId, "confirm") },
      { text: "CANCELAR", callback_data: actionButtonData(actionId, "cancel") },
    ],
  ]);
  await saveTurn(key, message.text, `[Prévia enviada, aguardando o botão]\n${result.summary}`);
}

/** Dependências reais do handler. */
export function telegramDeps(): TelegramDeps {
  return {
    hubChatId: hubChatId(),
    findActor,
    consumeLinkToken,
    topicOf,
    setupHubTopics,
    rateLimit,
    reply: async (target, text) => {
      await sendTelegram(target, text);
    },
    onMessage: answerWithAgent,
    async answerCallback(callbackId, text) {
      await telegram("answerCallbackQuery", { callback_query_id: callbackId, ...(text ? { text } : {}) });
    },
    async onActionClick(click) {
      const r = await resolvePendingAction(click.actionId, click.telegramUserId, click.decision);
      if (!r.closed) {
        // Só um aviso pra quem clicou; os botões seguem pra quem pediu.
        await telegram("answerCallbackQuery", { callback_query_id: click.callbackId, text: r.text, show_alert: true });
        return;
      }
      await telegram("answerCallbackQuery", { callback_query_id: click.callbackId }).catch(() => {});
      if (click.chatId === null || click.messageId === null) return;
      // A pergunta e os botões dão lugar ao resultado, na mesma mensagem.
      await telegram("editMessageText", {
        chat_id: click.chatId,
        message_id: click.messageId,
        text: `${r.summary ?? ""}\n\n${r.text}`.trim(),
      }).catch(() => telegram("sendMessage", { chat_id: click.chatId, text: r.text }));
    },
  };
}
