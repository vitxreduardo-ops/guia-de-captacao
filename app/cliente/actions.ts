"use server";

import { revalidatePath } from "next/cache";
import {
  listCardAssigneeIds,
  requireClientUser,
  reviewPortalCard,
} from "@/lib/clientPortal";
import { createIdea } from "@/lib/editorialCalendar";
import { notifyUser } from "@/lib/notifications";

async function review(cardId: string, feedback: string | null) {
  const user = await requireClientUser();
  const card = await reviewPortalCard({
    cardId,
    userId: user.id,
    clientId: user.client_id,
    feedback,
  });
  if (!card) return; // card de outro cliente ou apagado: não faz nada

  const approved = feedback === null;
  const assignees = await listCardAssigneeIds(cardId);
  await Promise.all(
    assignees.map((userId) =>
      notifyUser({
        userId,
        actorId: user.id,
        kind: "card_approved",
        title: approved
          ? `Cliente aprovou: ${card.title}`
          : `Cliente pediu ajuste: ${card.title}`,
        body: feedback ?? "",
        link: "/admin/clientes/entregas",
        entityId: cardId,
      }).catch((err) => console.error("Falha ao avisar", err))
    )
  );
  revalidatePath("/cliente");
}

export async function approveCardAction(formData: FormData) {
  await review(String(formData.get("cardId")), null);
}

export async function requestChangesAction(formData: FormData) {
  const note = String(formData.get("feedback") ?? "").trim();
  if (!note) return;
  await review(String(formData.get("cardId")), note);
}

/** O cliente sugere uma ideia pro calendário; sempre visível, sempre no próprio cliente. */
export async function addIdeaAction(formData: FormData) {
  const user = await requireClientUser();
  const title = String(formData.get("title") ?? "").trim();
  const [year, month] = String(formData.get("when") ?? "").split("-").map(Number);
  if (!title || !year || month < 1 || month > 12) return;

  await createIdea({
    clientId: user.client_id,
    year,
    month,
    title,
    notes: String(formData.get("notes") ?? "").trim(),
    internal: false,
    createdBy: user.id,
  });
  revalidatePath("/cliente", "layout");
  revalidatePath("/admin/area-do-cliente", "layout");
}
