import type { UserRole } from "@/lib/users";

export const COOKIE_NAME = "admin_session";

export interface Session {
  userId: string;
  role: UserRole;
}

function bufferToHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value)
  );
  return bufferToHex(signature);
}

export async function createSessionCookieValue(
  session: Session,
  secret: string
) {
  const value = `${session.userId}.${session.role}`;
  const signature = await sign(value, secret);
  return `${value}.${signature}`;
}

/**
 * Decodifica e valida a assinatura do cookie de sessão. Retorna a sessão
 * (userId + role) se válida, ou null caso contrário — trocar a role de um
 * usuário só tem efeito no próximo login, já que a role vem embutida no
 * cookie (evita consulta ao banco a cada request).
 */
export async function getSession(
  cookieValue: string | undefined,
  secret: string
): Promise<Session | null> {
  if (!cookieValue) return null;
  const [userId, role, signature] = cookieValue.split(".");
  if (!userId || !role || !signature) return null;
  if (role !== "admin" && role !== "member") return null;

  const expected = await sign(`${userId}.${role}`, secret);
  if (expected !== signature) return null;

  return { userId, role };
}
