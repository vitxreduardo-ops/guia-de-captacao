"use server";

import { revalidatePath } from "next/cache";
import { assertClientAllowed, getCurrentClientScope } from "@/lib/clientAccess";
import { setGalleryClientArticle } from "@/lib/galleries";
import { createUser, getClientUser, updateUser } from "@/lib/users";

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
  revalidatePath("/admin/area-do-cliente/acessos");
}

export async function setGalleryArticleAction(clientId: string, article: "do" | "da") {
  assertClientAllowed(await getCurrentClientScope(), clientId);
  await setGalleryClientArticle(clientId, article === "da" ? "da" : "do");
  revalidatePath("/admin/area-do-cliente/acessos");
  revalidatePath("/cliente", "layout");
}
