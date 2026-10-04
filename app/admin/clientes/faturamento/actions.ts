"use server";

import { revalidatePath } from "next/cache";
import {
  closeMonth,
  createService,
  deleteService,
  getInvoiceClientId,
  reopenInvoice,
  updateService,
} from "@/lib/billing";
import { getCurrentSession, requireTeam } from "@/lib/session";
import { assertClientAllowed, getCurrentClientScope } from "@/lib/clientAccess";

function revalidateBilling() {
  revalidatePath("/admin/clientes/faturamento");
  revalidatePath("/admin/clientes/entregas");
  revalidatePath("/admin/clientes/resumo");
}

// -------------------------------------------------------------- catálogo

export async function createServiceAction(formData: FormData) {
  await requireTeam("clientes");
  await createService({
    name: String(formData.get("name") ?? ""),
    price: formData.get("price"),
  });
  revalidateBilling();
}

export async function updateServiceAction(formData: FormData) {
  await requireTeam("clientes");
  await updateService(String(formData.get("id")), {
    name: String(formData.get("name") ?? ""),
    price: formData.get("price"),
    active: formData.get("active") === "on",
  });
  revalidateBilling();
}

export async function deleteServiceAction(formData: FormData) {
  await requireTeam("clientes");
  await deleteService(String(formData.get("id")));
  revalidateBilling();
}

// ------------------------------------------------------------ fechamento

export async function closeMonthAction(formData: FormData) {
  await requireTeam("clientes");
  const session = await getCurrentSession();
  const clientId = String(formData.get("client_id"));
  assertClientAllowed(await getCurrentClientScope(), clientId);

  await closeMonth({
    clientId,
    month: String(formData.get("month")),
    notes: String(formData.get("notes") ?? ""),
    userId: session?.userId ?? null,
  });
  revalidateBilling();
}

export async function reopenInvoiceAction(formData: FormData) {
  await requireTeam("clientes");
  const id = String(formData.get("id"));
  const clientId = await getInvoiceClientId(id);
  if (clientId) assertClientAllowed(await getCurrentClientScope(), clientId);

  await reopenInvoice(id);
  revalidateBilling();
}
