"use server";

import { revalidatePath } from "next/cache";
import {
  createRadarCompany,
  deleteRadarCompany,
  updateRadarCompany,
} from "@/lib/prospects";

/**
 * O Radar deixou de ser uma aba da Prospecção: é um banco de empresas da
 * cidade, que serve tanto pra prospectar um dia quanto pra estudar o
 * concorrente de um cliente. As duas coisas são consulta, não funil.
 */
export async function createRadarAction(formData: FormData) {
  if (!String(formData.get("company") ?? "").trim()) return;
  await createRadarCompany(formData);
  revalidatePath("/admin/radar");
}

export async function updateRadarAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await updateRadarCompany(id, formData);
  revalidatePath("/admin/radar");
}

export async function deleteRadarAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteRadarCompany(id);
  revalidatePath("/admin/radar");
}
