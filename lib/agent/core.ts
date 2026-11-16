// Tatu Agent Core: independe do Telegram. Recebe quem pede, o texto e a
// conversa recente; consulta o que precisar pelas ferramentas e devolve uma
// resposta ou uma prévia de alteração (que só roda depois do Confirmar).
//
// O modelo nunca toca no banco: só escolhe ferramenta e argumentos, e cada
// argumento é validado de novo em `prepare`/`run`.

import type { AgentTool, WriteTool } from "@/lib/agent/types";
import type { TelegramActor } from "@/lib/telegram/identity";
import { ToolInputError } from "@/lib/agent/validate";
import { PermissionError } from "@/lib/agent/permissions";

export type ResponseItem = Record<string, unknown> & { type?: string };
export type CallModel = (body: { instructions: string; input: ResponseItem[]; tools: unknown[] }) => Promise<ResponseItem[]>;

export interface AgentContext {
  actor: TelegramActor;
  text: string;
  history: { role: "user" | "assistant"; content: string }[];
  /** Onde a conversa acontece, ex.: "tópico 01 — Referências do grupo Tatu | HUB". */
  where: string;
  today: string;
  tools: AgentTool[];
  callModel: CallModel;
}

export type AgentResult =
  | { kind: "reply"; text: string }
  | { kind: "confirm"; tool: WriteTool; summary: string; params: Record<string, unknown> };

const MAX_STEPS = 6;

export function instructions(ctx: Pick<AgentContext, "actor" | "where" | "today">): string {
  return [
    "Você é o Tatu Agent, assistente operacional da Tatu Estúdio Criativo (estúdio de foto, vídeo e social media).",
    `Quem fala: ${ctx.actor.username} (${ctx.actor.role}). Onde: ${ctx.where}. Hoje: ${ctx.today} (America/Sao_Paulo).`,
    "",
    "Regras:",
    "- Responda em português do Brasil, curto e organizado, em texto simples (sem Markdown, sem asteriscos).",
    "- Dados só vêm das ferramentas. Nunca invente cliente, tarefa, protocolo, data, número ou pessoa. Se uma ferramenta não trouxer, diga que não encontrou.",
    "- Protocolo de OS tem 8 dígitos (CCCC TTTT). Quem gera é o sistema; nunca proponha um.",
    "- Se o pedido estiver incompleto ou ambíguo (qual cliente, o que fazer), pergunte antes de chamar uma ferramenta de alteração.",
    "- Ferramentas de alteração não gravam: geram uma prévia que a pessoa confirma num botão. Nunca diga que algo foi feito.",
    "- Datas relativas (amanhã, sexta) viram AAAA-MM-DD a partir de hoje.",
    "- Para uma OS, mostre uma linha por campo: OS, Cliente, Tarefa, Responsável, Prazo, Status.",
    "- Para listas, uma linha por item: OS · tarefa · cliente · prazo. Diga o total quando passar do que mostrou.",
    "- Pedidos fora do que as ferramentas cobrem: diga que ainda não consegue fazer isso pelo Telegram.",
  ].join("\n");
}

function toolSpec(tool: AgentTool) {
  return { type: "function", name: tool.name, description: tool.description, parameters: tool.parameters, strict: true };
}

function outputText(items: ResponseItem[]): string {
  return items
    .filter((i) => i.type === "message")
    .flatMap((i) => (i.content as { type: string; text?: string }[]) ?? [])
    .filter((c) => c.type === "output_text")
    .map((c) => c.text ?? "")
    .join("\n")
    .trim();
}

function errorOutput(error: unknown): { erro: string } {
  if (error instanceof ToolInputError || error instanceof PermissionError) return { erro: error.message };
  console.error("[agent] ferramenta", error instanceof Error ? error.message : error);
  return { erro: "Falha interna ao consultar. Diga à pessoa que não deu pra consultar agora." };
}

export async function runAgent(ctx: AgentContext): Promise<AgentResult> {
  const input: ResponseItem[] = [
    ...ctx.history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: ctx.text.slice(0, 4000) },
  ];
  const tools = ctx.tools.map(toolSpec);

  for (let step = 0; step < MAX_STEPS; step++) {
    const output = await ctx.callModel({ instructions: instructions(ctx), input, tools });
    const calls = output.filter((i) => i.type === "function_call");
    if (!calls.length) {
      return { kind: "reply", text: outputText(output) || "Não consegui responder agora. Pode repetir?" };
    }
    // Com store:false o item de raciocínio não pode voltar sem o conteúdo
    // cifrado; as chamadas bastam pro modelo seguir de onde parou.
    input.push(...calls);

    for (const call of calls) {
      const tool = ctx.tools.find((t) => t.name === call.name);
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(String(call.arguments ?? "{}"));
      } catch {
        args = {};
      }
      let result: unknown;
      if (!tool) {
        result = { erro: "Ferramenta inexistente." };
      } else if (tool.kind === "write") {
        try {
          const prepared = await tool.prepare(ctx.actor, args);
          return { kind: "confirm", tool, summary: prepared.summary, params: prepared.params as Record<string, unknown> };
        } catch (error) {
          result = errorOutput(error);
        }
      } else {
        try {
          result = await tool.run(ctx.actor, args);
        } catch (error) {
          result = errorOutput(error);
        }
      }
      input.push({ type: "function_call_output", call_id: call.call_id, output: JSON.stringify(result) });
    }
  }
  return { kind: "reply", text: "Esse pedido precisou de passos demais. Pode dividir em partes menores?" };
}
