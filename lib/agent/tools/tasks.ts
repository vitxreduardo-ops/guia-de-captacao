import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  createBacklogActivity,
  createBacklogCard,
  findCardByProtocol,
  setBacklogCardAssignees,
  setBacklogCardColumn,
} from "@/lib/backlog";
import { notifyUser } from "@/lib/notifications";
import { syncBacklogCardToCalendar } from "@/lib/googleCalendar";
import { BACKLOG_BOARDS, type BacklogBoardKind } from "@/lib/backlogTypes";
import { formatProtocol, parseProtocol } from "@/lib/protocol";
import { matchByName, normalizeName } from "@/lib/agent/match";
import {
  PermissionError,
  assertBoard,
  assertClient,
  canSeeClient,
  canUseBoard,
} from "@/lib/agent/permissions";
import {
  ToolInputError,
  oneOf,
  optBool,
  optDate,
  optInt,
  optString,
  reqString,
} from "@/lib/agent/validate";
import type { ReadTool, WriteTool } from "@/lib/agent/types";
import type { TelegramActor } from "@/lib/telegram/identity";

const TZ = process.env.BACKLOG_TIME_ZONE || "America/Sao_Paulo";

/** AAAA-MM-DD de hoje no fuso do estúdio. */
export function todayKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(now);
}

const brDate = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : null);

interface ColumnRow {
  id: string;
  name: string;
  board: BacklogBoardKind;
  position: number;
  billable: boolean;
}

interface CardRow {
  id: string;
  protocol_code: string;
  title: string;
  description: string;
  client_id: string | null;
  column_id: string;
  post_date: string | null;
}

/** Última coluna do quadro ou faturável = trabalho terminado. */
function isFinished(column: ColumnRow, columns: ColumnRow[]): boolean {
  if (column.billable) return true;
  const last = Math.max(...columns.filter((c) => c.board === column.board).map((c) => c.position));
  return column.position === last;
}

async function loadContext(actor: TelegramActor) {
  const supabase = getSupabaseServerClient();
  const [columns, clients, users] = await Promise.all([
    supabase.from("backlog_columns").select("id, name, board, position, billable").order("position"),
    supabase.from("gallery_clients").select("id, name, client_code, archived_at"),
    supabase.from("users").select("id, username, full_name").neq("role", "client"),
  ]);
  if (columns.error) throw columns.error;
  if (clients.error) throw clients.error;
  if (users.error) throw users.error;
  return {
    columns: ((columns.data ?? []) as ColumnRow[]).filter((c) => canUseBoard(actor, c.board)),
    clients: (clients.data ?? []) as { id: string; name: string; client_code: string; archived_at: string | null }[],
    users: (users.data ?? []) as { id: string; username: string; full_name: string }[],
  };
}

/** Acha o cliente pelo nome ou código, dentro do acesso de quem pede. */
export async function resolveClient(actor: TelegramActor, query: string) {
  const { data, error } = await getSupabaseServerClient()
    .from("gallery_clients")
    .select("id, name, client_code")
    .is("archived_at", null);
  if (error) throw error;
  const visible = (data ?? []).filter((c) => canSeeClient(actor, c.id as string)) as {
    id: string;
    name: string;
    client_code: string;
  }[];
  const found = matchByName(visible, query, (c) => [c.name], (c) => c.client_code);
  if (found.kind === "none") throw new ToolInputError(`Não achei cliente "${query}".`);
  if (found.kind === "many") {
    throw new ToolInputError(
      `"${query}" bate com mais de um cliente: ${found.items.map((c) => c.name).join(", ")}. Pergunte qual.`
    );
  }
  return found.item;
}

export const getTask: ReadTool = {
  kind: "read",
  name: "get_task",
  topic: "ordens",
  description: "Detalhes de uma ordem de serviço (OS) pelo protocolo de 8 dígitos, ex.: 00420017.",
  parameters: {
    type: "object",
    properties: { protocol: { type: "string", description: "8 dígitos, com ou sem espaço." } },
    required: ["protocol"],
    additionalProperties: false,
  },
  async run(actor, args) {
    const protocol = parseProtocol(reqString(args, "protocol", 20));
    if (!protocol) throw new ToolInputError("Protocolo tem 8 dígitos, como 0042 0017.");
    const scope = actor.role === "admin" ? null : actor.allowedClientIds;
    const found = await findCardByProtocol(protocol, scope);
    if (!found || !canUseBoard(actor, found.board)) return { found: false, protocol };
    return {
      found: true,
      os: formatProtocol(found.card.protocol_code),
      tarefa: found.card.title,
      cliente: found.clientName ?? "Tatu (interna)",
      quadro: found.board === "entregas" ? "Entregas de clientes" : "Backlog do Instagram da Tatu",
      status: found.columnName,
      responsaveis: found.assigneeNames,
      prazo: brDate(found.card.post_date),
      descricao: found.card.description.slice(0, 600),
    };
  },
};

export const findTasks: ReadTool = {
  kind: "read",
  name: "find_tasks",
  topic: "relatorios",
  description:
    "Lista ordens de serviço com filtros. Use para: tarefas de um cliente, atrasadas, sem responsável, " +
    "em uma etapa (status), ou com prazo num intervalo. Prazo = data da entrega do card.",
  parameters: {
    type: "object",
    properties: {
      client: { type: ["string", "null"], description: "Nome ou código de 4 dígitos do cliente." },
      status: { type: ["string", "null"], description: "Nome (ou parte) da etapa/coluna, ex.: 'aprovação'." },
      overdue: { type: ["boolean", "null"], description: "Só prazo vencido e ainda não terminadas." },
      unassigned: { type: ["boolean", "null"], description: "Só sem responsável." },
      open_only: { type: ["boolean", "null"], description: "Esconde as terminadas (padrão: true)." },
      due_from: { type: ["string", "null"], description: "Prazo a partir de AAAA-MM-DD." },
      due_to: { type: ["string", "null"], description: "Prazo até AAAA-MM-DD." },
      board: { type: ["string", "null"], enum: ["entregas", "instagram", null] },
      limit: { type: ["integer", "null"], description: "Máximo de itens (padrão 20, até 50)." },
    },
    required: ["client", "status", "overdue", "unassigned", "open_only", "due_from", "due_to", "board", "limit"],
    additionalProperties: false,
  },
  async run(actor, args) {
    const clientQuery = optString(args, "client", 100);
    const status = optString(args, "status", 60);
    const overdue = optBool(args, "overdue");
    const unassigned = optBool(args, "unassigned");
    const openOnly = args.open_only === false ? false : true;
    const dueFrom = optDate(args, "due_from");
    const dueTo = optDate(args, "due_to");
    const board = args.board ? oneOf(args, "board", BACKLOG_BOARDS) : null;
    const limit = optInt(args, "limit", 1, 50, 20);
    if (board) assertBoard(actor, board);

    const ctx = await loadContext(actor);
    let columns = board ? ctx.columns.filter((c) => c.board === board) : ctx.columns;
    if (status) {
      const s = normalizeName(status);
      columns = columns.filter((c) => normalizeName(c.name).includes(s));
      if (!columns.length) {
        return { total: 0, aviso: `Nenhuma etapa com "${status}". Etapas: ${ctx.columns.map((c) => c.name).join(", ")}` };
      }
    }
    if (!columns.length) return { total: 0, itens: [] };

    let query = getSupabaseServerClient()
      .from("backlog_cards")
      .select("id, protocol_code, title, description, client_id, column_id, post_date")
      .in("column_id", columns.map((c) => c.id))
      .order("post_date", { ascending: true, nullsFirst: false });
    if (clientQuery) query = query.eq("client_id", (await resolveClient(actor, clientQuery)).id);
    if (dueFrom) query = query.gte("post_date", dueFrom);
    if (dueTo) query = query.lte("post_date", dueTo);
    if (overdue) query = query.lt("post_date", todayKey());
    const { data, error } = await query;
    if (error) throw error;

    const columnById = new Map(ctx.columns.map((c) => [c.id, c]));
    let cards = ((data ?? []) as CardRow[]).filter((card) => {
      const column = columnById.get(card.column_id)!;
      if (column.board === "entregas" && !canSeeClient(actor, card.client_id)) return false;
      if ((overdue || (openOnly && !status)) && isFinished(column, ctx.columns)) return false;
      return true;
    });

    const { data: assignees, error: aErr } = cards.length
      ? await getSupabaseServerClient()
          .from("backlog_card_assignees")
          .select("card_id, user_id")
          .in("card_id", cards.map((c) => c.id))
      : { data: [], error: null };
    if (aErr) throw aErr;
    const byCard = new Map<string, string[]>();
    for (const a of assignees ?? []) {
      byCard.set(a.card_id as string, [...(byCard.get(a.card_id as string) ?? []), a.user_id as string]);
    }
    if (unassigned) cards = cards.filter((c) => !byCard.get(c.id)?.length);

    const userName = new Map(ctx.users.map((u) => [u.id, u.username]));
    const clientName = new Map(ctx.clients.map((c) => [c.id, c.name]));
    return {
      total: cards.length,
      hoje: brDate(todayKey()),
      itens: cards.slice(0, limit).map((c) => ({
        os: formatProtocol(c.protocol_code),
        tarefa: c.title,
        cliente: c.client_id ? clientName.get(c.client_id) ?? "?" : "Tatu (interna)",
        status: columnById.get(c.column_id)?.name,
        prazo: brDate(c.post_date),
        responsaveis: (byCard.get(c.id) ?? []).map((id) => userName.get(id) ?? "?"),
      })),
    };
  },
};

type CreateTaskParams = {
  board: BacklogBoardKind;
  column_id: string;
  title: string;
  description: string;
  client_id: string | null;
  client_name: string | null;
  post_date: string | null;
  assignee_ids: string[];
};

export const createTask: WriteTool<CreateTaskParams> = {
  kind: "write",
  name: "create_task",
  topic: "ordens",
  description:
    "Cria uma ordem de serviço (card). Pede confirmação antes de gravar. " +
    "board 'entregas' = trabalho para cliente (exige client). " +
    "board 'instagram' = post do Instagram da própria Tatu (sem client). " +
    "Se faltar o que fazer ou o cliente, pergunte antes de chamar.",
  parameters: {
    type: "object",
    properties: {
      board: { type: "string", enum: ["entregas", "instagram"] },
      title: { type: "string", description: "O que fazer, curto. Ex.: 'Editar vídeo institucional'." },
      client: { type: ["string", "null"], description: "Nome ou código do cliente (obrigatório em entregas)." },
      description: { type: ["string", "null"] },
      deadline: { type: ["string", "null"], description: "Prazo (data da entrega) AAAA-MM-DD." },
      assignee: { type: ["string", "null"], description: "Usuário ou nome de quem fica responsável." },
    },
    required: ["board", "title", "client", "description", "deadline", "assignee"],
    additionalProperties: false,
  },

  async prepare(actor, args) {
    const board = oneOf(args, "board", BACKLOG_BOARDS);
    assertBoard(actor, board);
    const title = reqString(args, "title", 200);
    const description = optString(args, "description", 2000) ?? "";
    const deadline = optDate(args, "deadline");
    const clientQuery = optString(args, "client", 100);
    const assigneeQuery = optString(args, "assignee", 100);

    if (board === "entregas" && !clientQuery) throw new ToolInputError("Entrega de cliente precisa do cliente. Pergunte qual.");
    if (board === "instagram" && clientQuery) {
      throw new ToolInputError("O Backlog é só do Instagram da Tatu; trabalho de cliente vai em 'entregas'.");
    }
    const client = clientQuery ? await resolveClient(actor, clientQuery) : null;

    const ctx = await loadContext(actor);
    const column = ctx.columns.filter((c) => c.board === board).sort((a, b) => a.position - b.position)[0];
    if (!column) throw new ToolInputError("Esse quadro não tem nenhuma etapa criada.");

    let assignee: { id: string; username: string } | null = null;
    if (assigneeQuery) {
      const found = matchByName(ctx.users, assigneeQuery, (u) => [u.username, u.full_name].filter(Boolean));
      if (found.kind === "none") throw new ToolInputError(`Não achei ninguém da equipe chamado "${assigneeQuery}".`);
      if (found.kind === "many") {
        throw new ToolInputError(`"${assigneeQuery}" bate com: ${found.items.map((u) => u.username).join(", ")}. Pergunte qual.`);
      }
      assignee = found.item;
    }

    const summary = [
      "Criar ordem de serviço",
      `Cliente: ${client?.name ?? "Tatu (Instagram da Tatu)"}`,
      `Tarefa: ${title}`,
      description ? `Descrição: ${description.slice(0, 300)}` : null,
      `Responsável: ${assignee?.username ?? "ninguém"}`,
      `Prazo: ${brDate(deadline) ?? "sem prazo"}`,
      `Etapa: ${column.name}`,
    ]
      .filter(Boolean)
      .join("\n");

    return {
      summary,
      params: {
        board,
        column_id: column.id,
        title,
        description,
        client_id: client?.id ?? null,
        client_name: client?.name ?? null,
        post_date: deadline,
        assignee_ids: assignee ? [assignee.id] : [],
      },
    };
  },

  async execute(actor, params) {
    // Pode ter mudado entre a prévia e o clique: acesso, coluna, cliente.
    assertBoard(actor, params.board);
    if (params.board === "entregas") assertClient(actor, params.client_id);
    const supabase = getSupabaseServerClient();
    const { data: column } = await supabase
      .from("backlog_columns")
      .select("board")
      .eq("id", params.column_id)
      .maybeSingle();
    if (column?.board !== params.board) throw new PermissionError("A etapa escolhida não existe mais.");

    const card = await createBacklogCard(params.column_id, {
      title: params.title,
      description: params.description,
      client_id: params.client_id,
      post_date: params.post_date,
      assignee_ids: params.assignee_ids,
      format: "reel",
    });
    await createBacklogActivity({
      cardId: card.id,
      authorId: actor.userId,
      kind: "note",
      message: "Criada pelo Tatu Agent (Telegram)",
    });
    await Promise.all(
      params.assignee_ids
        .filter((id) => id !== actor.userId)
        .map((userId) =>
          notifyUser({
            userId,
            actorId: actor.userId,
            kind: "card_assigned",
            title: "Novo material atribuído a você",
            body: card.title,
            link: params.board === "entregas" ? "/admin/entregas" : "/admin/backlog",
            entityId: card.id,
          })
        )
    );
    try {
      await syncBacklogCardToCalendar(card.id);
    } catch (error) {
      console.error("[agent] agenda", error instanceof Error ? error.message : error);
    }
    return `OS ${formatProtocol(card.protocol_code)} criada: ${card.title}${params.client_name ? ` (${params.client_name})` : ""}.`;
  },
};

// ------------------------------------------------------------ atualizar OS

type UpdateTaskParams = {
  card_id: string;
  protocol: string;
  board: BacklogBoardKind;
  title: string | null;
  description: string | null;
  post_date: string | null | undefined;
  column_id: string | null;
  from_column: string;
  to_column: string | null;
  add_assignee_ids: string[];
  set_assignee_ids: string[] | null;
};

/** Nome de quem é responsável hoje, por card. */
async function assigneeNames(cardId: string): Promise<{ ids: string[]; names: string[] }> {
  const { data, error } = await getSupabaseServerClient()
    .from("backlog_card_assignees")
    .select("user_id, users(username)")
    .eq("card_id", cardId);
  if (error) throw error;
  const rows = (data ?? []).map((r) => {
    const u = r.users as unknown as { username: string } | { username: string }[] | null;
    return { id: r.user_id as string, name: Array.isArray(u) ? u[0]?.username : u?.username };
  });
  return { ids: rows.map((r) => r.id), names: rows.map((r) => r.name ?? "?") };
}

export const updateTask: WriteTool<UpdateTaskParams> = {
  kind: "write",
  name: "update_task",
  topic: "ordens",
  description:
    "Atualiza uma OS existente pelo protocolo: mudar a etapa (status), responsável, prazo, título ou descrição. " +
    "Pede confirmação. Só os campos que a pessoa pediu; o resto fica null. " +
    "Não move para etapa visível ao cliente nem de pagamento recebido: isso é feito no painel.",
  parameters: {
    type: "object",
    properties: {
      protocol: { type: "string", description: "Protocolo de 8 dígitos da OS." },
      status: { type: ["string", "null"], description: "Nome da etapa de destino, ex.: 'Em edição'." },
      assignee: { type: ["string", "null"], description: "Pessoa a acrescentar como responsável." },
      replace_assignees: { type: ["boolean", "null"], description: "true = 'assignee' passa a ser o único responsável." },
      deadline: { type: ["string", "null"], description: "Novo prazo AAAA-MM-DD." },
      clear_deadline: { type: ["boolean", "null"], description: "true = tirar o prazo." },
      title: { type: ["string", "null"] },
      description: { type: ["string", "null"] },
    },
    required: ["protocol", "status", "assignee", "replace_assignees", "deadline", "clear_deadline", "title", "description"],
    additionalProperties: false,
  },

  async prepare(actor, args) {
    const protocol = parseProtocol(reqString(args, "protocol", 20));
    if (!protocol) throw new ToolInputError("Protocolo tem 8 dígitos, como 0042 0017.");
    const found = await findCardByProtocol(protocol, actor.role === "admin" ? null : actor.allowedClientIds);
    if (!found) throw new ToolInputError(`Não achei a OS ${formatProtocol(protocol)}.`);
    assertBoard(actor, found.board);
    if (found.board === "entregas") assertClient(actor, found.card.client_id);

    const statusQuery = optString(args, "status", 60);
    const assigneeQuery = optString(args, "assignee", 100);
    const replace = optBool(args, "replace_assignees");
    const clearDeadline = optBool(args, "clear_deadline");
    const deadline = optDate(args, "deadline");
    const title = optString(args, "title", 200);
    const description = optString(args, "description", 2000);
    if (!statusQuery && !assigneeQuery && !deadline && !clearDeadline && !title && description === null) {
      throw new ToolInputError("Nada para mudar. Pergunte o que alterar nessa OS.");
    }
    if (deadline && clearDeadline) throw new ToolInputError("Prazo novo e 'tirar prazo' ao mesmo tempo.");

    const ctx = await loadContext(actor);
    const sameBoard = ctx.columns.filter((c) => c.board === found.board);

    let target: (ColumnRow & { client_visible?: boolean; paid?: boolean }) | null = null;
    if (statusQuery) {
      const { data: cols, error } = await getSupabaseServerClient()
        .from("backlog_columns")
        .select("id, name, board, position, billable, paid, client_visible")
        .eq("board", found.board);
      if (error) throw error;
      const m = matchByName((cols ?? []) as (ColumnRow & { client_visible: boolean; paid: boolean })[], statusQuery, (c) => [c.name]);
      if (m.kind === "none") {
        throw new ToolInputError(`Não existe a etapa "${statusQuery}". Etapas: ${sameBoard.map((c) => c.name).join(", ")}.`);
      }
      if (m.kind === "many") {
        throw new ToolInputError(`"${statusQuery}" bate com: ${m.items.map((c) => c.name).join(", ")}. Pergunte qual.`);
      }
      target = m.item;
      if (target.client_visible) {
        throw new PermissionError(
          `"${target.name}" é uma etapa que o cliente enxerga (ele recebe aviso no celular). Mova essa pelo painel.`
        );
      }
      if (target.paid) {
        throw new PermissionError(`"${target.name}" marca pagamento recebido e pede data e forma de pagamento. Faça isso pelo painel.`);
      }
      if (target.id === found.card.column_id) throw new ToolInputError(`A OS já está em "${target.name}".`);
    }

    let person: { id: string; username: string } | null = null;
    if (assigneeQuery) {
      const m = matchByName(ctx.users, assigneeQuery, (u) => [u.username, u.full_name].filter(Boolean));
      if (m.kind === "none") throw new ToolInputError(`Não achei ninguém da equipe chamado "${assigneeQuery}".`);
      if (m.kind === "many") throw new ToolInputError(`"${assigneeQuery}" bate com: ${m.items.map((u) => u.username).join(", ")}. Pergunte qual.`);
      person = m.item;
    }

    const current = await assigneeNames(found.card.id);
    const lines = [`Atualizar OS ${formatProtocol(protocol)} — ${found.card.title}`, `Cliente: ${found.clientName ?? "Tatu (interna)"}`];
    if (target) lines.push(`Status: ${found.columnName} → ${target.name}`);
    if (person) {
      lines.push(
        replace
          ? `Responsável: ${current.names.join(", ") || "ninguém"} → ${person.username}`
          : current.ids.includes(person.id)
            ? `Responsável: ${person.username} já é responsável (sem mudança)`
            : `Responsável: ${[...current.names, person.username].join(", ")} (acrescenta ${person.username})`
      );
    }
    if (deadline) lines.push(`Prazo: ${brDate(found.card.post_date) ?? "sem prazo"} → ${brDate(deadline)}`);
    if (clearDeadline) lines.push(`Prazo: ${brDate(found.card.post_date) ?? "sem prazo"} → sem prazo`);
    if (title) lines.push(`Título: ${found.card.title} → ${title}`);
    if (description !== null) lines.push(`Descrição: ${description.slice(0, 300)}`);

    return {
      summary: lines.join("\n"),
      params: {
        card_id: found.card.id,
        protocol,
        board: found.board,
        title,
        description,
        post_date: deadline ? deadline : clearDeadline ? null : undefined,
        column_id: target?.id ?? null,
        from_column: found.columnName,
        to_column: target?.name ?? null,
        add_assignee_ids: person && !replace && !current.ids.includes(person.id) ? [person.id] : [],
        set_assignee_ids: person && replace ? [person.id] : null,
      },
    };
  },

  async execute(actor, p) {
    assertBoard(actor, p.board);
    const supabase = getSupabaseServerClient();
    const { data: card, error } = await supabase
      .from("backlog_cards")
      .select("id, client_id, column_id, title")
      .eq("id", p.card_id)
      .maybeSingle();
    if (error) throw error;
    if (!card) throw new ToolInputError("Essa OS não existe mais.");
    if (p.board === "entregas") assertClient(actor, card.client_id as string | null);

    // Etapa relida: pode ter virado visível ao cliente ou de pagamento desde a prévia.
    if (p.column_id) {
      const { data: col } = await supabase
        .from("backlog_columns")
        .select("board, paid, client_visible, name")
        .eq("id", p.column_id)
        .maybeSingle();
      if (!col || col.board !== p.board) throw new PermissionError("A etapa escolhida não existe mais.");
      if (col.client_visible || col.paid) throw new PermissionError(`"${col.name}" mudou e agora só se move pelo painel.`);
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (p.title) patch.title = p.title;
    if (p.description !== null) patch.description = p.description;
    if (p.post_date !== undefined) patch.post_date = p.post_date;
    if (Object.keys(patch).length > 1) {
      const { error: upErr } = await supabase.from("backlog_cards").update(patch).eq("id", p.card_id);
      if (upErr) throw upErr;
    }

    const link = p.board === "entregas" ? "/admin/entregas" : "/admin/backlog";
    const done: string[] = [];

    if (p.column_id) {
      await setBacklogCardColumn({ cardId: p.card_id, columnId: p.column_id });
      await createBacklogActivity({
        cardId: p.card_id,
        authorId: actor.userId,
        kind: "move",
        message: `Moveu de "${p.from_column}" para "${p.to_column}" (Tatu Agent)`,
      });
      done.push(`etapa ${p.to_column}`);
    }

    let notify: string[] = [];
    if (p.set_assignee_ids) {
      await setBacklogCardAssignees(p.card_id, p.set_assignee_ids);
      notify = p.set_assignee_ids;
      done.push("responsável");
    } else if (p.add_assignee_ids.length) {
      const { ids } = await assigneeNames(p.card_id);
      await setBacklogCardAssignees(p.card_id, [...new Set([...ids, ...p.add_assignee_ids])]);
      notify = p.add_assignee_ids;
      done.push("responsável");
    }
    await Promise.all(
      notify
        .filter((id) => id !== actor.userId)
        .map((userId) =>
          notifyUser({
            userId,
            actorId: actor.userId,
            kind: "card_assigned",
            title: "Material atribuído a você",
            body: card.title as string,
            link,
            entityId: p.card_id,
          })
        )
    );

    if (p.title) done.push("título");
    if (p.description !== null) done.push("descrição");
    if (p.post_date !== undefined) done.push("prazo");

    if (p.post_date !== undefined) {
      try {
        await syncBacklogCardToCalendar(p.card_id);
      } catch (e) {
        console.error("[agent] agenda", e instanceof Error ? e.message : e);
      }
    }
    if (p.column_id || notify.length) {
      // Quem já é responsável também quer saber que a etapa mudou.
      const brief = await assigneeNames(p.card_id);
      if (p.column_id) {
        await Promise.all(
          brief.ids
            .filter((id) => id !== actor.userId && !notify.includes(id))
            .map((userId) =>
              notifyUser({
                userId,
                actorId: actor.userId,
                kind: "card_moved",
                title: `Material movido para "${p.to_column}"`,
                body: card.title as string,
                link,
                entityId: p.card_id,
              })
            )
        );
      }
    }
    return `OS ${formatProtocol(p.protocol)} atualizada (${done.join(", ")}).`;
  },
};
