"use server";

import { revalidatePath } from "next/cache";
import { deleteBriefing } from "@/lib/briefings";
import {
  createBriefingLink,
  deleteBriefingLink,
} from "@/lib/briefingLinks";

export async function deleteBriefingAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteBriefing(id);
  revalidatePath("/admin/briefings");
}

export async function createBriefingLinkAction(formData: FormData) {
  await createBriefingLink({
    client_name: String(formData.get("client_name") ?? "").trim(),
    contact: String(formData.get("contact") ?? "").trim(),
    servico: String(formData.get("servico") ?? "").trim(),
    note: String(formData.get("note") ?? "").trim(),
  });
  revalidatePath("/admin/briefings");
}

export async function deleteBriefingLinkAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteBriefingLink(id);
  revalidatePath("/admin/briefings");
}
