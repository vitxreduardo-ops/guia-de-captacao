"use server";

import { revalidatePath } from "next/cache";
import {
  createGalleryClient,
  readGalleryClientDetails,
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
