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
  await updateGalleryClientDetails(id, readGalleryClientDetails(formData));
  await setGalleryClientStatus(
    id,
    formData.get("published") === "on" ? "published" : "draft"
  );
  revalidateClients();
  revalidatePath("/admin/clientes/entregas");
}

export async function setClientArchivedAction(formData: FormData) {
  await setGalleryClientArchived(
    String(formData.get("id")),
    formData.get("archived") === "true"
  );
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
  await deleteGalleryClient(String(formData.get("id")));
  revalidateClients();
  revalidatePath("/admin/clientes/entregas");
  revalidatePath("/admin/clientes/resumo");
}
