"use server";

import { revalidatePath } from "next/cache";
import {
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
}) {
  await moveBacklogCard(params);
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
