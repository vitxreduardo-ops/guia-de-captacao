"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, createSessionCookieValue } from "@/lib/auth";
import { getUserByUsername, verifyPassword } from "@/lib/users";

export async function login(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");
  const secret = process.env.ADMIN_PASSWORD;

  if (!secret) {
    redirect(`/admin/login?error=config&next=${encodeURIComponent(next)}`);
  }

  const user = await getUserByUsername(username);
  const valid = user ? await verifyPassword(password, user.password_hash) : false;

  if (!user || !valid) {
    redirect(`/admin/login?error=1&next=${encodeURIComponent(next)}`);
  }

  const cookieValue = await createSessionCookieValue(
    { userId: user.id, role: user.role },
    secret
  );
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect(next || "/admin");
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  redirect("/admin/login");
}
