"use server";

import { revalidatePath } from "next/cache";
import {
  addPartialPayment,
  getCardClientIds,
  getClientMonths,
  getClientOpenItems,
  getStatement,
  type ClientMonthLine,
  type OpenItem,
  markCardsPaid,
  markCardsUnpaid,
  setCardsDue,
  setCardsPaidAt,
  setPartialAmount,
  updatePayment,
  updateCardBilling,
  updateClientContact,
} from "@/lib/dinheiro";
import { parseBRLToCents } from "@/lib/billingTypes";
import { normalizePaymentMethod } from "@/lib/backlogTypes";
import { assertClientAllowed, getCurrentClientScope } from "@/lib/clientAccess";
import { requireTeam } from "@/lib/session";
import { listGalleryClients } from "@/lib/galleries";
import type { StatementRow } from "@/lib/dinheiroTypes";

function revalidateMoney() {
  revalidatePath("/admin/clientes/dinheiro");
  revalidatePath("/admin/clientes/entregas");
  revalidatePath("/admin/clientes/cadastro");
  revalidatePath("/admin/clientes/[id]", "page");
}

/** Data AAAA-MM-DD válida, ou null (campo vazio = vencimento automático). */
function readDate(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? "").trim();
  if (text === "") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(text))) {
    throw new Error("Data inválida.");
  }
  return text;
}

/** Dia do pagamento: o campo, ou hoje se vier vazio. Não aceita data futura. */
function readPaidDate(value: FormDataEntryValue | null): string {
  const hoje = new Date().toLocaleDateString("sv-SE");
  const date = readDate(value) ?? hoje;
  if (date > hoje) throw new Error("A data do pagamento não pode ser no futuro.");
  return date;
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
  await markCardsPaid(ids, method, readPaidDate(formData.get("pago_em")));
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
    readPaidDate(formData.get("pago_em"))
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
    dueOn: readDate(formData.get("vencimento")),
  });
  // Só as entregas pagas trazem o campo: é o dia da transação, separado do vencimento.
  if (formData.get("pago_em")) await setCardsPaidAt([id], readPaidDate(formData.get("pago_em")));
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

/** Muda (ou limpa) o vencimento de várias entregas de um cliente de uma vez. */
export async function setDueAction(formData: FormData) {
  await requireTeam("clientes");
  const ids = await readCardIds(formData);
  await setCardsDue(ids, readDate(formData.get("vencimento")));
  revalidateMoney();
}

/** Corrige o dia em que o dinheiro entrou (extrato e contas). */
export async function setPaidAtAction(formData: FormData) {
  await requireTeam("clientes");
  const ids = await readCardIds(formData);
  await setCardsPaidAt(ids, readPaidDate(formData.get("pago_em")));
  revalidateMoney();
}

/** Edita um pagamento: dia, forma, quantidade e valor de cada. */
export async function updatePaymentAction(formData: FormData) {
  await requireTeam("clientes");
  const [id] = await readCardIds(formData);
  const method = normalizePaymentMethod(formData.get("method"));
  if (!method) throw new Error("Escolha como foi pago.");
  const paidAt = readDate(formData.get("pago_em"));
  if (!paidAt) throw new Error("Informe o dia do pagamento.");
  await updatePayment(id, {
    paidAt: readPaidDate(paidAt),
    method,
    quantity: Number(formData.get("quantidade")),
    unitCents: parseBRLToCents(formData.get("valor")),
  });
  revalidateMoney();
}

/** Corrige quanto já entrou de um pagamento parcial. */
export async function setPartialAmountAction(formData: FormData) {
  await requireTeam("clientes");
  const [id] = await readCardIds(formData);
  await setPartialAmount(id, parseBRLToCents(formData.get("valor")));
  revalidateMoney();
}

export interface ClientDrawerData {
  id: string;
  name: string;
  companyName: string | null;
  contactName: string | null;
  phone: string | null;
  paymentDay: number | null;
  months: ClientMonthLine[];
  open: OpenItem[];
  statement: StatementRow[];
}

/** Tudo que a gaveta do cliente mostra, numa chamada só. */
export async function loadClientDrawerAction(clientId: string): Promise<ClientDrawerData> {
  await requireTeam("clientes");
  const scope = await getCurrentClientScope();
  assertClientAllowed(scope, clientId);
  const clients = await listGalleryClients({ includeArchived: true, clientScope: scope });
  const client = clients.find((c) => c.id === clientId);
  if (!client) throw new Error("Cliente não encontrado.");
  const [months, open, statement] = await Promise.all([
    getClientMonths(clientId),
    getClientOpenItems(clientId),
    getStatement(null, scope, clientId),
  ]);
  return {
    id: client.id,
    name: client.name,
    companyName: client.company_name,
    contactName: client.contact_name,
    phone: client.phone,
    paymentDay: client.payment_day,
    months,
    open,
    statement,
  };
}
