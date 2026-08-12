"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createGalleryClient,
  deleteGalleryClient,
} from "@/lib/galleries";
import { disconnectGoogleAccount } from "@/lib/googleDrive";

export async function createGalleryClientAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const client = await createGalleryClient(name);
  revalidatePath("/admin/galerias");
  redirect(`/admin/galerias/${client.id}`);
}

export async function deleteGalleryClientAction(formData: FormData) {
  const id = String(formData.get("id"));
  await deleteGalleryClient(id);
  revalidatePath("/admin/galerias");
}

export async function disconnectGoogleAccountAction() {
  await disconnectGoogleAccount();
  revalidatePath("/admin/galerias");
}
