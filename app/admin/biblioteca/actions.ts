"use server";

import { revalidatePath } from "next/cache";
import {
  createLibraryLink,
  deleteLibraryLink,
  listLibraryTags,
  updateLibraryLink,
  type LibraryLinkFields,
} from "@/lib/library";
import { canonicalizeTags } from "@/lib/tags";

/** Tags chegam do formulário como texto separado por vírgula, igual aos guias. */
function parseTags(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

async function readFields(
  formData: FormData
): Promise<LibraryLinkFields | null> {
  const title = String(formData.get("title") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  if (!title || !url) return null;

  // Casar contra as tags já cadastradas evita que "referencia" digitada hoje
  // vire uma segunda tag ao lado da "referência" que já existe.
  const tags = canonicalizeTags(
    parseTags(formData.get("tags")),
    await listLibraryTags()
  );

  return {
    title,
    url,
    description: String(formData.get("description") ?? "").trim(),
    tags,
    icon_url: String(formData.get("icon_url") ?? "").trim(),
  };
}

export async function createLibraryLinkAction(formData: FormData) {
  const fields = await readFields(formData);
  if (!fields) return;

  await createLibraryLink(fields);
  revalidatePath("/admin/biblioteca");
}

export async function updateLibraryLinkAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const fields = await readFields(formData);
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
