"use server";

import { revalidatePath } from "next/cache";
import { createIdea, deleteIdea, updateIdea } from "@/lib/editorialCalendar";
import { getCurrentSession } from "@/lib/session";
import { assertClientAllowed, getCurrentClientScope } from "@/lib/clientAccess";

async function allowed(clientId: string) {
  assertClientAllowed(await getCurrentClientScope(), clientId);
}

function revalidateCalendar() {
  revalidatePath("/admin/area-do-cliente/calendario");
  revalidatePath("/cliente", "layout");
}

export async function createIdeaAction(formData: FormData) {
  const clientId = String(formData.get("clientId"));
  await allowed(clientId);

  const title = String(formData.get("title") ?? "").trim();
  // "2026-11": o chip de mês manda ano e mês juntos.
  const [year, month] = String(formData.get("when") ?? "").split("-").map(Number);
  if (!title || !year || month < 1 || month > 12) return;

  await createIdea({
    clientId,
    year,
    month,
    title,
    notes: String(formData.get("notes") ?? "").trim(),
    internal: formData.get("internal") === "on",
    createdBy: (await getCurrentSession())?.userId ?? null,
  });
  revalidateCalendar();
}

export async function updateIdeaAction(params: {
  id: string;
  clientId: string;
  title?: string;
  notes?: string;
  internal?: boolean;
}) {
  await allowed(params.clientId);
  const { id, clientId, ...fields } = params;
  if (fields.title !== undefined && !fields.title.trim()) return;
  await updateIdea(id, clientId, fields);
  revalidateCalendar();
}

export async function deleteIdeaAction(id: string, clientId: string) {
  await allowed(clientId);
  await deleteIdea(id, clientId);
  revalidateCalendar();
}
