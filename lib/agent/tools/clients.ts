import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { matchByName } from "@/lib/agent/match";
import { canSeeClient } from "@/lib/agent/permissions";
import { reqString } from "@/lib/agent/validate";
import { resolveClient } from "@/lib/agent/tools/tasks";
import { formatProtocol } from "@/lib/protocol";
import type { BacklogBoardKind } from "@/lib/backlogTypes";
import type { ReadTool } from "@/lib/agent/types";

export const findClients: ReadTool = {
  kind: "read",
  name: "find_clients",
  topic: "clientes",
  description:
    "Procura clientes por nome, apelido parcial ou código de 4 dígitos. Use antes de afirmar qual cliente " +
    "a pessoa quis dizer; se vier mais de um, pergunte.",
  parameters: {
    type: "object",
    properties: { query: { type: "string" } },
    required: ["query"],
    additionalProperties: false,
  },
  async run(actor, args) {
    const query = reqString(args, "query", 100);
    const { data, error } = await getSupabaseServerClient()
      .from("gallery_clients")
      .select("id, name, client_code, contact_name, archived_at");
    if (error) throw error;
    const visible = (data ?? []).filter((c) => canSeeClient(actor, c.id as string)) as {
      id: string;
      name: string;
      client_code: string;
      contact_name: string | null;
      archived_at: string | null;
    }[];
    const found = matchByName(visible, query, (c) => [c.name], (c) => c.client_code);
    const items = found.kind === "one" ? [found.item] : found.kind === "many" ? found.items : [];
    return {
      encontrados: items.map((c) => ({
        codigo: c.client_code,
        nome: c.name,
        contato: c.contact_name,
        arquivado: Boolean(c.archived_at),
      })),
    };
  },
};

export const getClient: ReadTool = {
  kind: "read",
  name: "get_client",
  topic: "clientes",
  description:
    "Resumo de um cliente: contato, tarefas em aberto e terminadas, atividade recente e quantas referências tem. " +
    "Para a lista completa de tarefas use find_tasks com o cliente.",
  parameters: {
    type: "object",
    properties: { client: { type: "string", description: "Nome ou código de 4 dígitos." } },
    required: ["client"],
    additionalProperties: false,
  },
  async run(actor, args) {
    const client = await resolveClient(actor, reqString(args, "client", 100));
    const supabase = getSupabaseServerClient();
    const [info, cards, refs] = await Promise.all([
      supabase.from("gallery_clients").select("contact_name, phone, email, payment_day, archived_at").eq("id", client.id).single(),
      supabase.from("backlog_cards").select("id, protocol_code, title, post_date, column_id").eq("client_id", client.id),
      supabase.from("reference_pins").select("id", { count: "exact", head: true }).eq("client_id", client.id),
    ]);
    if (info.error) throw info.error;
    if (cards.error) throw cards.error;

    const { data: columns, error: cErr } = await supabase.from("backlog_columns").select("id, name, board, position, billable");
    if (cErr) throw cErr;
    const cols = (columns ?? []) as { id: string; name: string; board: BacklogBoardKind; position: number; billable: boolean }[];
    const byId = new Map(cols.map((c) => [c.id, c]));
    const lastPosition = new Map<string, number>();
    for (const c of cols) lastPosition.set(c.board, Math.max(lastPosition.get(c.board) ?? 0, c.position));
    const finished = (columnId: string) => {
      const c = byId.get(columnId);
      return !c || c.billable || c.position === lastPosition.get(c.board);
    };
    const all = cards.data ?? [];
    const open = all.filter((c) => !finished(c.column_id as string));

    const ids = all.map((c) => c.id as string);
    const { data: activity, error: aErr } = ids.length
      ? await supabase
          .from("backlog_card_activity")
          .select("card_id, message, created_at")
          .in("card_id", ids)
          .order("created_at", { ascending: false })
          .limit(8)
      : { data: [], error: null };
    if (aErr) throw aErr;
    const protocolOf = new Map(all.map((c) => [c.id as string, c.protocol_code as string]));

    return {
      codigo: client.client_code,
      nome: client.name,
      contato: info.data.contact_name,
      telefone: info.data.phone,
      email: info.data.email,
      dia_de_pagamento: info.data.payment_day,
      arquivado: Boolean(info.data.archived_at),
      tarefas_em_aberto: open.length,
      tarefas_terminadas: all.length - open.length,
      em_aberto: open.slice(0, 10).map((c) => ({
        os: formatProtocol(c.protocol_code as string),
        tarefa: c.title,
        status: byId.get(c.column_id as string)?.name,
        prazo: c.post_date ? String(c.post_date).split("-").reverse().join("/") : null,
      })),
      referencias_salvas: refs.count ?? 0,
      atividade_recente: (activity ?? []).map((a) => ({
        os: formatProtocol(protocolOf.get(a.card_id as string) ?? ""),
        o_que: a.message,
        quando: String(a.created_at).slice(0, 10).split("-").reverse().join("/"),
      })),
    };
  },
};
