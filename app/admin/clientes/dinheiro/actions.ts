"use server";

import { revalidatePath } from "next/cache";
import {
  addPartialPayment,
  getCardClientIds,
  markCardsPaid,
  markCardsUnpaid,
  updateCardBilling,
  updateClientContact,
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

/** Corrige nome, quantidade, valor e produto de uma entrega, sem sair da tela. */
export async function updateItemAction(formData: FormData) {
  await requireTeam("clientes");
  const [id] = await readCardIds(formData);
  await updateCardBilling(id, {
    title: String(formData.get("titulo") ?? ""),
    quantity: Number(formData.get("quantidade")),
    unitCents: parseBRLToCents(formData.get("valor")),
    customService: String(formData.get("produto") ?? ""),
  });
  revalidateMoney();
}

/** Dia de pagamento, telefone e responsável, direto da cobrança. */
export async function updateClientContactAction(formData: FormData) {
  await requireTeam("clientes");
  const clientId = String(formData.get("client"));
  assertClientAllowed(await getCurrentClientScope(), clientId);
  const day = String(formData.get("dia") ?? "").trim();
  await updateClientContact(clientId, {
    paymentDay: day === "" ? null : Number(day),
    phone: String(formData.get("telefone") ?? ""),
    contactName: String(formData.get("responsavel") ?? ""),
  });
  revalidateMoney();
}
