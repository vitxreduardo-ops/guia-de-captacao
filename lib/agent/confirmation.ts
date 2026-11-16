import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { toolByName } from "@/lib/agent/tools";
import { PermissionError } from "@/lib/agent/permissions";
import { ToolInputError } from "@/lib/agent/validate";
import { findActor } from "@/lib/telegram/identity";

const TTL_MINUTES = Number(process.env.TELEGRAM_ACTION_TTL_MINUTES) || 15;

export async function audit(entry: {
  userId: string | null;
  operation: string;
  params: unknown;
  outcome: "done" | "failed" | "cancelled" | "denied";
  detail?: string;
  pendingActionId?: string;
}) {
  const { error } = await getSupabaseServerClient().from("agent_audit_log").insert({
    user_id: entry.userId,
    operation: entry.operation,
    params: entry.params ?? {},
    outcome: entry.outcome,
    detail: entry.detail ?? "",
    pending_action_id: entry.pendingActionId ?? null,
  });
  if (error) console.error("[agent] auditoria", error.message);
}

/**
 * Guarda a prévia. A mesma mensagem do Telegram pedindo a mesma operação
 * devolve a ação que já existe em vez de criar outra.
 */
export async function createPendingAction(a: {
  userId: string;
  telegramUserId: number;
  chatId: number;
  threadId: number | null;
  operation: string;
  params: Record<string, unknown>;
  summary: string;
  idempotencyKey: string;
}): Promise<string> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("telegram_pending_actions")
    .upsert(
      {
        user_id: a.userId,
        telegram_user_id: a.telegramUserId,
        chat_id: a.chatId,
        thread_id: a.threadId,
        operation: a.operation,
        params: a.params,
        summary: a.summary,
        idempotency_key: a.idempotencyKey,
        expires_at: new Date(Date.now() + TTL_MINUTES * 60_000).toISOString(),
      },
      { onConflict: "idempotency_key", ignoreDuplicates: true }
    )
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (data) return data.id as string;
  const { data: existing, error: e2 } = await supabase
    .from("telegram_pending_actions")
    .select("id")
    .eq("idempotency_key", a.idempotencyKey)
    .single();
  if (e2) throw e2;
  return existing.id as string;
}

/**
 * Confirmar ou cancelar. O `update ... where status = 'pending'` é a trava:
 * dois cliques (ou um reenvio do Telegram) não executam duas vezes, e só o
 * mesmo id do Telegram que pediu consegue.
 */
export interface Resolution {
  text: string;
  /** Prévia original, pra reescrever a mensagem com o resultado. */
  summary: string | null;
  /** false = clique de outra pessoa: a prévia continua aberta pra quem pediu. */
  closed: boolean;
}

export async function resolvePendingAction(
  id: string,
  telegramUserId: number,
  decision: "confirm" | "cancel"
): Promise<Resolution> {
  const supabase = getSupabaseServerClient();
  const { data: row, error } = await supabase
    .from("telegram_pending_actions")
    .update({ status: decision === "confirm" ? "executing" : "cancelled" })
    .eq("id", id)
    .eq("status", "pending")
    .eq("telegram_user_id", telegramUserId)
    .gt("expires_at", new Date().toISOString())
    .select("*")
    .maybeSingle();
  if (error) throw error;

  if (!row) {
    const { data: current } = await supabase
      .from("telegram_pending_actions")
      .select("status, telegram_user_id, summary")
      .eq("id", id)
      .maybeSingle();
    if (!current) return { text: "Não achei essa ação.", summary: null, closed: false };
    if (Number(current.telegram_user_id) !== telegramUserId) {
      return { text: "Só quem pediu pode confirmar ou cancelar.", summary: null, closed: false };
    }
    const summary = current.summary as string;
    if (current.status === "pending") {
      await supabase.from("telegram_pending_actions").update({ status: "expired" }).eq("id", id).eq("status", "pending");
      return { text: "Essa prévia expirou. Nada foi alterado; peça de novo.", summary, closed: true };
    }
    // Outro clique já está resolvendo ou resolveu: não mexe na mensagem.
    return {
      text: current.status === "done" ? "Isso já foi feito." : current.status === "cancelled" ? "Isso já foi cancelado." : "Já estou cuidando disso.",
      summary: null,
      closed: false,
    };
  }

  const finish = async (status: "done" | "failed" | "cancelled", result: string) => {
    await supabase
      .from("telegram_pending_actions")
      .update({ status, result, finished_at: new Date().toISOString() })
      .eq("id", id);
    await audit({
      userId: row.user_id,
      operation: row.operation,
      params: row.params,
      outcome: status,
      detail: result,
      pendingActionId: id,
    });
    return { text: result, summary: row.summary as string, closed: true };
  };

  if (decision === "cancel") return finish("cancelled", "Cancelado. Nada foi alterado.");

  try {
    // Permissão relida agora, não a de quando a prévia foi feita.
    const actor = await findActor(telegramUserId);
    if (!actor || actor.userId !== row.user_id) throw new PermissionError("Seu acesso mudou. Nada foi alterado.");
    const tool = toolByName(row.operation);
    if (!tool || tool.kind !== "write") throw new Error(`Operação desconhecida: ${row.operation}`);
    return await finish("done", await tool.execute(actor, row.params));
  } catch (error) {
    const known = error instanceof PermissionError || error instanceof ToolInputError;
    if (!known) console.error("[agent] execução", error instanceof Error ? error.message : error);
    return finish(
      "failed",
      known ? (error as Error).message : "Deu erro no meio da execução. Confira no painel antes de pedir de novo."
    );
  }
}
