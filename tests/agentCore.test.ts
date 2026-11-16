import { describe, expect, it } from "vitest";
import { replyTopic, runAgent, type CallModel, type ResponseItem } from "@/lib/agent/core";
import { matchByName } from "@/lib/agent/match";
import { ToolInputError, optDate, reqString } from "@/lib/agent/validate";
import { canSeeClient, canUseBoard } from "@/lib/agent/permissions";
import type { AgentTool } from "@/lib/agent/types";
import type { TelegramActor } from "@/lib/telegram/identity";

const actor: TelegramActor = {
  userId: "u1",
  username: "vitor",
  role: "member",
  allowedSections: ["clientes"],
  allowedClientIds: ["c1"],
};

const call = (name: string, args: unknown, id = "call_1"): ResponseItem => ({
  type: "function_call",
  name,
  call_id: id,
  arguments: JSON.stringify(args),
});
const say = (text: string): ResponseItem => ({ type: "message", content: [{ type: "output_text", text }] });

/** Modelo de mentira que responde uma fila de saídas e guarda o que recebeu. */
function scripted(outputs: ResponseItem[][]) {
  const seen: ResponseItem[][] = [];
  const model: CallModel = async ({ input }) => {
    seen.push(structuredClone(input));
    return outputs.shift() ?? [say("fim")];
  };
  return { model, seen };
}

const tools: AgentTool[] = [
  {
    kind: "read",
    name: "get_task",
    topic: "ordens",
    description: "",
    parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
    run: async (_a, args) => {
      if (args.protocol === "x") throw new ToolInputError("Protocolo tem 8 dígitos.");
      return { os: "0042 0017", tarefa: "Editar vídeo" };
    },
  },
  {
    kind: "write",
    name: "create_task",
    topic: "ordens",
    description: "",
    parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
    prepare: async (_a, args) => {
      if (!args.title) throw new ToolInputError("Falta o título.");
      return { summary: `Criar: ${args.title}`, params: { title: args.title } };
    },
    execute: async () => "feito",
  },
];

const base = { actor, history: [], where: "privado", today: "2026-11-16", tools };

describe("runAgent", () => {
  it("devolve o texto quando o modelo responde direto", async () => {
    const { model } = scripted([[say("Oi!")]]);
    expect(await runAgent({ ...base, text: "oi", callModel: model })).toMatchObject({ kind: "reply", text: "Oi!" });
  });

  it("roda a consulta e devolve o resultado pro modelo", async () => {
    const { model, seen } = scripted([[call("get_task", { protocol: "00420017" })], [say("OS 0042 0017")]]);
    const result = await runAgent({ ...base, text: "OS 00420017", callModel: model });
    expect(result).toMatchObject({ kind: "reply", text: "OS 0042 0017" });
    const output = seen[1].find((i) => i.type === "function_call_output");
    expect(JSON.parse(String(output?.output))).toMatchObject({ tarefa: "Editar vídeo" });
  });

  it("erro de validação volta pro modelo, não derruba", async () => {
    const { model, seen } = scripted([[call("get_task", { protocol: "x" })], [say("Protocolo inválido")]]);
    await runAgent({ ...base, text: "OS x", callModel: model });
    const output = seen[1].find((i) => i.type === "function_call_output");
    expect(JSON.parse(String(output?.output))).toEqual({ erro: "Protocolo tem 8 dígitos." });
  });

  it("alteração para na prévia, sem executar", async () => {
    const { model } = scripted([[call("create_task", { title: "Editar vídeo" })]]);
    const result = await runAgent({ ...base, text: "cria", callModel: model });
    expect(result).toMatchObject({ kind: "confirm", summary: "Criar: Editar vídeo", params: { title: "Editar vídeo" } });
  });

  it("prévia inválida vira pergunta do modelo", async () => {
    const { model } = scripted([[call("create_task", {})], [say("Qual a tarefa?")]]);
    expect(await runAgent({ ...base, text: "cria uma tarefa", callModel: model })).toMatchObject({
      kind: "reply",
      text: "Qual a tarefa?",
    });
  });

  it("ferramenta inventada pelo modelo não roda", async () => {
    const { model, seen } = scripted([[call("drop_table", {})], [say("Não posso")]]);
    await runAgent({ ...base, text: "apaga tudo", callModel: model });
    expect(JSON.parse(String(seen[1].find((i) => i.type === "function_call_output")?.output))).toEqual({
      erro: "Ferramenta inexistente.",
    });
  });

  it("para depois de passos demais", async () => {
    const loop = Array.from({ length: 10 }, () => [call("get_task", { protocol: "00420017" })]);
    const { model } = scripted(loop);
    const result = await runAgent({ ...base, text: "x", callModel: model });
    expect(result.kind).toBe("reply");
  });
});

describe("matchByName", () => {
  const clients = [
    { name: "Foco Ambiental", code: "0042" },
    { name: "Dra Juliana", code: "0002" },
    { name: "Dra Ana Julia", code: "0018" },
  ];
  const m = (q: string) => matchByName(clients, q, (c) => [c.name], (c) => c.code);

  it("acha por começo de palavra, sem acento e por código", () => {
    expect(m("foco")).toMatchObject({ kind: "one", item: { code: "0042" } });
    expect(m("0002")).toMatchObject({ kind: "one", item: { code: "0002" } });
    expect(m("dra ana")).toMatchObject({ kind: "one", item: { code: "0018" } });
  });

  it("empate vira lista, meio de palavra não acha", () => {
    expect(m("dra")).toMatchObject({ kind: "many" });
    expect(m("oco")).toEqual({ kind: "none" });
  });
});

describe("validação e permissões", () => {
  it("data precisa existir", () => {
    expect(optDate({ d: "2026-02-28" }, "d")).toBe("2026-02-28");
    expect(() => optDate({ d: "2026-02-30" }, "d")).toThrow(ToolInputError);
    expect(() => optDate({ d: "30/02/2026" }, "d")).toThrow(ToolInputError);
    expect(() => reqString({ t: 3 }, "t")).toThrow(ToolInputError);
  });

  it("seção e escopo de cliente do painel valem no agente", () => {
    expect(canUseBoard(actor, "entregas")).toBe(true);
    expect(canUseBoard(actor, "instagram")).toBe(false);
    expect(canSeeClient(actor, "c1")).toBe(true);
    expect(canSeeClient(actor, "c2")).toBe(false);
    expect(canSeeClient(actor, null)).toBe(false);
    expect(canUseBoard({ ...actor, role: "admin" }, "instagram")).toBe(true);
  });
});

describe("tópico da resposta", () => {
  it("conversa sem ferramenta fica onde a pessoa escreveu", async () => {
    const { model } = scripted([[say("Oi!")]]);
    expect(replyTopic(await runAgent({ ...base, text: "oi", callModel: model }))).toBeNull();
  });

  it("consulta leva a resposta pro tópico da ferramenta", async () => {
    const { model } = scripted([[call("get_task", { protocol: "00420017" })], [say("OS")]]);
    expect(replyTopic(await runAgent({ ...base, text: "OS", callModel: model }))).toBe("ordens");
  });

  it("vale o tópico da última consulta", () => {
    const relatorio = { ...tools[0], topic: "relatorios" as const };
    expect(replyTopic({ kind: "reply", text: "", used: [tools[0], relatorio] })).toBe("relatorios");
  });

  it("prévia vai pro tópico da alteração", async () => {
    const { model } = scripted([[call("create_task", { title: "x" })]]);
    expect(replyTopic(await runAgent({ ...base, text: "cria", callModel: model }))).toBe("ordens");
  });
});
