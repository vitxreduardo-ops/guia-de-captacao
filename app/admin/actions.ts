"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createGuide, deleteGuide } from "@/lib/guides";

export async function createGuideAction(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const guide = await createGuide(title || "Novo guia");
  revalidatePath("/admin");
  redirect(`/admin/guias/${guide.id}`);
}

export async function deleteGuideAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteGuide(id);
  revalidatePath("/admin");
}
