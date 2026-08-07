"use server";

import { revalidatePath } from "next/cache";
import {
  toggleCardItemSelected,
  togglePhotoItemSelected,
  toggleSceneRecorded,
  toggleVisualReferenceSelected,
} from "@/lib/guides";

export async function toggleSceneRecordedAction(formData: FormData) {
  const id = String(formData.get("id"));
  const slug = String(formData.get("slug"));
  const recorded = String(formData.get("recorded")) === "true";
  await toggleSceneRecorded(id, recorded);
  revalidatePath(`/guia/${slug}`);
}

export async function toggleVisualReferenceSelectedAction(
  slug: string,
  id: string,
  selected: boolean
) {
  await toggleVisualReferenceSelected(id, selected);
  revalidatePath(`/guia/${slug}`);
}

export async function togglePhotoItemSelectedAction(
  slug: string,
  id: string,
  selected: boolean
) {
  await togglePhotoItemSelected(id, selected);
  revalidatePath(`/guia/${slug}`);
}

export async function toggleCardItemSelectedAction(
  slug: string,
  id: string,
  selected: boolean
) {
  await toggleCardItemSelected(id, selected);
  revalidatePath(`/guia/${slug}`);
}
