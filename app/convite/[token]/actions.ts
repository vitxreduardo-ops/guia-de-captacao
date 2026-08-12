"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, createSessionCookieValue } from "@/lib/auth";
import { createUser, getUserByUsername } from "@/lib/users";
import { getPendingInviteByToken, markInviteUsed } from "@/lib/invites";

export async function acceptInviteAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const username = String(formData.get("username") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("password_confirm") ?? "");

  function fail(error: string): never {
    redirect(`/convite/${token}?error=${encodeURIComponent(error)}`);
  }

  const invite = await getPendingInviteByToken(token);
  if (!invite) return fail("invalido");

  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) return fail("config");

  if (!username || !password) return fail("campos");
  if (password !== passwordConfirm) return fail("senha");

  const existing = await getUserByUsername(username);
  if (existing) return fail("usuario_existe");

  const user = await createUser({
    username,
    email,
    password,
    role: invite.role,
  });
  await markInviteUsed(invite.id, user.id);

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

  redirect("/admin");
}
