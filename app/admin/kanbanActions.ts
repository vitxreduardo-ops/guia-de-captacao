"use server";

import { revalidatePath } from "next/cache";
import { getCurrentSession } from "@/lib/session";
import {
  BACKUP_QUESTION,
  PAYMENT_METHOD_LABELS,
  PAYMENT_QUESTION,
  formatBacklogDateShort,
  normalizeBacklogBoard,
  normalizePaymentMethod,
  type BacklogPrompt,
} from "@/lib/backlogTypes";
import {
  backlogBoardPath,
  createBacklogActivity,
  createBacklogCard,
  createBacklogChecklistItem,
  createBacklogColumn,
  deleteBacklogCard,
  deleteBacklogChecklistItem,
  deleteBacklogColumn,
  duplicateBacklogCard,
  getBacklogCardBrief,
  renameBacklogChecklistItem,
  setBacklogChecklistItemDone,
  moveBacklogCard,
  readBacklogCardInput,
  reorderBacklogColumns,
  setBacklogCardApproved,
  setBacklogCardColumn,
  setBacklogCardPayment,
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

const KANBAN_PATHS = [
  "/admin/backlog",
  "/admin/backlog/calendario",
  "/admin/clientes/entregas",
  "/admin/clientes/faturamento",
  "/admin/clientes/resumo",
];

function revalidateBacklog() {
  for (const path of KANBAN_PATHS) revalidatePath(path);
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

/** Um card aceita vários responsáveis; todos recebem o mesmo aviso. */
async function notifyAssignees(params: {
  userIds: string[];
  actorId: string | null;
  kind?: "card_assigned" | "card_moved" | "card_approved";
  title: string;
  body: string;
  link: string;
  entityId: string;
}) {
  await Promise.all(
    params.userIds.map((userId) =>
      notifyUser({
        userId,
        actorId: params.actorId,
        kind: params.kind ?? "card_assigned",
        title: params.title,
        body: params.body,
        link: params.link,
        entityId: params.entityId,
      })
    )
  );
}

// ---------------------------------------------------------------- colunas

export async function createBacklogColumnAction(formData: FormData) {
  await createBacklogColumn({
    name: String(formData.get("name") ?? ""),
    color: String(formData.get("color") ?? "#6b7280"),
    board: normalizeBacklogBoard(formData.get("board")),
  });
  revalidateBacklog();
}

export async function updateBacklogColumnAction(formData: FormData) {
  await updateBacklogColumn(String(formData.get("id")), {
    name: String(formData.get("name") ?? ""),
    color: String(formData.get("color") ?? "#6b7280"),
    // O checkbox só existe no quadro de entregas; nos outros o campo some do
    // FormData e a flag fica como está.
    billable: formData.has("billable_present")
      ? formData.get("billable") === "on"
      : undefined,
    paid: formData.has("billable_present")
      ? formData.get("paid") === "on"
      : undefined,
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
  const { board } = await getBacklogCardBrief(card.id);
  await notifyAssignees({
    userIds: input.assignee_ids,
    actorId: session?.userId ?? null,
    title: "Novo material atribuído a você",
    body: card.title,
    link: backlogBoardPath(board),
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
  const { assigneeIds: previousAssigneeIds, board } = await getBacklogCardBrief(id);
  await updateBacklogCard(id, input);
  // Só quem entrou agora recebe aviso: quem já era responsável não deve ver a
  // mesma novidade de novo a cada vez que alguém salva o card.
  const novos = input.assignee_ids.filter(
    (userId) => !previousAssigneeIds.includes(userId)
  );
  if (novos.length > 0) {
    const session = await getCurrentSession();
    await notifyAssignees({
      userIds: novos,
      actorId: session?.userId ?? null,
      title: "Material atribuído a você",
      body: input.title || "Novo material",
      link: backlogBoardPath(board),
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
}): Promise<{ prompt: BacklogPrompt | null }> {
  const session = await getCurrentSession();
  const result = await moveBacklogCard({
    ...params,
    authorId: session?.userId ?? null,
  });
  if (result.moved) {
    const { board } = await getBacklogCardBrief(params.cardId);
    await notifyAssignees({
      userIds: result.moved.assigneeIds,
      actorId: session?.userId ?? null,
      kind: "card_moved",
      title: `Material movido para "${result.moved.toName}"`,
      body: result.moved.title,
      link: backlogBoardPath(board),
      entityId: params.cardId,
    });
  }
  revalidateBacklog();
  return { prompt: result.prompt };
}

/**
 * Resposta da pergunta de pagamento. Pago: carimba data e forma e o card fica
 * onde foi solto. Não pago: limpa o carimbo e devolve o card para a coluna de
 * espera — quem entrega antes de receber não pode ficar contando como recebido.
 */
export async function answerPaymentQuestionAction(params: {
  cardId: string;
  paid: boolean;
  waitingColumnId: string;
  paidAt: string | null;
  paymentMethod: string | null;
}) {
  const session = await getCurrentSession();
  const method = normalizePaymentMethod(params.paymentMethod);

  await setBacklogCardPayment({
    cardId: params.cardId,
    paidAt: params.paid ? params.paidAt : null,
    paymentMethod: params.paid ? method : null,
  });

  if (!params.paid) {
    await setBacklogCardColumn({
      cardId: params.cardId,
      columnId: params.waitingColumnId,
    });
  }

  await createBacklogActivity({
    cardId: params.cardId,
    authorId: session?.userId ?? null,
    kind: "answer",
    message: params.paid
      ? `${PAYMENT_QUESTION} Sim${
          method ? ` — ${PAYMENT_METHOD_LABELS[method]}` : ""
        }${params.paidAt ? `, em ${formatBacklogDateShort(params.paidAt)}` : ""}`
      : `${PAYMENT_QUESTION} Ainda não`,
  });

  revalidateBacklog();
}

export async function duplicateBacklogCardAction(cardId: string) {
  const copy = await duplicateBacklogCard(cardId);
  await syncCalendar(copy.id);
  revalidateBacklog();
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
  await notifyAssignees({
    userIds: brief.assigneeIds,
    actorId: session?.userId ?? null,
    kind: "card_approved",
    title: approved ? "Material aprovado" : "Aprovação removida",
    body: brief.title,
    link: backlogBoardPath(brief.board),
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
