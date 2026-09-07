import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  BACKUP_QUESTION,
  normalizeBacklogFormat,
  parseBacklogTags,
  shouldAskBackupQuestion,
  normalizeBacklogBoard,
  normalizeContractType,
  normalizePaymentMethod,
  PAYMENT_QUESTION,
  type BacklogActivity,
  type BacklogPrompt,
  type ContractType,
  type PaymentMethod,
  type BacklogBoard,
  type BacklogBoardKind,
  type BacklogCard,
  type BacklogChecklistItem,
  type BacklogClientOption,
  type BacklogColumn,
  type BacklogFormat,
  type BacklogGuideOption,
  type BacklogUserOption,
  type ServiceOption,
} from "@/lib/backlogTypes";
import { parseBRLToCents } from "@/lib/billingTypes";

export type {
  BacklogActivity,
  BacklogBoard,
  BacklogBoardKind,
  BacklogCard,
  BacklogChecklistItem,
  BacklogClientOption,
  BacklogColumn,
  BacklogFormat,
  BacklogGuideOption,
  BacklogUserOption,
  ServiceOption,
};

function normalizeUrl(value: unknown): string | null {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return null;
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
}

function normalizeDate(value: unknown): string | null {
  const trimmed = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

/** "18:30" do input type=time; qualquer outra coisa vira null. */
function normalizeTime(value: unknown): string | null {
  const trimmed = String(value ?? "").trim();
  return /^\d{2}:\d{2}$/.test(trimmed) ? trimmed : null;
}

function normalizeUuid(value: unknown): string | null {
  const trimmed = String(value ?? "").trim();
  return trimmed && trimmed !== "none" ? trimmed : null;
}

/** Campo vazio = sem valor lançado, que é diferente de entrega de graça. */
function normalizePrice(value: unknown): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  return parseBRLToCents(raw);
}

function normalizeQuantity(value: unknown): number {
  const parsed = Math.floor(Number(String(value ?? "").trim()));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function normalizeText(value: unknown): string | null {
  const trimmed = String(value ?? "").trim();
  return trimmed || null;
}

// ---------------------------------------------------------------- leitura

export async function getBacklogBoard(
  board: BacklogBoardKind = "instagram"
): Promise<BacklogBoard> {
  const supabase = getSupabaseServerClient();

  // Os cards vêm filtrados pelas colunas do quadro pedido, então o kanban de
  // entregas nunca carrega o backlog do Instagram (e vice-versa).
  const { data: columnRows, error: columnsError } = await supabase
    .from("backlog_columns")
    .select("*")
    .eq("board", board)
    .order("position");
  if (columnsError) throw columnsError;

  const columns = (columnRows ?? []) as BacklogColumn[];
  const columnIds = columns.map((column) => column.id);

  if (columnIds.length === 0) {
    const [clientsResult, guidesResult, usersResult, servicesResult] =
      await Promise.all([
        supabase.from("gallery_clients").select("id, name").order("name"),
        supabase.from("guides").select("id, title").order("title"),
        supabase.from("users").select("id, username").order("username"),
        supabase
          .from("services")
          .select("id, name, price_cents")
          .eq("active", true)
          .order("position"),
      ]);
    return {
      board,
      columns,
      cards: [],
      checklist: [],
      activity: [],
      clients: (clientsResult.data ?? []) as BacklogClientOption[],
      guides: (guidesResult.data ?? []) as BacklogGuideOption[],
      users: (usersResult.data ?? []) as BacklogUserOption[],
      services: (servicesResult.data ?? []) as ServiceOption[],
    };
  }

  const { data: cardRows, error: cardsError } = await supabase
    .from("backlog_cards")
    .select("*")
    .in("column_id", columnIds)
    .order("column_id")
    .order("position");
  if (cardsError) throw cardsError;

  const rawCards = (cardRows ?? []) as Omit<BacklogCard, "assignee_ids">[];
  const cardIds = rawCards.map((card) => card.id);

  const { data: assigneeRows, error: assigneesError } = cardIds.length
    ? await supabase
        .from("backlog_card_assignees")
        .select("card_id, user_id")
        .in("card_id", cardIds)
    : { data: [], error: null };
  if (assigneesError) throw assigneesError;

  const assigneesByCard = new Map<string, string[]>();
  for (const row of assigneeRows ?? []) {
    const cardId = row.card_id as string;
    const list = assigneesByCard.get(cardId);
    if (list) list.push(row.user_id as string);
    else assigneesByCard.set(cardId, [row.user_id as string]);
  }

  const cards: BacklogCard[] = rawCards.map((card) => ({
    ...card,
    assignee_ids: assigneesByCard.get(card.id) ?? [],
  }));

  const [
    checklistResult,
    activityResult,
    clientsResult,
    guidesResult,
    usersResult,
    servicesResult,
  ] = await Promise.all([
    cardIds.length
      ? supabase
          .from("backlog_checklist_items")
          .select("*")
          .in("card_id", cardIds)
          .order("card_id")
          .order("position")
      : Promise.resolve({ data: [], error: null }),
    cardIds.length
      ? supabase
          .from("backlog_card_activity")
          .select("*")
          .in("card_id", cardIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    supabase.from("gallery_clients").select("id, name").order("name"),
    supabase.from("guides").select("id, title").order("title"),
    supabase.from("users").select("id, username").order("username"),
    supabase
      .from("services")
      .select("id, name, price_cents")
      .eq("active", true)
      .order("position"),
  ]);

  if (checklistResult.error) throw checklistResult.error;
  if (activityResult.error) throw activityResult.error;
  if (clientsResult.error) throw clientsResult.error;
  if (guidesResult.error) throw guidesResult.error;
  if (usersResult.error) throw usersResult.error;
  if (servicesResult.error) throw servicesResult.error;

  return {
    board,
    columns,
    cards,
    checklist: (checklistResult.data ?? []) as BacklogChecklistItem[],
    activity: (activityResult.data ?? []) as BacklogActivity[],
    clients: (clientsResult.data ?? []) as BacklogClientOption[],
    guides: (guidesResult.data ?? []) as BacklogGuideOption[],
    users: (usersResult.data ?? []) as BacklogUserOption[],
    services: (servicesResult.data ?? []) as ServiceOption[],
  };
}

// ---------------------------------------------------------------- colunas

export async function createBacklogColumn(fields: {
  name: string;
  color: string;
  board?: BacklogBoardKind;
}): Promise<BacklogColumn> {
  const supabase = getSupabaseServerClient();
  const board = normalizeBacklogBoard(fields.board);

  const { data: last, error: lastError } = await supabase
    .from("backlog_columns")
    .select("position")
    .eq("board", board)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastError) throw lastError;

  const { data, error } = await supabase
    .from("backlog_columns")
    .insert({
      name: fields.name.trim() || "Nova coluna",
      color: fields.color || "#6b7280",
      board,
      position: (last?.position ?? -1) + 1,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as BacklogColumn;
}

export async function updateBacklogColumn(
  id: string,
  fields: { name?: string; color?: string; billable?: boolean; paid?: boolean }
) {
  const supabase = getSupabaseServerClient();
  const patch: Record<string, string | boolean> = {};
  if (fields.name !== undefined) patch.name = fields.name.trim() || "Sem nome";
  if (fields.color !== undefined) patch.color = fields.color;
  if (fields.billable !== undefined) patch.billable = fields.billable;
  if (fields.paid !== undefined) patch.paid = fields.paid;
  if (Object.keys(patch).length === 0) return;

  const { error } = await supabase
    .from("backlog_columns")
    .update(patch)
    .eq("id", id);
  if (error) throw error;
}

/**
 * Reordena as colunas na ordem exata recebida. Reescreve o quadro inteiro
 * porque `position` é sequencial — mais simples de manter consistente do que
 * calcular deslocamentos individuais.
 */
export async function reorderBacklogColumns(orderedIds: string[]) {
  const supabase = getSupabaseServerClient();
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("backlog_columns").update({ position: index }).eq("id", id)
    )
  );
}

export async function deleteBacklogColumn(id: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("backlog_columns").delete().eq("id", id);
  if (error) throw error;
}

// ------------------------------------------------------------------ cards

export interface BacklogCardInput {
  title: string;
  description: string;
  format: BacklogFormat;
  client_id: string | null;
  guide_id: string | null;
  assignee_ids: string[];
  drive_url: string | null;
  cover_url: string | null;
  caption: string;
  post_date: string | null;
  post_time: string | null;
  sent_whatsapp: boolean;
  tags: string[];
  backup_location: string | null;
  contract_type: ContractType | null;
  custom_service: string | null;
  service_id: string | null;
  quantity: number;
  unit_price_cents: number | null;
  paid_at: string | null;
  payment_method: PaymentMethod | null;
}

export function readBacklogCardInput(formData: FormData): BacklogCardInput {
  return {
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    format: normalizeBacklogFormat(formData.get("format")),
    client_id: normalizeUuid(formData.get("client_id")),
    guide_id: normalizeUuid(formData.get("guide_id")),
    assignee_ids: formData
      .getAll("assignee_ids")
      .map((value) => normalizeUuid(value))
      .filter((value): value is string => Boolean(value)),
    drive_url: normalizeUrl(formData.get("drive_url")),
    cover_url: normalizeUrl(formData.get("cover_url")),
    caption: String(formData.get("caption") ?? "").trim(),
    post_date: normalizeDate(formData.get("post_date")),
    post_time: normalizeTime(formData.get("post_time")),
    sent_whatsapp: formData.get("sent_whatsapp") === "on",
    tags: parseBacklogTags(formData.get("tags")),
    backup_location: normalizeText(formData.get("backup_location")),
    contract_type: normalizeContractType(formData.get("contract_type")),
    custom_service: normalizeText(formData.get("custom_service")),
    service_id: normalizeUuid(formData.get("service_id")),
    quantity: normalizeQuantity(formData.get("quantity")),
    unit_price_cents: normalizePrice(formData.get("unit_price_cents")),
    paid_at: normalizeDate(formData.get("paid_at")),
    payment_method: normalizePaymentMethod(formData.get("payment_method")),
  };
}

export async function createBacklogCard(
  columnId: string,
  fields: Partial<BacklogCardInput> & { title: string }
): Promise<BacklogCard> {
  const supabase = getSupabaseServerClient();

  const { data: last, error: lastError } = await supabase
    .from("backlog_cards")
    .select("position")
    .eq("column_id", columnId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastError) throw lastError;

  const { data, error } = await supabase
    .from("backlog_cards")
    .insert({
      column_id: columnId,
      position: (last?.position ?? -1) + 1,
      title: fields.title.trim() || "Novo material",
      description: fields.description ?? "",
      format: fields.format ?? "reel",
      client_id: fields.client_id ?? null,
      guide_id: fields.guide_id ?? null,

      drive_url: fields.drive_url ?? null,
      cover_url: fields.cover_url ?? null,
      caption: fields.caption ?? "",
      post_date: fields.post_date ?? null,
      post_time: fields.post_time ?? null,
      sent_whatsapp: fields.sent_whatsapp ?? false,
      sent_whatsapp_at: fields.sent_whatsapp ? new Date().toISOString() : null,
      tags: fields.tags ?? [],
      backup_location: fields.backup_location ?? null,
      contract_type: fields.contract_type ?? null,
      custom_service: fields.custom_service ?? null,
      service_id: fields.service_id ?? null,
      quantity: fields.quantity ?? 1,
      unit_price_cents: fields.unit_price_cents ?? null,
      paid_at: fields.paid_at ?? null,
      payment_method: fields.payment_method ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;

  const assigneeIds = fields.assignee_ids ?? [];
  const card = { ...data, assignee_ids: assigneeIds } as unknown as BacklogCard;
  await setBacklogCardAssignees(card.id, assigneeIds);
  return card;
}

/**
 * Reescreve a lista de responsáveis do card. Apagar e inserir é mais simples
 * (e menos código) do que calcular a diferença, e a tabela é minúscula.
 */
export async function setBacklogCardAssignees(
  cardId: string,
  userIds: string[]
) {
  const supabase = getSupabaseServerClient();

  const { error: clearError } = await supabase
    .from("backlog_card_assignees")
    .delete()
    .eq("card_id", cardId);
  if (clearError) throw clearError;

  if (userIds.length === 0) return;

  const { error } = await supabase
    .from("backlog_card_assignees")
    .insert(userIds.map((userId) => ({ card_id: cardId, user_id: userId })));
  if (error) throw error;
}

/**
 * Título e responsável do card — usados pelas notificações, e pra saber se a
 * atribuição mudou antes de avisar alguém.
 */
export async function getBacklogCardBrief(
  id: string
): Promise<{ title: string; assigneeIds: string[]; board: BacklogBoardKind }> {
  const supabase = getSupabaseServerClient();
  const [{ data, error }, { data: assignees, error: assigneesError }] =
    await Promise.all([
      supabase
        .from("backlog_cards")
        .select("title, backlog_columns(board)")
        .eq("id", id)
        .single(),
      supabase
        .from("backlog_card_assignees")
        .select("user_id")
        .eq("card_id", id),
    ]);
  if (error) throw error;
  if (assigneesError) throw assigneesError;

  const column = data?.backlog_columns as
    | { board: string }
    | { board: string }[]
    | null;
  const board = Array.isArray(column) ? column[0]?.board : column?.board;

  return {
    title: (data?.title as string) ?? "",
    assigneeIds: (assignees ?? []).map((row) => row.user_id as string),
    board: normalizeBacklogBoard(board),
  };
}

/** Onde o card mora — o destino dos avisos da campainha. */
export function backlogBoardPath(board: BacklogBoardKind): string {
  return board === "entregas" ? "/admin/clientes/entregas" : "/admin/backlog";
}

export async function updateBacklogCard(id: string, fields: BacklogCardInput) {
  const supabase = getSupabaseServerClient();

  // `sent_whatsapp_at` é derivado do checkbox: carimba na hora que marca e
  // limpa quando desmarca, então a data nunca fica mentindo.
  const { data: current, error: currentError } = await supabase
    .from("backlog_cards")
    .select("sent_whatsapp, sent_whatsapp_at")
    .eq("id", id)
    .single();
  if (currentError) throw currentError;

  const sentAt = fields.sent_whatsapp
    ? current.sent_whatsapp
      ? current.sent_whatsapp_at
      : new Date().toISOString()
    : null;

  const { error } = await supabase
    .from("backlog_cards")
    .update({
      title: fields.title || "Novo material",
      description: fields.description,
      format: fields.format,
      client_id: fields.client_id,
      guide_id: fields.guide_id,

      drive_url: fields.drive_url,
      cover_url: fields.cover_url,
      caption: fields.caption,
      post_date: fields.post_date,
      post_time: fields.post_time,
      sent_whatsapp: fields.sent_whatsapp,
      sent_whatsapp_at: sentAt,
      tags: fields.tags,
      backup_location: fields.backup_location,
      contract_type: fields.contract_type,
      custom_service: fields.custom_service,
      service_id: fields.service_id,
      quantity: fields.quantity,
      unit_price_cents: fields.unit_price_cents,
      paid_at: fields.paid_at,
      payment_method: fields.payment_method,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;

  await setBacklogCardAssignees(id, fields.assignee_ids);
}

/** Agenda do calendário: data, hora e duração num toque só. */
export async function setBacklogCardSchedule(params: {
  id: string;
  postDate: string | null;
  postTime: string | null;
  durationMinutes: number | null;
}) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("backlog_cards")
    .update({
      post_date: normalizeDate(params.postDate),
      post_time: normalizeTime(params.postTime),
      duration_minutes: params.durationMinutes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.id);
  if (error) throw error;
}

export async function setBacklogCardPostDate(
  id: string,
  postDate: string | null
) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("backlog_cards")
    .update({
      post_date: normalizeDate(postDate),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

/**
 * Copia um card logo abaixo do original, na mesma coluna. Entrega recorrente
 * (o mensal de um cliente) muda pouco de um mês para o outro: o que se quer é
 * o mesmo card com outra data.
 *
 * Vêm junto os responsáveis e o checklist — este último desmarcado, porque a
 * cópia é trabalho a fazer, não trabalho feito. Não vêm a atividade, a
 * aprovação, o pagamento nem o evento do Google Agenda: são história do card
 * original.
 */
export async function duplicateBacklogCard(id: string): Promise<BacklogCard> {
  const supabase = getSupabaseServerClient();

  const [{ data: original, error }, { data: assignees }, { data: checklist }] =
    await Promise.all([
      supabase.from("backlog_cards").select("*").eq("id", id).single(),
      supabase
        .from("backlog_card_assignees")
        .select("user_id")
        .eq("card_id", id),
      supabase
        .from("backlog_checklist_items")
        .select("label, position")
        .eq("card_id", id)
        .order("position"),
    ]);
  if (error) throw error;

  const {
    id: _id,
    created_at: _createdAt,
    updated_at: _updatedAt,
    approved_at: _approvedAt,
    approved_by: _approvedBy,
    sent_whatsapp_at: _sentAt,
    google_event_id: _eventId,
    paid_at: _paidAt,
    payment_method: _paymentMethod,
    position: _position,
    ...rest
  } = original as Record<string, unknown>;

  const { data: last } = await supabase
    .from("backlog_cards")
    .select("position")
    .eq("column_id", rest.column_id as string)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: copy, error: copyError } = await supabase
    .from("backlog_cards")
    .insert({
      ...rest,
      title: `${rest.title as string} (cópia)`,
      sent_whatsapp: false,
      position: (last?.position ?? -1) + 1,
    })
    .select("*")
    .single();
  if (copyError) throw copyError;

  const copyId = copy.id as string;
  const assigneeIds = (assignees ?? []).map((row) => row.user_id as string);

  await Promise.all([
    setBacklogCardAssignees(copyId, assigneeIds),
    (checklist ?? []).length > 0
      ? supabase.from("backlog_checklist_items").insert(
          (checklist ?? []).map((item, index) => ({
            card_id: copyId,
            label: item.label as string,
            position: index,
            done: false,
          }))
        )
      : Promise.resolve(),
  ]);

  return { ...copy, assignee_ids: assigneeIds } as unknown as BacklogCard;
}

/**
 * Move um card para o fim de outra coluna. O arraste tem seu próprio caminho
 * (`moveBacklogCard`, que reordena as duas colunas); isto é para quando quem
 * decide o destino é o sistema, não o dedo.
 */
export async function setBacklogCardColumn(params: {
  cardId: string;
  columnId: string;
}) {
  const supabase = getSupabaseServerClient();

  const { data: last, error: lastError } = await supabase
    .from("backlog_cards")
    .select("position")
    .eq("column_id", params.columnId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastError) throw lastError;

  const { error } = await supabase
    .from("backlog_cards")
    .update({
      column_id: params.columnId,
      position: (last?.position ?? -1) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.cardId);
  if (error) throw error;
}

/** Resposta do diálogo de pagamento: carimba (ou limpa) data e forma. */
export async function setBacklogCardPayment(params: {
  cardId: string;
  paidAt: string | null;
  paymentMethod: PaymentMethod | null;
}) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("backlog_cards")
    .update({
      paid_at: normalizeDate(params.paidAt),
      payment_method: normalizePaymentMethod(params.paymentMethod),
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.cardId);
  if (error) throw error;
}

// -------------------------------------------------------------- atividade

export async function createBacklogActivity(params: {
  cardId: string;
  authorId: string | null;
  kind: BacklogActivity["kind"];
  message: string;
}) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("backlog_card_activity").insert({
    card_id: params.cardId,
    author_id: params.authorId,
    kind: params.kind,
    message: params.message,
  });
  if (error) throw error;
}

/**
 * Chegar na coluna de dinheiro recebido dispara a pergunta de pagamento, que
 * decide onde o card fica: em "Entregue" se já pagaram, na coluna de espera se
 * ainda não. Só existe onde há uma espera configurada — sem ela a pergunta não
 * teria resposta possível.
 */
function buildMovePrompt(params: {
  columns: BacklogColumn[];
  toColumnId: string;
  fromName: string;
  toName: string;
}): BacklogPrompt | null {
  const target = params.columns.find((column) => column.id === params.toColumnId);

  if (target?.board === "entregas" && target.billable && target.paid) {
    const waiting = params.columns.find(
      (column) =>
        column.board === "entregas" && column.billable && !column.paid
    );
    if (waiting) {
      return {
        kind: "payment",
        question: PAYMENT_QUESTION,
        waitingColumnId: waiting.id,
      };
    }
  }

  return shouldAskBackupQuestion(params.fromName, params.toName)
    ? { kind: "text", question: BACKUP_QUESTION }
    : null;
}

export interface MoveBacklogCardResult {
  prompt: BacklogPrompt | null;
  /** Nulo quando o card só mudou de posição dentro da mesma coluna. */
  moved: { title: string; assigneeIds: string[]; toName: string } | null;
}

/**
 * Persiste o resultado de um arraste: o card muda de coluna e as colunas
 * afetadas são renumeradas na ordem final que o dnd-kit já calculou no
 * cliente. Registra a movimentação na atividade e devolve a pergunta da
 * automação quando a transição casa com a regra.
 */
export async function moveBacklogCard(params: {
  cardId: string;
  toColumnId: string;
  orderedIdsByColumn: Record<string, string[]>;
  authorId: string | null;
}): Promise<MoveBacklogCardResult> {
  const supabase = getSupabaseServerClient();

  const [{ data: card }, { data: columns }] = await Promise.all([
    supabase
      .from("backlog_cards")
      .select("column_id, title")
      .eq("id", params.cardId)
      .single(),
    supabase.from("backlog_columns").select("id, name, board, billable, paid"),
  ]);

  const nameById = new Map(
    (columns ?? []).map((column) => [column.id as string, column.name as string])
  );
  const fromName = card ? nameById.get(card.column_id) ?? "" : "";
  const toName = nameById.get(params.toColumnId) ?? "";
  const changedColumn = Boolean(card) && card!.column_id !== params.toColumnId;

  const { error } = await supabase
    .from("backlog_cards")
    .update({
      column_id: params.toColumnId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.cardId);
  if (error) throw error;

  await Promise.all(
    Object.entries(params.orderedIdsByColumn).flatMap(([columnId, ids]) =>
      ids.map((id, index) =>
        supabase
          .from("backlog_cards")
          .update({ position: index, column_id: columnId })
          .eq("id", id)
      )
    )
  );

  if (!changedColumn) return { prompt: null, moved: null };

  await createBacklogActivity({
    cardId: params.cardId,
    authorId: params.authorId,
    kind: "move",
    message: `Moveu de "${fromName}" para "${toName}"`,
  });

  return {
    prompt: buildMovePrompt({
      columns: (columns ?? []) as BacklogColumn[],
      toColumnId: params.toColumnId,
      fromName,
      toName,
    }),
    moved: {
      title: (card!.title as string) ?? "",
      assigneeIds: (await getBacklogCardBrief(params.cardId)).assigneeIds,
      toName,
    },
  };
}

// -------------------------------------------------------------- checklist

export async function createBacklogChecklistItem(
  cardId: string,
  label: string
): Promise<BacklogChecklistItem> {
  const supabase = getSupabaseServerClient();

  const { data: last, error: lastError } = await supabase
    .from("backlog_checklist_items")
    .select("position")
    .eq("card_id", cardId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastError) throw lastError;

  const { data, error } = await supabase
    .from("backlog_checklist_items")
    .insert({
      card_id: cardId,
      position: (last?.position ?? -1) + 1,
      label: label.trim(),
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as BacklogChecklistItem;
}

export async function setBacklogChecklistItemDone(id: string, done: boolean) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("backlog_checklist_items")
    .update({ done })
    .eq("id", id);
  if (error) throw error;
}

export async function renameBacklogChecklistItem(id: string, label: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("backlog_checklist_items")
    .update({ label: label.trim() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteBacklogChecklistItem(id: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("backlog_checklist_items")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

/** Marca/desmarca a aprovação. Só registra — não move o card de coluna. */
export async function setBacklogCardApproved(params: {
  cardId: string;
  approved: boolean;
  userId: string | null;
}) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("backlog_cards")
    .update({
      approved_at: params.approved ? new Date().toISOString() : null,
      approved_by: params.approved ? params.userId : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.cardId);
  if (error) throw error;
}

export async function deleteBacklogCard(id: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("backlog_cards").delete().eq("id", id);
  if (error) throw error;
}

/** Quantos materiais têm data — o tanto que vai pra agenda de quem conecta. */
/**
 * Só alimenta o texto do painel de ajustes da agenda ("N materiais com data
 * sendo sincronizados"), mas era consultado em toda visita à tela. Meio
 * minuto de validade tira essa ida ao banco do caminho crítico sem que o
 * número fique visivelmente velho.
 */
const CARD_COUNT_TTL_MS = 30_000;
let cardCountCache: { value: number; expiresAt: number } | null = null;

export async function countBacklogCardsWithDate(): Promise<number> {
  if (cardCountCache && Date.now() < cardCountCache.expiresAt) {
    return cardCountCache.value;
  }
  const value = await requestBacklogCardsWithDate();
  cardCountCache = { value, expiresAt: Date.now() + CARD_COUNT_TTL_MS };
  return value;
}

async function requestBacklogCardsWithDate(): Promise<number> {
  const supabase = getSupabaseServerClient();
  const { count, error } = await supabase
    .from("backlog_cards")
    .select("id", { count: "exact", head: true })
    .not("post_date", "is", null);
  if (error) throw error;
  return count ?? 0;
}
