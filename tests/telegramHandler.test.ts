import { describe, expect, it } from "vitest";
import {
  handleUpdate,
  parseCommand,
  type IncomingMessage,
  type TelegramDeps,
  type TelegramMessage,
} from "@/lib/telegram/handler";
import type { TelegramActor } from "@/lib/telegram/identity";

const HUB = -1001234;
const vitor: TelegramActor = {
  userId: "u-vitor",
  username: "vitor",
  role: "admin",
  allowedSections: null,
  allowedClientIds: null,
};
const membro: TelegramActor = { ...vitor, userId: "u-ana", username: "ana", role: "member" };

function setup(overrides: Partial<TelegramDeps> = {}) {
  const replies: { target: unknown; text: string }[] = [];
  const received: IncomingMessage[] = [];
  const actors = new Map<number, TelegramActor>([
    [1, vitor],
    [2, membro],
  ]);
  const deps: TelegramDeps = {
    hubChatId: HUB,
    findActor: async (id) => actors.get(id) ?? null,
    consumeLinkToken: async (token, tg) => {
      if (token !== "bom") return null;
      actors.set(tg.id, membro);
      return membro;
    },
    topicOf: async (_chat, thread) => (thread === 7 ? "referencias" : null),
    setupHubTopics: async () => ["00 — Central de Comando"],
    rateLimit: async () => true,
    reply: async (target, text) => {
      replies.push({ target, text });
    },
    onMessage: async (m) => {
      received.push(m);
    },
    ...overrides,
  };
  return { deps, replies, received };
}

const privado = (fromId: number, text: string): TelegramMessage => ({
  message_id: 10,
  from: { id: fromId },
  chat: { id: fromId, type: "private" },
  text,
});

const noHub = (fromId: number, text: string, thread?: number, chatId = HUB): TelegramMessage => ({
  message_id: 20,
  from: { id: fromId },
  chat: { id: chatId, type: "supergroup" },
  text,
  ...(thread ? { message_thread_id: thread, is_topic_message: true } : {}),
});

describe("parseCommand", () => {
  it("lê comando com @bot e argumento", () => {
    expect(parseCommand("/start@TatuBot abc")).toEqual({ command: "start", arg: "abc" });
    expect(parseCommand("/eu")).toEqual({ command: "eu", arg: "" });
    expect(parseCommand("oi")).toBeNull();
  });
});

describe("conversa privada", () => {
  it("vincula com código válido", async () => {
    const { deps, replies } = setup();
    await handleUpdate({ update_id: 1, message: privado(99, "/start bom") }, deps);
    expect(replies[0].text).toMatch(/Pronto, ana/);
  });

  it("recusa código inválido sem vincular", async () => {
    const { deps, replies, received } = setup();
    await handleUpdate({ update_id: 1, message: privado(99, "/start ruim") }, deps);
    expect(replies[0].text).toMatch(/não vale mais/);
    await handleUpdate({ update_id: 2, message: privado(99, "oi") }, deps);
    expect(received).toHaveLength(0);
  });

  it("explica como vincular a quem não é da equipe, e não entrega ao agente", async () => {
    const { deps, replies, received } = setup();
    await handleUpdate({ update_id: 1, message: privado(99, "oi") }, deps);
    expect(replies[0].text).toMatch(/Conectar Telegram/);
    expect(received).toHaveLength(0);
  });

  it("entrega mensagem de quem está vinculado, sem tópico", async () => {
    const { deps, received } = setup();
    await handleUpdate({ update_id: 1, message: privado(1, "Agenda de amanhã") }, deps);
    expect(received[0]).toMatchObject({
      source: "private",
      topic: null,
      actor: { userId: "u-vitor" },
      text: "Agenda de amanhã",
      target: { chatId: 1, threadId: null, replyTo: null },
    });
  });

  it("para tudo quando passa do limite", async () => {
    const { deps, replies, received } = setup({ rateLimit: async () => false });
    await handleUpdate({ update_id: 1, message: privado(1, "oi") }, deps);
    expect(replies).toHaveLength(0);
    expect(received).toHaveLength(0);
  });

  it("ignora bots", async () => {
    const { deps, received } = setup();
    const m = privado(1, "oi");
    m.from!.is_bot = true;
    await handleUpdate({ update_id: 1, message: m }, deps);
    expect(received).toHaveLength(0);
  });
});

describe("grupo TATU | HUB", () => {
  it("responde no tópico de origem, citando a mensagem", async () => {
    const { deps, received } = setup();
    await handleUpdate({ update_id: 1, message: noHub(2, "salva essa", 7) }, deps);
    expect(received[0]).toMatchObject({
      source: "hub",
      topic: "referencias",
      actor: { userId: "u-ana" },
      target: { chatId: HUB, threadId: 7, replyTo: 20 },
    });
  });

  it("ignora quem não está vinculado", async () => {
    const { deps, replies, received } = setup();
    await handleUpdate({ update_id: 1, message: noHub(99, "oi", 7) }, deps);
    expect(replies).toHaveLength(0);
    expect(received).toHaveLength(0);
  });

  it("ignora grupo fora da allowlist", async () => {
    const { deps, received } = setup();
    await handleUpdate({ update_id: 1, message: noHub(1, "oi", 7, -555) }, deps);
    expect(received).toHaveLength(0);
  });

  it("dá o id do grupo ao admin que tenta configurar fora da allowlist", async () => {
    const { deps, replies } = setup({ hubChatId: null });
    await handleUpdate({ update_id: 1, message: noHub(1, "/configurar", undefined, -555) }, deps);
    expect(replies[0].text).toContain("TELEGRAM_HUB_CHAT_ID=-555");
  });

  it("só admin cria os tópicos", async () => {
    const { deps, replies } = setup();
    await handleUpdate({ update_id: 1, message: noHub(2, "/configurar") }, deps);
    expect(replies[0].text).toMatch(/Só admin/);
    await handleUpdate({ update_id: 2, message: noHub(1, "/configurar@TatuBot") }, deps);
    expect(replies[1].text).toMatch(/Criei os tópicos/);
  });
});
