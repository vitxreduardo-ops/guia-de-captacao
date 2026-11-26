"use server";

import { revalidatePath } from "next/cache";
import {
  addExpense,
  addRecurringExpense,
  deleteExpense,
  deleteRecurringExpense,
  editRecurringFromMonth,
  markExpensePaid,
  reimburse,
  undoReimbursement,
  stopRecurringExpense,
  updateExpense,
} from "@/lib/expenses";
import { normalizeExpenseCategory, normalizePagoPor } from "@/lib/expensesTypes";
import { parseBRLToCents } from "@/lib/billingTypes";
import { getCurrentClientScope } from "@/lib/clientAccess";
import { getCurrentSession, requireTeam } from "@/lib/session";

/** Despesa é dinheiro do estúdio inteiro, não de um cliente: só quem vê todos os clientes mexe. */
async function requireFullAccess() {
  await requireTeam("financeiro");
  if ((await getCurrentClientScope()) !== null) {
    throw new Error("Só quem tem acesso a todos os clientes vê as despesas.");
  }
}

/** Cliente do gasto: vazio = custo do estúdio. */
function readClient(formData: FormData): string | null {
  const id = String(formData.get("cliente") ?? "").trim();
  return /^[0-9a-f-]{36}$/i.test(id) ? id : null;
}

export async function addExpenseAction(formData: FormData) {
  await requireFullAccess();
  const session = await getCurrentSession();
  const date = String(formData.get("data") ?? "");
  const spentOn = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : new Date().toLocaleDateString("sv-SE");
  const fields = {
    description: String(formData.get("descricao") ?? ""),
    amountCents: parseBRLToCents(formData.get("valor")),
    category: normalizeExpenseCategory(formData.get("categoria")),
    userId: session?.userId ?? null,
  };
  const paid = formData.get("situacao") !== "pagar";
  if (formData.get("repete") === "on") {
    await addRecurringExpense({ ...fields, startsOn: spentOn, paidBy: normalizePagoPor(formData.get("pagoPor")) });
  } else {
    await addExpense({ ...fields, spentOn, paid, clientId: readClient(formData), paidBy: normalizePagoPor(formData.get("pagoPor")) });
  }
  revalidatePath("/admin/financeiro", "layout");
}

export async function deleteExpenseAction(formData: FormData) {
  await requireFullAccess();
  await deleteExpense(String(formData.get("id")));
  revalidatePath("/admin/financeiro", "layout");
}

/** "Paguei": a conta a pagar sai do caixa hoje. */
export async function markExpensePaidAction(formData: FormData) {
  await requireFullAccess();
  await markExpensePaid(String(formData.get("id")), new Date().toLocaleDateString("sv-SE"));
  revalidatePath("/admin/financeiro", "layout");
}

export async function stopRecurringAction(formData: FormData) {
  await requireFullAccess();
  await stopRecurringExpense(String(formData.get("id")), String(formData.get("mes")));
  revalidatePath("/admin/financeiro", "layout");
}

export async function deleteRecurringAction(formData: FormData) {
  await requireFullAccess();
  await deleteRecurringExpense(String(formData.get("id")));
  revalidatePath("/admin/financeiro", "layout");
}

function readExpenseFields(formData: FormData) {
  return {
    description: String(formData.get("descricao") ?? ""),
    amountCents: parseBRLToCents(formData.get("valor")),
    category: normalizeExpenseCategory(formData.get("categoria")),
  };
}

export async function updateExpenseAction(formData: FormData) {
  await requireFullAccess();
  const date = String(formData.get("data") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Data inválida.");
  await updateExpense(String(formData.get("id")), {
    ...readExpenseFields(formData),
    spentOn: date,
    clientId: readClient(formData),
    paidBy: normalizePagoPor(formData.get("pagoPor")),
  });
  revalidatePath("/admin/financeiro", "layout");
}

export async function updateRecurringAction(formData: FormData) {
  await requireFullAccess();
  await editRecurringFromMonth(String(formData.get("id")), String(formData.get("mes")), {
    ...readExpenseFields(formData),
    dayOfMonth: Number(formData.get("dia")),
    paidBy: normalizePagoPor(formData.get("pagoPor")),
  });
  revalidatePath("/admin/financeiro", "layout");
}

/** "Reembolsei": o estúdio devolveu à pessoa tudo que ela pagou no cartão dela. Devolve o id para o desfazer. */
export async function reimburseAction(formData: FormData): Promise<string> {
  await requireFullAccess();
  const pessoa = normalizePagoPor(formData.get("pessoa"));
  if (!pessoa) throw new Error("Pessoa inválida.");
  const id = await reimburse(pessoa, new Date().toLocaleDateString("sv-SE"));
  revalidatePath("/admin/financeiro", "layout");
  return id;
}

export async function undoReimbursementAction(formData: FormData) {
  await requireFullAccess();
  await undoReimbursement(String(formData.get("id")));
  revalidatePath("/admin/financeiro", "layout");
}
