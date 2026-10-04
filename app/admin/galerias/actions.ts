"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createGalleryClient,
  deleteGalleryClient,
} from "@/lib/galleries";
import { disconnectGoogleAccount } from "@/lib/googleDrive";
import { assertClientAllowed, getCurrentClientScope } from "@/lib/clientAccess";
import { requireTeam } from "@/lib/session";

export async function createGalleryClientAction(formData: FormData) {
  await requireTeam("galerias");
  const name = String(formData.get("name") ?? "").trim();
  const client = await createGalleryClient(name);
  revalidatePath("/admin/galerias");
  redirect(`/admin/galerias/${client.id}`);
}

export async function deleteGalleryClientAction(formData: FormData) {
  await requireTeam("galerias");
  const id = String(formData.get("id"));
  assertClientAllowed(await getCurrentClientScope(), id);

  await deleteGalleryClient(id);
  revalidatePath("/admin/galerias");
}

export async function disconnectGoogleAccountAction() {
  await requireTeam("galerias");
  await disconnectGoogleAccount();
  revalidatePath("/admin/galerias");
}
