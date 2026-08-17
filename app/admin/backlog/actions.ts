"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/session";
import { BACKUP_QUESTION } from "@/lib/backlogTypes";
import {
  createBacklogActivity,
  createBacklogCard,
  createBacklogChecklistItem,
  createBacklogColumn,
  deleteBacklogCard,
  deleteBacklogChecklistItem,
  deleteBacklogColumn,
  renameBacklogChecklistItem,
  setBacklogChecklistItemDone,
  moveBacklogCard,
  readBacklogCardInput,
  reorderBacklogColumns,
  setBacklogCardApproved,
  setBacklogCardPostDate,
  updateBacklogCard,
  updateBacklogColumn,
} from "@/lib/backlog";

const BACKLOG_PATHS = ["/admin/backlog", "/admin/backlog/calendario"];

function revalidateBacklog() {
  for (const path of BACKLOG_PATHS) revalidatePath(path);
}

// ---------------------------------------------------------------- colunas

export async function createBacklogColumnAction(formData: FormData) {
  await createBacklogColumn({
    name: String(formData.get("name") ?? ""),
    color: String(formData.get("color") ?? "#6b7280"),
  });
  revalidateBacklog();
}

export async function updateBacklogColumnAction(formData: FormData) {
  await updateBacklogColumn(String(formData.get("id")), {
    name: String(formData.get("name") ?? ""),
    color: String(formData.get("color") ?? "#6b7280"),
  });
  revalidateBacklog();
}

export async function reorderBacklogColumnsAction(orderedIds: string[]) {
  await reorderBacklogColumns(orderedIds);
  revalidateBacklog();
}

export async function deleteBacklogColumnAction(formData: FormData) {
  await deleteBacklogColumn(String(formData.get("id")));
  revalidateBacklog();
}

// ------------------------------------------------------------------ cards

export async function createBacklogCardAction(formData: FormData) {
  const columnId = String(formData.get("column_id"));
  const input = readBacklogCardInput(formData);
  await createBacklogCard(columnId, input);
  revalidateBacklog();
}

export async function updateBacklogCardAction(formData: FormData) {
  const id = String(formData.get("id"));
  await updateBacklogCard(id, readBacklogCardInput(formData));
  revalidateBacklog();
}

export async function moveBacklogCardAction(params: {
  cardId: string;
  toColumnId: string;
  orderedIdsByColumn: Record<string, string[]>;
}): Promise<{ question: string | null }> {
  const session = await getCurrentSession();
  const result = await moveBacklogCard({
    ...params,
    authorId: session?.userId ?? null,
  });
  revalidateBacklog();
  return result;
}

export async function setBacklogCardApprovedAction(
  cardId: string,
  approved: boolean
) {
  const session = await getCurrentSession();
  await setBacklogCardApproved({
    cardId,
    approved,
    userId: session?.userId ?? null,
  });
  await createBacklogActivity({
    cardId,
    authorId: session?.userId ?? null,
    kind: "note",
    message: approved ? "Marcou como aprovado" : "Desmarcou a aprovação",
  });
  revalidateBacklog();
}

// ------------------------------------------------------------- atividade

/** Resposta da automação — vira uma linha na atividade do material. */
export async function answerBackupQuestionAction(
  cardId: string,
  answer: string
) {
  const value = answer.trim();
  if (!value) return;
  const session = await getCurrentSession();
  await createBacklogActivity({
    cardId,
    authorId: session?.userId ?? null,
    kind: "answer",
    message: `${BACKUP_QUESTION} ${value}`,
  });
  revalidateBacklog();
}

export async function createBacklogNoteAction(cardId: string, message: string) {
  const value = message.trim();
  if (!value) return;
  const session = await getCurrentSession();
  await createBacklogActivity({
    cardId,
    authorId: session?.userId ?? null,
    kind: "note",
    message: value,
  });
  revalidateBacklog();
}

export async function setBacklogCardPostDateAction(
  id: string,
  postDate: string | null
) {
  await setBacklogCardPostDate(id, postDate);
  revalidateBacklog();
}

export async function deleteBacklogCardAction(formData: FormData) {
  await deleteBacklogCard(String(formData.get("id")));
  revalidateBacklog();
}

// -------------------------------------------------------------- checklist

export async function createBacklogChecklistItemAction(
  cardId: string,
  label: string
) {
  if (!label.trim()) return;
  await createBacklogChecklistItem(cardId, label);
  revalidateBacklog();
}

export async function setBacklogChecklistItemDoneAction(
  id: string,
  done: boolean
) {
  await setBacklogChecklistItemDone(id, done);
  revalidateBacklog();
}

export async function renameBacklogChecklistItemAction(
  id: string,
  label: string
) {
  if (!label.trim()) return;
  await renameBacklogChecklistItem(id, label);
  revalidateBacklog();
}

export async function deleteBacklogChecklistItemAction(id: string) {
  await deleteBacklogChecklistItem(id);
  revalidateBacklog();
}
