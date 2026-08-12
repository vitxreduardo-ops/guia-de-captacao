import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, getSession, type Session } from "@/lib/auth";

/**
 * Lê a sessão atual (userId + role) a partir do cookie, pra uso em Server
 * Components e server actions (fora do middleware, que já faz sua própria
 * checagem via request.cookies em proxy.ts).
 */
export async function getCurrentSession(): Promise<Session | null> {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) return null;
  const cookieStore = await cookies();
  return getSession(cookieStore.get(COOKIE_NAME)?.value, secret);
}

/**
 * Bloqueia o acesso de quem não é admin — usado nas páginas/actions de
 * gerenciamento de usuários, a única área restrita a admin no sistema.
 */
export async function requireAdmin(): Promise<Session> {
  const session = await getCurrentSession();
  if (!session || session.role !== "admin") {
    redirect("/admin");
  }
  return session;
}
