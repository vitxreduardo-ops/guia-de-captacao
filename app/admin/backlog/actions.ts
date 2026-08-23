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
  getBacklogCardBrief,
  renameBacklogChecklistItem,
  setBacklogChecklistItemDone,
  moveBacklogCard,
  readBacklogCardInput,
  reorderBacklogColumns,
  setBacklogCardApproved,
  setBacklogCardPostDate,
  setBacklogCardSchedule,
  updateBacklogCard,
  updateBacklogColumn,
} from "@/lib/backlog";
import { notifyUser } from "@/lib/notifications";
import {
  removeBacklogCardFromCalendar,
  syncBacklogCardToCalendar,
} from "@/lib/googleCalendar";

const BACKLOG_PATHS = ["/admin/backlog", "/admin/backlog/calendario"];

function revalidateBacklog() {
  for (const path of BACKLOG_PATHS) revalidatePath(path);
}

/**
 * Espelha o card no Google Agenda sem deixar a integração derrubar a ação:
 * o Google fora do ar (ou nenhuma conta conectada) não pode impedir alguém
 * de arrastar um card. O card no banco continua sendo a fonte da verdade, e
 * o "Sincronizar tudo" da tela do calendário conserta o que ficou pra trás.
 */
async function syncCalendar(cardId: string) {
  try {
    await syncBacklogCardToCalendar(cardId);
  } catch (error) {
    console.error("Erro ao sincronizar card com o Google Agenda", error);
  }
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
  const session = await getCurrentSession();
  const card = await createBacklogCard(columnId, input);
  await notifyUser({
    userId: input.assignee_id,
    actorId: session?.userId ?? null,
    kind: "card_assigned",
    title: "Novo material atribuído a você",
    body: card.title,
    link: "/admin/backlog",
    entityId: card.id,
  });
  await syncCalendar(card.id);
  revalidateBacklog();
}

export async function updateBacklogCardAction(formData: FormData) {
  const id = String(formData.get("id"));
  const input = readBacklogCardInput(formData);
  // Só avisa quando o responsável muda — salvar o card de novo com a mesma
  // pessoa não deve reaparecer como novidade na campainha.
  const { assigneeId: previousAssigneeId } = await getBacklogCardBrief(id);
  await updateBacklogCard(id, input);
  if (input.assignee_id !== previousAssigneeId) {
    const session = await getCurrentSession();
    await notifyUser({
      userId: input.assignee_id,
      actorId: session?.userId ?? null,
      kind: "card_assigned",
      title: "Material atribuído a você",
      body: input.title || "Novo material",
      link: "/admin/backlog",
      entityId: id,
    });
  }
  await syncCalendar(id);
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
  if (result.moved) {
    await notifyUser({
      userId: result.moved.assigneeId,
      actorId: session?.userId ?? null,
      kind: "card_moved",
      title: `Material movido para "${result.moved.toName}"`,
      body: result.moved.title,
      link: "/admin/backlog",
      entityId: params.cardId,
    });
  }
  revalidateBacklog();
  return { question: result.question };
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
  const brief = await getBacklogCardBrief(cardId);
  await notifyUser({
    userId: brief.assigneeId,
    actorId: session?.userId ?? null,
    kind: "card_approved",
    title: approved ? "Material aprovado" : "Aprovação removida",
    body: brief.title,
    link: "/admin/backlog",
    entityId: cardId,
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
  await syncCalendar(id);
  revalidateBacklog();
}

/** Usada pelo arraste e pelo resize nas vistas de hora do calendário. */
export async function setBacklogCardScheduleAction(params: {
  id: string;
  postDate: string | null;
  postTime: string | null;
  durationMinutes: number | null;
}) {
  await setBacklogCardSchedule(params);
  await syncCalendar(params.id);
  revalidateBacklog();
}

export async function deleteBacklogCardAction(formData: FormData) {
  const id = String(formData.get("id"));
  // Antes de apagar a linha: depois dela o id do evento some e o evento
  // ficaria pra sempre no Google.
  try {
    await removeBacklogCardFromCalendar(id);
  } catch (error) {
    console.error("Erro ao apagar evento do Google Agenda", error);
  }
  await deleteBacklogCard(id);
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
