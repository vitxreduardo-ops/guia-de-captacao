// As mesmas regras do painel, aplicadas a quem fala pelo Telegram. A seção é
// o trecho depois de /admin/ (ver proxy.ts) e o escopo de cliente é o
// `allowed_client_ids` (ver lib/clientAccess.ts).

import type { BacklogBoardKind } from "@/lib/backlogTypes";
import type { TelegramActor } from "@/lib/telegram/identity";

export class PermissionError extends Error {}

/** Seção do painel que dá acesso a cada quadro. */
export const BOARD_SECTION: Record<BacklogBoardKind, string> = {
  entregas: "entregas",
  instagram: "backlog",
};

export function canUseSection(actor: TelegramActor, section: string): boolean {
  return actor.role === "admin" || actor.allowedSections === null || actor.allowedSections.includes(section);
}

export function canUseBoard(actor: TelegramActor, board: BacklogBoardKind): boolean {
  return canUseSection(actor, BOARD_SECTION[board]);
}

/** null = todos os clientes. */
export function clientScope(actor: TelegramActor): string[] | null {
  return actor.role === "admin" ? null : actor.allowedClientIds;
}

/** Card sem cliente fica fora pra quem tem escopo restrito, como no quadro. */
export function canSeeClient(actor: TelegramActor, clientId: string | null): boolean {
  const scope = clientScope(actor);
  return scope === null || (clientId !== null && scope.includes(clientId));
}

export function assertBoard(actor: TelegramActor, board: BacklogBoardKind) {
  if (!canUseBoard(actor, board)) {
    throw new PermissionError(
      board === "entregas"
        ? "Você não tem acesso às entregas de clientes."
        : "Você não tem acesso ao Backlog da Tatu."
    );
  }
}

export function assertClient(actor: TelegramActor, clientId: string | null) {
  if (!canSeeClient(actor, clientId)) throw new PermissionError("Esse cliente está fora do seu acesso.");
}
