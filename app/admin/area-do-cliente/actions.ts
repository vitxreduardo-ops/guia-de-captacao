"use server";

import { revalidatePath } from "next/cache";
import {
  createBacklogCard,
  deleteClientMaterial,
  isColumnClientVisible,
  updateBacklogColumn,
  updateClientMaterial,
} from "@/lib/backlog";
import { notifyClientUsers } from "@/lib/clientPush";
import { normalizeBacklogFormat } from "@/lib/backlogTypes";
import { assertClientAllowed, getCurrentClientScope } from "@/lib/clientAccess";
import { createIdea, deleteIdea, updateIdea } from "@/lib/editorialCalendar";
import { setGalleryClientArticle } from "@/lib/galleries";
import { requireAdmin, getCurrentSession, requireTeam } from "@/lib/session";
import { createClientInvite, deleteInvite } from "@/lib/invites";
import { createUser, deleteClientUser, getUserByUsername, updateClientUser } from "@/lib/users";

function readMaterial(formData: FormData) {
  const uuid = (v: FormDataEntryValue | null) => {
    const t = String(v ?? "").trim();
    return /^[0-9a-f-]{36}$/i.test(t) ? t : null;
  };
  const link = String(formData.get("drive_url") ?? "").trim();
  const date = String(formData.get("post_date") ?? "").trim();
  return {
    title: String(formData.get("title") ?? "").trim(),
    format: normalizeBacklogFormat(formData.get("format")),
    post_date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
    caption: String(formData.get("caption") ?? "").trim(),
    guide_id: uuid(formData.get("guide_id")),
    drive_url: /^https?:\/\//i.test(link) ? link : null,
    media_image_ids: formData.getAll("media_image_ids").map(uuid).filter((v): v is string => Boolean(v)),
    column_id: uuid(formData.get("column_id")),
  };
}

async function allowed(clientId: string) {
  assertClientAllowed(await getCurrentClientScope(), clientId);
}

function revalidateArea() {
  revalidatePath("/admin/area-do-cliente", "layout");
  revalidatePath("/cliente", "layout");
}

// ------------------------------------------------------------ calendário

export async function createIdeaAction(formData: FormData) {
  await requireTeam("area-do-cliente");
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
  if (formData.get("internal") !== "on") {
    await notifyClientUsers(clientId, {
      title: "Nova ideia no calendário",
      body: title,
      url: "/cliente/calendario",
    });
  }
  revalidateArea();
}

export async function updateIdeaAction(params: {
  id: string;
  clientId: string;
  title?: string;
  notes?: string;
  internal?: boolean;
}) {
  await requireTeam("area-do-cliente");
  await allowed(params.clientId);
  const { id, clientId, ...fields } = params;
  if (fields.title !== undefined && !fields.title.trim()) return;
  await updateIdea(id, clientId, fields);
  revalidateArea();
}

export async function deleteIdeaAction(id: string, clientId: string) {
  await requireTeam("area-do-cliente");
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
  await requireTeam("area-do-cliente");
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
  await requireTeam("area-do-cliente");
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
  await requireTeam("area-do-cliente");
  await allowed(clientId);
  await deleteClientUser(id, clientId);
  revalidateArea();
}

/** Gera o link de convite (14 dias, uso único). Devolve o token; a tela monta a URL. */
export async function createClientInviteAction(clientId: string, label: string) {
  await requireTeam("area-do-cliente");
  await allowed(clientId);
  const session = await requireAdmin();
  const invite = await createClientInvite({ clientId, label, createdBy: session.userId });
  revalidateArea();
  return invite.token;
}

export async function revokeClientInviteAction(inviteId: string, clientId: string) {
  await requireTeam("area-do-cliente");
  await allowed(clientId);
  await deleteInvite(inviteId);
  revalidateArea();
}

export async function setGalleryArticleAction(clientId: string, article: "do" | "da") {
  await requireTeam("area-do-cliente");
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

// ------------------------------------------------------------- materiais

/** Cria o material para aprovação e, se a coluna é visível ao cliente, avisa o portal. */
export async function createMaterialAction(formData: FormData) {
  await requireTeam("area-do-cliente");
  const clientId = String(formData.get("clientId"));
  await allowed(clientId);
  const { column_id, ...fields } = readMaterial(formData);
  if (!column_id || !fields.title) return;

  await createBacklogCard(column_id, { ...fields, client_id: clientId });
  if (await isColumnClientVisible(column_id)) {
    await notifyClientUsers(clientId, {
      title: "Novo material para aprovar",
      body: fields.title,
      url: "/cliente/materiais",
    });
  }
  revalidateArea();
  revalidatePath("/admin/clientes/entregas");
}

export async function updateMaterialAction(formData: FormData) {
  await requireTeam("area-do-cliente");
  const clientId = String(formData.get("clientId"));
  await allowed(clientId);
  const { column_id, ...fields } = readMaterial(formData);
  if (!column_id) return;
  await updateClientMaterial(String(formData.get("id")), clientId, { ...fields, column_id });
  revalidateArea();
  revalidatePath("/admin/clientes/entregas");
}

export async function deleteMaterialAction(id: string, clientId: string) {
  await requireTeam("area-do-cliente");
  await allowed(clientId);
  await deleteClientMaterial(id, clientId);
  revalidateArea();
  revalidatePath("/admin/clientes/entregas");
}
