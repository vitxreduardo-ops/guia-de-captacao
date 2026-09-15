"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { SIDEBAR_COOKIE } from "@/lib/sidebarState";

/**
 * Abre e fecha a barra pelo servidor, num form comum.
 *
 * Guardar isso em estado de cliente parecia mais barato, mas o layout do
 * admin não re-renderiza a cada navegação: o valor vindo do servidor congelava
 * no primeiro carregamento e a barra voltava a abrir sozinha ao trocar de
 * tela. Com o cookie como única fonte, não há dois lugares pra discordar.
 */
export async function toggleSidebar() {
  const store = await cookies();
  const fechada = store.get(SIDEBAR_COOKIE)?.value === "fechada";

  store.set(SIDEBAR_COOKIE, fechada ? "aberta" : "fechada", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  revalidatePath("/admin", "layout");
}
