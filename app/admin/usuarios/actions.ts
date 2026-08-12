"use server";

import { revalidatePath } from "next/cache";
import { createUser, deleteUser, updateUser } from "@/lib/users";
import { requireAdmin } from "@/lib/session";

export async function createUserAction(formData: FormData) {
  await requireAdmin();

  const username = String(formData.get("username") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "member") === "admin" ? "admin" : "member";

  if (!username || !password) return;

  await createUser({ username, email, password, role });
  revalidatePath("/admin/usuarios");
}

export async function updateUserAction(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const username = String(formData.get("username") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "member") === "admin" ? "admin" : "member";

  if (!id || !username) return;

  await updateUser(id, { username, email, role, password: password || undefined });
  revalidatePath("/admin/usuarios");
}

export async function deleteUserAction(formData: FormData) {
  const session = await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id || id === session.userId) return;

  await deleteUser(id);
  revalidatePath("/admin/usuarios");
}
