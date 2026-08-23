"use server";

import { revalidatePath } from "next/cache";
import {
  createLibraryLink,
  deleteLibraryLink,
  updateLibraryLink,
  type LibraryLinkFields,
} from "@/lib/library";

/** Tags chegam do formulário como texto separado por vírgula, igual aos guias. */
function parseTags(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function readFields(formData: FormData): LibraryLinkFields | null {
  const title = String(formData.get("title") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  if (!title || !url) return null;

  return {
    title,
    url,
    description: String(formData.get("description") ?? "").trim(),
    tags: parseTags(formData.get("tags")),
    icon_url: String(formData.get("icon_url") ?? "").trim(),
  };
}

export async function createLibraryLinkAction(formData: FormData) {
  const fields = readFields(formData);
  if (!fields) return;

  await createLibraryLink(fields);
  revalidatePath("/admin/biblioteca");
}

export async function updateLibraryLinkAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const fields = readFields(formData);
  if (!id || !fields) return;

  await updateLibraryLink(id, fields);
  revalidatePath("/admin/biblioteca");
}

export async function deleteLibraryLinkAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteLibraryLink(id);
  revalidatePath("/admin/biblioteca");
}
