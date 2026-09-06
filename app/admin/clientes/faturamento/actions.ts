"use server";

import { revalidatePath } from "next/cache";
import {
  closeMonth,
  createService,
  deleteService,
  reopenInvoice,
  updateService,
} from "@/lib/billing";
import { getCurrentSession } from "@/lib/session";

function revalidateBilling() {
  revalidatePath("/admin/clientes/faturamento");
  revalidatePath("/admin/clientes/entregas");
  revalidatePath("/admin/clientes/resumo");
}

// -------------------------------------------------------------- catálogo

export async function createServiceAction(formData: FormData) {
  await createService({
    name: String(formData.get("name") ?? ""),
    price: formData.get("price"),
  });
  revalidateBilling();
}

export async function updateServiceAction(formData: FormData) {
  await updateService(String(formData.get("id")), {
    name: String(formData.get("name") ?? ""),
    price: formData.get("price"),
    active: formData.get("active") === "on",
  });
  revalidateBilling();
}

export async function deleteServiceAction(formData: FormData) {
  await deleteService(String(formData.get("id")));
  revalidateBilling();
}

// ------------------------------------------------------------ fechamento

export async function closeMonthAction(formData: FormData) {
  const session = await getCurrentSession();
  await closeMonth({
    clientId: String(formData.get("client_id")),
    month: String(formData.get("month")),
    notes: String(formData.get("notes") ?? ""),
    userId: session?.userId ?? null,
  });
  revalidateBilling();
}

export async function reopenInvoiceAction(formData: FormData) {
  await reopenInvoice(String(formData.get("id")));
  revalidateBilling();
}
