import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { monthKey, nextMonthKey } from "@/lib/billingTypes";
import {
  normalizeExpenseCategory,
  type Expense,
  type ExpenseCategory,
} from "@/lib/expensesTypes";

function toExpense(row: Record<string, unknown>): Expense {
  return {
    id: row.id as string,
    description: (row.description as string) ?? "",
    amountCents: row.amount_cents as number,
    category: normalizeExpenseCategory(row.category),
    spentOn: row.spent_on as string,
  };
}

interface Recurring {
  id: string;
  description: string;
  amountCents: number;
  category: ExpenseCategory;
  dayOfMonth: number;
  startsOn: string;
  endsOn: string | null;
}

async function listRecurring(): Promise<Recurring[]> {
  const { data, error } = await getSupabaseServerClient()
    .from("recurring_expenses")
    .select("*");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id as string,
    description: (row.description as string) ?? "",
    amountCents: row.amount_cents as number,
    category: normalizeExpenseCategory(row.category),
    dayOfMonth: row.day_of_month as number,
    startsOn: row.starts_on as string,
    endsOn: (row.ends_on as string | null) ?? null,
  }));
}

/** A despesa fixa vale neste mês? (começou até o fim dele e não terminou antes do começo.) */
function activeIn(r: Recurring, month: string): boolean {
  const from = monthKey(month);
  const to = nextMonthKey(from);
  return r.startsOn < to && (r.endsOn === null || r.endsOn >= from);
}

/** Dia do vencimento dentro do mês, sem estourar em fevereiro. */
function dayIn(month: string, day: number): string {
  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  const last = new Date(y, m, 0).getDate();
  return `${month.slice(0, 7)}-${String(Math.min(day, last)).padStart(2, "0")}`;
}

/** Despesas do mês — avulsas e fixas —, da mais recente pra mais antiga. */
export async function listExpenses(month: string): Promise<Expense[]> {
  const from = monthKey(month);
  const [single, recurring] = await Promise.all([
    getSupabaseServerClient()
      .from("expenses")
      .select("*")
      .gte("spent_on", from)
      .lt("spent_on", nextMonthKey(from))
      .order("created_at", { ascending: false }),
    listRecurring(),
  ]);
  if (single.error) throw single.error;
  const fixed: Expense[] = recurring
    .filter((r) => activeIn(r, from))
    .map((r) => ({
      id: `fixa-${r.id}`,
      description: r.description,
      amountCents: r.amountCents,
      category: r.category,
      spentOn: dayIn(from, r.dayOfMonth),
      recurringId: r.id,
    }));
  return [...(single.data ?? []).map(toExpense), ...fixed].sort((a, b) =>
    b.spentOn.localeCompare(a.spentOn)
  );
}

/** Despesas de vários meses de uma vez, por mês ("AAAA-MM-01"), contando as fixas. */
export async function listExpensesByMonth(months: string[]): Promise<Record<string, Expense[]>> {
  const result: Record<string, Expense[]> = {};
  for (const m of months) result[m] = [];
  if (months.length === 0) return result;
  const sorted = [...months].sort();
  const [single, recurring] = await Promise.all([
    getSupabaseServerClient()
      .from("expenses")
      .select("*")
      .gte("spent_on", sorted[0])
      .lt("spent_on", nextMonthKey(sorted[sorted.length - 1])),
    listRecurring(),
  ]);
  if (single.error) throw single.error;
  for (const row of single.data ?? []) {
    const e = toExpense(row);
    const key = monthKey(e.spentOn);
    if (key in result) result[key].push(e);
  }
  for (const m of months) {
    for (const r of recurring) {
      if (!activeIn(r, m)) continue;
      result[m].push({
        id: `fixa-${r.id}`,
        description: r.description,
        amountCents: r.amountCents,
        category: r.category,
        spentOn: dayIn(m, r.dayOfMonth),
        recurringId: r.id,
      });
    }
    result[m].sort((a, b) => b.amountCents - a.amountCents);
  }
  return result;
}

/** Total gasto em cada mês do ano (índice 0 = janeiro), contando as fixas. */
export async function getExpenseYear(year: number): Promise<number[]> {
  const totals = Array<number>(12).fill(0);
  const [single, recurring] = await Promise.all([
    getSupabaseServerClient()
      .from("expenses")
      .select("amount_cents, spent_on")
      .gte("spent_on", `${year}-01-01`)
      .lt("spent_on", `${year + 1}-01-01`),
    listRecurring(),
  ]);
  if (single.error) throw single.error;
  for (const row of single.data ?? []) {
    totals[Number(String(row.spent_on).slice(5, 7)) - 1] += row.amount_cents as number;
  }
  for (let i = 0; i < 12; i += 1) {
    const month = `${year}-${String(i + 1).padStart(2, "0")}-01`;
    for (const r of recurring) if (activeIn(r, month)) totals[i] += r.amountCents;
  }
  return totals;
}

export async function addExpense(fields: {
  description: string;
  amountCents: number;
  category: ExpenseCategory;
  spentOn: string;
  userId: string | null;
}) {
  if (!(fields.amountCents > 0)) throw new Error("Informe um valor maior que zero.");
  const { error } = await getSupabaseServerClient().from("expenses").insert({
    description: fields.description.trim(),
    amount_cents: fields.amountCents,
    category: fields.category,
    spent_on: fields.spentOn,
    created_by: fields.userId,
  });
  if (error) throw error;
}

export async function deleteExpense(id: string) {
  const { error } = await getSupabaseServerClient().from("expenses").delete().eq("id", id);
  if (error) throw error;
}

/** Cria uma despesa que se repete todo mês, a partir do mês da data escolhida. */
export async function addRecurringExpense(fields: {
  description: string;
  amountCents: number;
  category: ExpenseCategory;
  startsOn: string;
  userId: string | null;
}) {
  if (!(fields.amountCents > 0)) throw new Error("Informe um valor maior que zero.");
  const { error } = await getSupabaseServerClient().from("recurring_expenses").insert({
    description: fields.description.trim(),
    amount_cents: fields.amountCents,
    category: fields.category,
    day_of_month: Number(fields.startsOn.slice(8, 10)),
    starts_on: fields.startsOn,
    created_by: fields.userId,
  });
  if (error) throw error;
}

/** Para de repetir depois do mês informado; os meses até ele continuam contando. */
export async function stopRecurringExpense(id: string, lastMonth: string) {
  const from = monthKey(lastMonth);
  const [y, m] = [Number(from.slice(0, 4)), Number(from.slice(5, 7))];
  const endsOn = `${from.slice(0, 7)}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
  const { error } = await getSupabaseServerClient()
    .from("recurring_expenses")
    .update({ ends_on: endsOn })
    .eq("id", id);
  if (error) throw error;
}

/** Apaga a despesa fixa de todos os meses (pra corrigir lançamento errado). */
export async function deleteRecurringExpense(id: string) {
  const { error } = await getSupabaseServerClient()
    .from("recurring_expenses")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
