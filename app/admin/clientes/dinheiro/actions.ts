"use server";

import { revalidatePath } from "next/cache";
import {
  addPartialPayment,
  getCardClientIds,
  markCardsPaid,
  markCardsUnpaid,
} from "@/lib/dinheiro";
import { parseBRLToCents } from "@/lib/billingTypes";
import { normalizePaymentMethod } from "@/lib/backlogTypes";
import { assertClientAllowed, getCurrentClientScope } from "@/lib/clientAccess";
import { requireTeam } from "@/lib/session";

function revalidateMoney() {
  revalidatePath("/admin/clientes/dinheiro");
  revalidatePath("/admin/clientes/entregas");
  revalidatePath("/admin/clientes/cadastro");
}

async function readCardIds(formData: FormData): Promise<string[]> {
  const ids = formData.getAll("card").map(String).filter(Boolean);
  if (ids.length === 0) throw new Error("Nenhuma entrega escolhida.");
  const scope = await getCurrentClientScope();
  for (const clientId of await getCardClientIds(ids)) {
    assertClientAllowed(scope, clientId);
  }
  return ids;
}

/** "Recebi": uma entrega ou todas as de um cliente, com a forma de pagamento. */
export async function markPaidAction(formData: FormData) {
  await requireTeam("clientes");
  const ids = await readCardIds(formData);
  const method = normalizePaymentMethod(formData.get("method")) ?? "pix";
  await markCardsPaid(ids, method, new Date().toLocaleDateString("sv-SE"));
  revalidateMoney();
}

export async function markUnpaidAction(formData: FormData) {
  await requireTeam("clientes");
  await markCardsUnpaid(await readCardIds(formData));
  revalidateMoney();
}

/** "Recebi uma parte": o valor vem do campo, em reais. */
export async function markPartialAction(formData: FormData) {
  await requireTeam("clientes");
  const [id] = await readCardIds(formData);
  const method = normalizePaymentMethod(formData.get("method")) ?? "pix";
  await addPartialPayment(
    id,
    parseBRLToCents(formData.get("valor")),
    method,
    new Date().toLocaleDateString("sv-SE")
  );
  revalidateMoney();
}
