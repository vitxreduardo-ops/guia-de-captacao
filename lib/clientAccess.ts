import "server-only";
import { cache } from "react";
import type { Session } from "@/lib/auth";
import { getUserById, type PublicUser } from "@/lib/users";
import { getCurrentSession } from "@/lib/session";

/**
 * Lista de clientes que esta pessoa pode ver em Clientes/Galerias. `null` =
 * sem restrição (vê todos) — sempre o caso pra admin, e o padrão pra quem
 * não teve `allowed_client_ids` configurado.
 */
export function getClientScope(
  session: Session,
  user: PublicUser
): string[] | null {
  if (session.role === "admin") return null;
  return user.allowed_client_ids;
}

/** Escopo de clientes de quem está logado agora, pra uso direto nas páginas/actions. */
export const getCurrentClientScope = cache(async (): Promise<string[] | null> => {
  const session = await getCurrentSession();
  if (!session) return null;
  const user = await getUserById(session.userId);
  if (!user) return null;
  return getClientScope(session, user);
});

/** Lança se `clientId` estiver fora do escopo — bloqueia acesso direto por URL/POST. */
export function assertClientAllowed(
  scope: string[] | null,
  clientId: string
): void {
  if (scope !== null && !scope.includes(clientId)) {
    throw new Error("Cliente fora do seu acesso.");
  }
}
