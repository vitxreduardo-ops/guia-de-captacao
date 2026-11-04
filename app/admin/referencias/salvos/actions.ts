"use server";

import { revalidatePath } from "next/cache";
import { listSavedInstagram, updateSavedPost } from "@/lib/salvosInstagram";
import { canonicalizeTags } from "@/lib/tags";
import { requireTeam } from "@/lib/session";

export async function updateSavedPostAction(formData: FormData) {
  await requireTeam("referencias");
  const collectionKey = String(formData.get("collection_key") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!collectionKey || !id) return;

  const typed = String(formData.get("tags") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const { posts } = await listSavedInstagram();

  await updateSavedPost(collectionKey, id, {
    label: String(formData.get("label") ?? "").trim(),
    creator: String(formData.get("creator") ?? "")
      .trim()
      .replace(/^@+/, "")
      .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
      .split(/[/?]/)[0],
    note: String(formData.get("note") ?? "").trim(),
    client: String(formData.get("client") ?? "").trim(),
    tags: canonicalizeTags(typed, posts.flatMap((p) => p.tags)),
  });
  revalidatePath("/admin/referencias/salvos");
}
