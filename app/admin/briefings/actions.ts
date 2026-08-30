"use server";

import { revalidatePath } from "next/cache";
import { deleteBriefing } from "@/lib/briefings";

export async function deleteBriefingAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteBriefing(id);
  revalidatePath("/admin/briefings");
}
