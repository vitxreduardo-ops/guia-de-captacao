import type { TelegramActor } from "@/lib/telegram/identity";

/** Esquema no formato do function calling da OpenAI (modo strict). */
export interface ToolSchema {
  type: "object";
  properties: Record<string, unknown>;
  required: string[];
  additionalProperties: false;
}

interface ToolBase {
  name: string;
  description: string;
  parameters: ToolSchema;
}

/** Consulta: roda direto e o resultado volta pro modelo. */
export interface ReadTool extends ToolBase {
  kind: "read";
  run(actor: TelegramActor, args: Record<string, unknown>): Promise<unknown>;
}

/**
 * Alteração: `prepare` valida e resolve tudo (nomes viram ids) e devolve a
 * prévia; nada muda no banco. `execute` roda só depois do Confirmar, com os
 * parâmetros guardados, e confere as permissões de novo.
 */
export interface WriteTool<P = Record<string, unknown>> extends ToolBase {
  kind: "write";
  prepare(actor: TelegramActor, args: Record<string, unknown>): Promise<{ summary: string; params: P }>;
  execute(actor: TelegramActor, params: P): Promise<string>;
}

export type AgentTool = ReadTool | WriteTool;
