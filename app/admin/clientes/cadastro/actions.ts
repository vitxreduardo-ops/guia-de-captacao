"use server";

import { revalidatePath } from "next/cache";
import {
  createGalleryClient,
  deleteGalleryClient,
  readGalleryClientDetails,
  setGalleryClientArchived,
  setGalleryClientStatus,
  updateGalleryClientDetails,
} from "@/lib/galleries";
import { createUser, getClientUser, updateUser } from "@/lib/users";
import { assertClientAllowed, getCurrentClientScope } from "@/lib/clientAccess";

/**
 * O cadastro de cliente é o mesmo de Galerias (`gallery_clients`) — aqui só
 * ganha uma porta de entrada própria, pra não precisar passar por uma tela de
 * outra função só pra abrir um cliente novo.
 */
function revalidateClients() {
  revalidatePath("/admin/clientes/cadastro");
  revalidatePath("/admin/clientes/entregas");
  revalidatePath("/admin/clientes/faturamento");
  revalidatePath("/admin/galerias");
}

export async function createClientAction(formData: FormData) {
  await createGalleryClient(String(formData.get("name") ?? "").trim());
  revalidateClients();
}

export async function updateClientAction(formData: FormData) {
  const id = String(formData.get("id"));
  assertClientAllowed(await getCurrentClientScope(), id);

  await updateGalleryClientDetails(id, readGalleryClientDetails(formData));
  await setGalleryClientStatus(
    id,
    formData.get("published") === "on" ? "published" : "draft"
  );
  revalidateClients();
  revalidatePath("/admin/clientes/entregas");
}

export async function setClientArchivedAction(formData: FormData) {
  const id = String(formData.get("id"));
  assertClientAllowed(await getCurrentClientScope(), id);

  await setGalleryClientArchived(id, formData.get("archived") === "true");
  revalidateClients();
  revalidatePath("/admin/clientes/entregas");
  revalidatePath("/admin/clientes/resumo");
}

/**
 * Excluir leva junto entregas, notas fechadas e a galeria — o banco apaga em
 * cascata. Quem só quer o cliente fora da frente deve arquivar; a tela diz
 * isso antes, e aqui não há volta.
 */
export async function deleteClientAction(formData: FormData) {
  const id = String(formData.get("id"));
  assertClientAllowed(await getCurrentClientScope(), id);

  await deleteGalleryClient(id);
  revalidateClients();
  revalidatePath("/admin/clientes/entregas");
  revalidatePath("/admin/clientes/resumo");
}

/**
 * Cria (ou troca a senha de) o login do cliente no portal /cliente. Um
 * acesso por cliente: o usuário fica preso ao `client_id` e o proxy não deixa
 * ele sair do portal.
 */
export async function saveClientAccessAction(formData: FormData) {
  const clientId = String(formData.get("clientId"));
  assertClientAllowed(await getCurrentClientScope(), clientId);

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
  revalidatePath("/admin/clientes/cadastro");
}
