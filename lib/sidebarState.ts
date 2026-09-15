import "server-only";
import { cookies } from "next/headers";

export const SIDEBAR_COOKIE = "sidebar";

/** Barra recolhida? Aberta é o padrão de quem nunca mexeu. */
export async function isSidebarCollapsed(): Promise<boolean> {
  const store = await cookies();
  return store.get(SIDEBAR_COOKIE)?.value === "fechada";
}
