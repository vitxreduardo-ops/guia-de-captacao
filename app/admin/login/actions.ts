"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, createSessionCookieValue } from "@/lib/auth";
import { getUserByUsername, verifyPassword } from "@/lib/users";
import { clientIp, rateLimit } from "@/lib/rateLimit";

export async function login(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  // Só caminho interno: `next=https://outro-site` viraria um redirect pra fora
  // logo depois do login, que é o golpe clássico de phishing.
  const rawNext = String(formData.get("next") ?? "");
  const next = /^\/(?![\/\\])/.test(rawNext) ? rawNext : "/admin";
  const secret = process.env.ADMIN_PASSWORD;

  if (!secret) {
    redirect(`/admin/login?error=config&next=${encodeURIComponent(next)}`);
  }

  // Sem isto dá pra testar senha sem parar. Conta por IP e usuário: quem erra
  // a própria senha não tranca o login dos outros.
  if (!(await rateLimit(`login:${await clientIp()}:${username.toLowerCase()}`, 5, 15 * 60))) {
    redirect(`/admin/login?error=limite&next=${encodeURIComponent(next)}`);
  }

  const user = await getUserByUsername(username);
  const valid = user ? await verifyPassword(password, user.password_hash) : false;

  if (!user || !valid) {
    redirect(`/admin/login?error=1&next=${encodeURIComponent(next)}`);
  }

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

  // O cookie é por subdomínio: admin que entra pelo cliente.* fica no portal
  // (a prévia), em vez de ser mandado pro sistema.* onde não está logado.
  const noPortal = ((await headers()).get("host") ?? "").startsWith("cliente.");
  redirect(user.role === "client" || (noPortal && next.startsWith("/admin")) ? "/cliente" : next || "/admin");
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  redirect("/admin/login");
}
