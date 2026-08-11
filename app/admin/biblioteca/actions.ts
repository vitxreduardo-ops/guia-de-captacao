"use server";

import { revalidatePath } from "next/cache";
import { createLibraryLink, deleteLibraryLink } from "@/lib/library";

export async function createLibraryLinkAction(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!title || !url) return;

  await createLibraryLink({ title, url, description });
  revalidatePath("/admin/biblioteca");
}

export async function deleteLibraryLinkAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteLibraryLink(id);
  revalidatePath("/admin/biblioteca");
}
