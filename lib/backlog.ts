import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  BACKUP_QUESTION,
  normalizeBacklogFormat,
  parseBacklogTags,
  shouldAskBackupQuestion,
  type BacklogActivity,
  type BacklogBoard,
  type BacklogCard,
  type BacklogChecklistItem,
  type BacklogClientOption,
  type BacklogColumn,
  type BacklogFormat,
  type BacklogGuideOption,
  type BacklogUserOption,
} from "@/lib/backlogTypes";

export type {
  BacklogActivity,
  BacklogBoard,
  BacklogCard,
  BacklogChecklistItem,
  BacklogClientOption,
  BacklogColumn,
  BacklogFormat,
  BacklogGuideOption,
  BacklogUserOption,
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

// ---------------------------------------------------------------- leitura

export async function getBacklogBoard(): Promise<BacklogBoard> {
  const supabase = getSupabaseServerClient();

  const [
    columnsResult,
    cardsResult,
    checklistResult,
    activityResult,
    clientsResult,
    guidesResult,
    usersResult,
  ] = await Promise.all([
    supabase.from("backlog_columns").select("*").order("position"),
    supabase
      .from("backlog_cards")
      .select("*")
      .order("column_id")
      .order("position"),
    supabase
      .from("backlog_checklist_items")
      .select("*")
      .order("card_id")
      .order("position"),
    supabase
      .from("backlog_card_activity")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase.from("gallery_clients").select("id, name").order("name"),
    supabase.from("guides").select("id, title").order("title"),
    supabase.from("users").select("id, username").order("username"),
  ]);

  if (columnsResult.error) throw columnsResult.error;
  if (cardsResult.error) throw cardsResult.error;
  if (checklistResult.error) throw checklistResult.error;
  if (activityResult.error) throw activityResult.error;
  if (clientsResult.error) throw clientsResult.error;
  if (guidesResult.error) throw guidesResult.error;
  if (usersResult.error) throw usersResult.error;

  return {
    columns: (columnsResult.data ?? []) as BacklogColumn[],
    cards: (cardsResult.data ?? []) as BacklogCard[],
    checklist: (checklistResult.data ?? []) as BacklogChecklistItem[],
    activity: (activityResult.data ?? []) as BacklogActivity[],
    clients: (clientsResult.data ?? []) as BacklogClientOption[],
    guides: (guidesResult.data ?? []) as BacklogGuideOption[],
    users: (usersResult.data ?? []) as BacklogUserOption[],
  };
}

// ---------------------------------------------------------------- colunas

export async function createBacklogColumn(fields: {
  name: string;
  color: string;
}): Promise<BacklogColumn> {
  const supabase = getSupabaseServerClient();

  const { data: last, error: lastError } = await supabase
    .from("backlog_columns")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastError) throw lastError;

  const { data, error } = await supabase
    .from("backlog_columns")
    .insert({
      name: fields.name.trim() || "Nova coluna",
      color: fields.color || "#6b7280",
      position: (last?.position ?? -1) + 1,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as BacklogColumn;
}

export async function updateBacklogColumn(
  id: string,
  fields: { name?: string; color?: string }
) {
  const supabase = getSupabaseServerClient();
  const patch: Record<string, string> = {};
  if (fields.name !== undefined) patch.name = fields.name.trim() || "Sem nome";
  if (fields.color !== undefined) patch.color = fields.color;
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
  assignee_id: string | null;
  drive_url: string | null;
  cover_url: string | null;
  caption: string;
  post_date: string | null;
  post_time: string | null;
  sent_whatsapp: boolean;
  tags: string[];
}

export function readBacklogCardInput(formData: FormData): BacklogCardInput {
  return {
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    format: normalizeBacklogFormat(formData.get("format")),
    client_id: normalizeUuid(formData.get("client_id")),
    guide_id: normalizeUuid(formData.get("guide_id")),
    assignee_id: normalizeUuid(formData.get("assignee_id")),
    drive_url: normalizeUrl(formData.get("drive_url")),
    cover_url: normalizeUrl(formData.get("cover_url")),
    caption: String(formData.get("caption") ?? "").trim(),
    post_date: normalizeDate(formData.get("post_date")),
    post_time: normalizeTime(formData.get("post_time")),
    sent_whatsapp: formData.get("sent_whatsapp") === "on",
    tags: parseBacklogTags(formData.get("tags")),
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
      assignee_id: fields.assignee_id ?? null,
      drive_url: fields.drive_url ?? null,
      cover_url: fields.cover_url ?? null,
      caption: fields.caption ?? "",
      post_date: fields.post_date ?? null,
      post_time: fields.post_time ?? null,
      sent_whatsapp: fields.sent_whatsapp ?? false,
      sent_whatsapp_at: fields.sent_whatsapp ? new Date().toISOString() : null,
      tags: fields.tags ?? [],
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as BacklogCard;
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
      assignee_id: fields.assignee_id,
      drive_url: fields.drive_url,
      cover_url: fields.cover_url,
      caption: fields.caption,
      post_date: fields.post_date,
      post_time: fields.post_time,
      sent_whatsapp: fields.sent_whatsapp,
      sent_whatsapp_at: sentAt,
      tags: fields.tags,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
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
}): Promise<{ question: string | null }> {
  const supabase = getSupabaseServerClient();

  const [{ data: card }, { data: columns }] = await Promise.all([
    supabase
      .from("backlog_cards")
      .select("column_id, title")
      .eq("id", params.cardId)
      .single(),
    supabase.from("backlog_columns").select("id, name"),
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

  if (!changedColumn) return { question: null };

  await createBacklogActivity({
    cardId: params.cardId,
    authorId: params.authorId,
    kind: "move",
    message: `Moveu de "${fromName}" para "${toName}"`,
  });

  return {
    question: shouldAskBackupQuestion(fromName, toName) ? BACKUP_QUESTION : null,
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
