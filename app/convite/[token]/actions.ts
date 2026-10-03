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
    { userId: user.id, role: user.role, allowedSections: user.allowed_sections },
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

/**
 * Convite de cliente: a pessoa escolhe nome, usuário e senha e já entra no
 * portal do cliente a que o convite pertence. O convite vale uma vez.
 */
export async function acceptClientInviteAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("password_confirm") ?? "");

  function fail(error: string): never {
    redirect(`/convite/${token}?error=${encodeURIComponent(error)}`);
  }

  const invite = await getPendingInviteByToken(token);
  if (!invite || invite.role !== "client" || !invite.client_id) return fail("invalido");

  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) return fail("config");

  if (!fullName) return fail("nome");
  if (!/^[a-z0-9._-]{3,}$/i.test(username)) return fail("usuario_formato");
  if (password.length < 6) return fail("senha_curta");
  if (password !== passwordConfirm) return fail("senha");
  if (await getUserByUsername(username)) return fail("usuario_existe");

  const user = await createUser({
    username,
    email: "",
    password,
    role: "client",
    clientId: invite.client_id,
    fullName,
    portalLabel: invite.label,
  });
  await markInviteUsed(invite.id, user.id);

  const cookieValue = await createSessionCookieValue(
    { userId: user.id, role: "client", allowedSections: null },
    secret
  );
  (await cookies()).set(COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect("/cliente");
}
