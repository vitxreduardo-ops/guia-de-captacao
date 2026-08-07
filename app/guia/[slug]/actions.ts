"use server";

import { revalidatePath } from "next/cache";
import { toggleSceneRecorded } from "@/lib/guides";

export async function toggleSceneRecordedAction(formData: FormData) {
  const id = String(formData.get("id"));
  const slug = String(formData.get("slug"));
  const recorded = String(formData.get("recorded")) === "true";
  await toggleSceneRecorded(id, recorded);
  revalidatePath(`/guia/${slug}`);
}
