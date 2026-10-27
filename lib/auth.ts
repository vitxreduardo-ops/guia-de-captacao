import type { UserRole } from "@/lib/users";

// Nome novo junto com o `domain`: o cookie antigo era por subdomínio, e os
// dois com o mesmo nome deixariam o logout sem efeito no sistema.*.
export const COOKIE_NAME = "tatu_session";

/**
 * Opções do cookie de sessão. Em sistema./cliente./www. ele vale pro domínio
 * todo: sem isso o admin logado no sistema.* chegava deslogado no cliente.*
 * pelo "Ver como o cliente" e caía no login e na escolha de cliente de novo.
 * `maxAge: 0` apaga (logout).
 */
export function sessionCookieOptions(host: string | null, maxAge = 60 * 60 * 24 * 30) {
  const domain = (host ?? "").split(":")[0].match(/^(?:sistema|cliente|www)\.(.+)$/)?.[1];
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
    ...(domain ? { domain } : {}),
  };
}

export interface Session {
  userId: string;
  role: UserRole;
  /** Seções do menu liberadas pra esta pessoa. `null` = todas (sem restrição). */
  allowedSections: string[] | null;
}

/**
 * Nenhum código de seção usa "+" ou ".", então servem de separador no cookie.
 * `undefined` entra além de `null` porque, antes da migration que adiciona
 * `allowed_sections`, a coluna nem existe no banco — o valor vindo de lá é
 * `undefined`, não `null`.
 */
function encodeSections(sections: string[] | null | undefined): string {
  return sections == null ? "*" : sections.join("+");
}

function decodeSections(token: string): string[] | null {
  return token === "*" ? null : token.split("+").filter(Boolean);
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
  const value = `${session.userId}.${session.role}.${encodeSections(session.allowedSections)}`;
  const signature = await sign(value, secret);
  return `${value}.${signature}`;
}

/**
 * Decodifica e valida a assinatura do cookie de sessão. Retorna a sessão
 * (userId + role + seções liberadas) se válida, ou null caso contrário —
 * trocar a role ou as seções de um usuário só tem efeito no próximo login,
 * já que os dois vêm embutidos no cookie (evita consulta ao banco a cada
 * request).
 */
export async function getSession(
  cookieValue: string | undefined,
  secret: string
): Promise<Session | null> {
  if (!cookieValue) return null;
  const [userId, role, sectionsToken, signature] = cookieValue.split(".");
  if (!userId || !role || !sectionsToken || !signature) return null;
  if (role !== "admin" && role !== "member" && role !== "client") return null;

  const value = `${userId}.${role}.${sectionsToken}`;
  const expected = await sign(value, secret);
  if (expected !== signature) return null;

  return { userId, role, allowedSections: decodeSections(sectionsToken) };
}
