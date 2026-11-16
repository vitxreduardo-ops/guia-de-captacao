// Porta de entrada das mensagens do Telegram. Decide de onde veio (conversa
// privada ou tópico do TATU | HUB), quem mandou, e só então entrega pro
// `onMessage` — que na fase 2 só confirma o recebimento e na fase 3 vira o
// agente. Sem import de servidor: o que fala com banco e rede chega em
// `deps`, o que deixa este arquivo testável sem nenhum dos dois.

import type { HubTopic } from "@/lib/telegram/topics";
import type { TelegramActor } from "@/lib/telegram/identity";

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallback;
}

export interface TelegramCallback {
  id: string;
  from: { id: number; is_bot?: boolean };
  message?: { message_id: number; chat: { id: number }; message_thread_id?: number };
  data?: string;
}

/** Clique num botão Confirmar/Cancelar de uma prévia. */
export interface ActionClick {
  callbackId: string;
  telegramUserId: number;
  actionId: string;
  decision: "confirm" | "cancel";
  chatId: number | null;
  messageId: number | null;
}

/** "pa:c:<uuid>" / "pa:x:<uuid>" — cabe nos 64 bytes do callback_data. */
export function actionButtonData(actionId: string, decision: "confirm" | "cancel") {
  return `pa:${decision === "confirm" ? "c" : "x"}:${actionId}`;
}

export function parseActionData(data: string | undefined): Pick<ActionClick, "actionId" | "decision"> | null {
  const m = data?.match(/^pa:([cx]):([0-9a-f-]{36})$/);
  return m ? { actionId: m[2], decision: m[1] === "c" ? "confirm" : "cancel" } : null;
}

export interface TelegramMessage {
  message_id: number;
  from?: { id: number; is_bot?: boolean; username?: string; first_name?: string };
  chat: { id: number; type: "private" | "group" | "supergroup" | "channel" };
  message_thread_id?: number;
  is_topic_message?: boolean;
  text?: string;
  caption?: string;
}

export interface ReplyTarget {
  chatId: number;
  /** Tópico do grupo; ausente na conversa privada e no "Geral". */
  threadId: number | null;
  /** No grupo a resposta cita a mensagem, pra ficar claro pra quem é. */
  replyTo: number | null;
}

/** O que o agente recebe: tudo que ele precisa pra separar as conversas. */
export interface IncomingMessage {
  source: "private" | "hub";
  chatId: number;
  threadId: number | null;
  topic: HubTopic | null;
  messageId: number;
  /** Id numérico de quem mandou: é quem pode confirmar a prévia. */
  telegramUserId: number;
  actor: TelegramActor;
  text: string;
  target: ReplyTarget;
}

export interface TelegramDeps {
  hubChatId: number | null;
  findActor(telegramUserId: number): Promise<TelegramActor | null>;
  consumeLinkToken(token: string, tg: { id: number; username?: string }): Promise<TelegramActor | null>;
  topicOf(chatId: number, threadId: number): Promise<HubTopic | null>;
  setupHubTopics(chatId: number): Promise<string[]>;
  /** true = dentro do limite. */
  rateLimit(key: string, max: number, windowSeconds: number): Promise<boolean>;
  reply(target: ReplyTarget, text: string): Promise<void>;
  onMessage(message: IncomingMessage): Promise<void>;
  onActionClick(click: ActionClick): Promise<void>;
  /** Fecha o "carregando" do botão quando o clique não vale nada. */
  answerCallback(callbackId: string, text?: string): Promise<void>;
}

const COMO_VINCULAR =
  "Ainda não sei quem você é. Abra o painel da Tatu, toque no sininho de notificações e em \"Conectar Telegram\".";

/** "/start@TatuBot abc" → { command: "start", arg: "abc" }. */
export function parseCommand(text: string): { command: string; arg: string } | null {
  const m = text.trim().match(/^\/([a-z_]+)(?:@\w+)?(?:\s+([\s\S]*))?$/i);
  return m ? { command: m[1].toLowerCase(), arg: (m[2] ?? "").trim() } : null;
}

export async function handleUpdate(update: TelegramUpdate, deps: TelegramDeps): Promise<void> {
  const cb = update.callback_query;
  if (cb) {
    if (cb.from.is_bot || !(await deps.rateLimit(`tg:${cb.from.id}`, 30, 60))) return;
    const parsed = parseActionData(cb.data);
    if (!parsed) {
      await deps.answerCallback(cb.id);
      return;
    }
    // Quem pode decidir é conferido no banco (id de quem pediu), não aqui.
    await deps.onActionClick({
      callbackId: cb.id,
      telegramUserId: cb.from.id,
      ...parsed,
      chatId: cb.message?.chat.id ?? null,
      messageId: cb.message?.message_id ?? null,
    });
    return;
  }

  const msg = update.message;
  const from = msg?.from;
  if (!msg || !from || from.is_bot) return;

  const text = msg.text ?? msg.caption ?? "";
  const cmd = parseCommand(text);

  // Antes de qualquer consulta: quem martela o bot não custa banco nem IA.
  if (!(await deps.rateLimit(`tg:${from.id}`, 30, 60))) return;

  if (msg.chat.type === "private") {
    const target: ReplyTarget = { chatId: msg.chat.id, threadId: null, replyTo: null };

    if (cmd?.command === "start" && cmd.arg) {
      const actor = await deps.consumeLinkToken(cmd.arg, { id: from.id, username: from.username });
      await deps.reply(
        target,
        actor
          ? `Pronto, ${actor.username}! Seu Telegram está ligado à sua conta da Tatu.`
          : "Esse código não vale mais. Gere outro no painel (sininho → Conectar Telegram)."
      );
      return;
    }

    const actor = await deps.findActor(from.id);
    if (!actor) {
      // Uma explicação por hora basta pra quem não é da equipe.
      if (await deps.rateLimit(`tg-desconhecido:${from.id}`, 1, 60 * 60)) {
        await deps.reply(target, COMO_VINCULAR);
      }
      return;
    }

    if (cmd?.command === "start" || cmd?.command === "eu") {
      await deps.reply(target, `Você está conectado como ${actor.username}.`);
      return;
    }

    await deps.onMessage({
      source: "private",
      chatId: msg.chat.id,
      threadId: null,
      topic: null,
      messageId: msg.message_id,
      telegramUserId: from.id,
      actor,
      text,
      target,
    });
    return;
  }

  if (msg.chat.type !== "supergroup" && msg.chat.type !== "group") return;

  // No grupo, quem não está vinculado é ignorado em silêncio.
  const actor = await deps.findActor(from.id);
  if (!actor) return;

  const threadId = msg.is_topic_message ? msg.message_thread_id ?? null : null;
  const target: ReplyTarget = { chatId: msg.chat.id, threadId, replyTo: msg.message_id };

  if (deps.hubChatId === null || msg.chat.id !== deps.hubChatId) {
    // Grupo fora da allowlist. Só o admin recebe a dica de como liberar.
    if (cmd?.command === "configurar" && actor.role === "admin") {
      await deps.reply(
        target,
        `Este grupo ainda não é o TATU | HUB. Para liberar, defina TELEGRAM_HUB_CHAT_ID=${msg.chat.id} no servidor e mande /configurar de novo.`
      );
    }
    return;
  }

  if (cmd?.command === "configurar") {
    if (actor.role !== "admin") {
      await deps.reply(target, "Só admin configura os tópicos do grupo.");
      return;
    }
    const created = await deps.setupHubTopics(msg.chat.id);
    await deps.reply(
      target,
      created.length
        ? `Criei os tópicos:\n${created.join("\n")}`
        : "Os tópicos já estavam todos criados."
    );
    return;
  }

  await deps.onMessage({
    source: "hub",
    chatId: msg.chat.id,
    threadId,
    topic: threadId === null ? null : await deps.topicOf(msg.chat.id, threadId),
    messageId: msg.message_id,
    telegramUserId: from.id,
    actor,
    text,
    target,
  });
}
