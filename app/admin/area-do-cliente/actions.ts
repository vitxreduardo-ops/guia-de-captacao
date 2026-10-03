"use server";

import { revalidatePath } from "next/cache";
import { updateBacklogColumn } from "@/lib/backlog";
import { assertClientAllowed, getCurrentClientScope } from "@/lib/clientAccess";
import { createIdea, deleteIdea, updateIdea } from "@/lib/editorialCalendar";
import { setGalleryClientArticle } from "@/lib/galleries";
import { requireAdmin, getCurrentSession } from "@/lib/session";
import { createClientInvite, deleteInvite } from "@/lib/invites";
import { createUser, deleteClientUser, getUserByUsername, updateClientUser } from "@/lib/users";

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

function checkCredentials(username: string, password: string) {
  if (!/^[a-z0-9._-]{3,}$/i.test(username)) {
    throw new Error("Usuário com 3 ou mais caracteres (letras, números, ponto, hífen).");
  }
  if (password.length < 6) throw new Error("A senha precisa de 6 ou mais caracteres.");
}

/** Cria um login de cliente já pronto (nome, função, usuário e senha definidos pela equipe). */
export async function createClientLoginAction(formData: FormData) {
  const clientId = String(formData.get("clientId"));
  await allowed(clientId);

  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  checkCredentials(username, password);
  if (await getUserByUsername(username)) throw new Error("Esse usuário já existe.");

  await createUser({
    username,
    email: "",
    password,
    role: "client",
    clientId,
    fullName: String(formData.get("fullName") ?? ""),
    portalLabel: String(formData.get("label") ?? ""),
  });
  revalidateArea();
}

export async function updateClientLoginAction(params: {
  id: string;
  clientId: string;
  fullName?: string;
  label?: string;
  password?: string;
}) {
  await allowed(params.clientId);
  if (params.password !== undefined && params.password.length < 6) {
    throw new Error("A senha precisa de 6 ou mais caracteres.");
  }
  await updateClientUser(params.id, params.clientId, {
    fullName: params.fullName,
    portalLabel: params.label,
    password: params.password,
  });
  revalidateArea();
}

export async function deleteClientLoginAction(id: string, clientId: string) {
  await allowed(clientId);
  await deleteClientUser(id, clientId);
  revalidateArea();
}

/** Gera o link de convite (14 dias, uso único). Devolve o token; a tela monta a URL. */
export async function createClientInviteAction(clientId: string, label: string) {
  await allowed(clientId);
  const session = await requireAdmin();
  const invite = await createClientInvite({ clientId, label, createdBy: session.userId });
  revalidateArea();
  return invite.token;
}

export async function revokeClientInviteAction(inviteId: string, clientId: string) {
  await allowed(clientId);
  await deleteInvite(inviteId);
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
