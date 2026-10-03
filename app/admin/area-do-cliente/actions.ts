"use server";

import { revalidatePath } from "next/cache";
import { updateBacklogColumn } from "@/lib/backlog";
import { assertClientAllowed, getCurrentClientScope } from "@/lib/clientAccess";
import { createIdea, deleteIdea, updateIdea } from "@/lib/editorialCalendar";
import { setGalleryClientArticle } from "@/lib/galleries";
import { requireAdmin, getCurrentSession } from "@/lib/session";
import { createUser, getClientUser, updateUser } from "@/lib/users";

async function allowed(clientId: string) {
  assertClientAllowed(await getCurrentClientScope(), clientId);
}

function revalidateArea() {
  revalidatePath("/admin/area-do-cliente", "layout");
  revalidatePath("/cliente", "layout");
}

// ------------------------------------------------------------ calendário

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
  revalidateArea();
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
  revalidateArea();
}

export async function deleteIdeaAction(id: string, clientId: string) {
  await allowed(clientId);
  await deleteIdea(id, clientId);
  revalidateArea();
}

// ---------------------------------------------------------------- acesso

/**
 * Cria (ou troca a senha de) o login do cliente no portal /cliente. Um
 * acesso por cliente: o usuário fica preso ao `client_id` e o proxy não deixa
 * ele sair do portal.
 */
export async function saveClientAccessAction(formData: FormData) {
  const clientId = String(formData.get("clientId"));
  await allowed(clientId);

  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (username.length < 3 || password.length < 6) {
    throw new Error("Usuário com 3+ letras e senha com 6+ caracteres.");
  }

  const existing = await getClientUser(clientId);
  if (existing) {
    await updateUser(existing.id, {
      username,
      email: existing.email,
      role: "client",
      password,
    });
  } else {
    await createUser({ username, email: "", password, role: "client", clientId });
  }
  revalidateArea();
}

export async function setGalleryArticleAction(clientId: string, article: "do" | "da") {
  await allowed(clientId);
  await setGalleryClientArticle(clientId, article === "da" ? "da" : "do");
  revalidateArea();
}

// ------------------------------------------------------ colunas visíveis

export async function setColumnClientVisibleAction(columnId: string, visible: boolean) {
  await requireAdmin();
  await updateBacklogColumn(columnId, { clientVisible: visible });
  revalidatePath("/admin/clientes/entregas");
  revalidateArea();
}
