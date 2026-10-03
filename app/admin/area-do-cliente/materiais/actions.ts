"use server";

import { revalidatePath } from "next/cache";
import { updateBacklogColumn } from "@/lib/backlog";
import { requireAdmin } from "@/lib/session";

export async function setColumnClientVisibleAction(columnId: string, visible: boolean) {
  await requireAdmin();
  await updateBacklogColumn(columnId, { clientVisible: visible });
  revalidatePath("/admin/area-do-cliente/materiais");
  revalidatePath("/admin/clientes/entregas");
  revalidatePath("/cliente", "layout");
}
