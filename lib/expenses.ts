import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { monthKey, nextMonthKey } from "@/lib/billingTypes";
import {
  normalizeExpenseCategory,
  type Expense,
  type ExpenseCategory,
} from "@/lib/expensesTypes";

function toExpense(row: Record<string, unknown>): Expense {
  const client = row.client as { name?: string } | { name?: string }[] | null | undefined;
  return {
    id: row.id as string,
    description: (row.description as string) ?? "",
    amountCents: row.amount_cents as number,
    category: normalizeExpenseCategory(row.category),
    spentOn: row.spent_on as string,
    paid: row.paid_on != null,
    clientId: (row.client_id as string | null) ?? null,
    clientName: (Array.isArray(client) ? client[0]?.name : client?.name) ?? null,
  };
}

const COM_CLIENTE = "*, client:gallery_clients(name)";

/** Data local em AAAA-MM-DD (toISOString viraria o dia anterior à noite). */
function hojeIso(): string {
  return new Date().toLocaleDateString("sv-SE");
}

/** A fixa debita sozinha no dia dela: passou do dia, já saiu do caixa. */
function fixaParaExpense(r: Recurring, month: string): Expense {
  const spentOn = dayIn(month, r.dayOfMonth);
  return {
    id: `fixa-${r.id}`,
    description: r.description,
    amountCents: r.amountCents,
    category: r.category,
    spentOn,
    recurringId: r.id,
    paid: spentOn <= hojeIso(),
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
      .select(COM_CLIENTE)
      .gte("spent_on", from)
      .lt("spent_on", nextMonthKey(from))
      .order("created_at", { ascending: false }),
    listRecurring(),
  ]);
  if (single.error) throw single.error;
  const fixed: Expense[] = recurring
    .filter((r) => activeIn(r, from))
    .map((r) => fixaParaExpense(r, from));
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
      if (activeIn(r, m)) result[m].push(fixaParaExpense(r, m));
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
  /** A data em que saiu — ou, se ainda vai pagar, o vencimento. */
  spentOn: string;
  /** Já saiu do caixa? Falso = fica em "A pagar" até alguém marcar "Paguei". */
  paid: boolean;
  clientId: string | null;
  userId: string | null;
}) {
  if (!(fields.amountCents > 0)) throw new Error("Informe um valor maior que zero.");
  const { error } = await getSupabaseServerClient()
    .from("expenses")
    .insert({
      description: fields.description.trim(),
      amount_cents: fields.amountCents,
      category: fields.category,
      spent_on: fields.spentOn,
      paid_on: fields.paid ? (fields.spentOn <= hojeIso() ? fields.spentOn : hojeIso()) : null,
      paid_marked_at: fields.paid ? new Date().toISOString() : null,
      client_id: fields.clientId,
      created_by: fields.userId,
    });
  if (error) throw error;
}

/** "Paguei": a saída que estava a pagar sai do caixa hoje. */
export async function markExpensePaid(id: string, paidOn: string) {
  const { error } = await getSupabaseServerClient()
    .from("expenses")
    .update({ paid_on: paidOn, paid_marked_at: new Date().toISOString() })
    .eq("id", id);
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

/** Corrige uma despesa avulsa. */
export async function updateExpense(
  id: string,
  fields: {
    description: string;
    amountCents: number;
    category: ExpenseCategory;
    spentOn: string;
    clientId: string | null;
  }
) {
  if (!(fields.amountCents > 0)) throw new Error("Informe um valor maior que zero.");
  const { error } = await getSupabaseServerClient()
    .from("expenses")
    .update({
      description: fields.description.trim(),
      amount_cents: fields.amountCents,
      category: fields.category,
      spent_on: fields.spentOn,
      client_id: fields.clientId,
    })
    .eq("id", id);
  if (error) throw error;
}

/**
 * Muda uma despesa fixa a partir de um mês, sem mexer nos anteriores: a antiga
 * termina no mês passado e uma nova começa neste. Se a fixa começou neste mês
 * (ou depois), é só corrigir a própria linha — não há histórico a proteger.
 */
export async function editRecurringFromMonth(
  id: string,
  month: string,
  fields: { description: string; amountCents: number; category: ExpenseCategory; dayOfMonth: number }
) {
  if (!(fields.amountCents > 0)) throw new Error("Informe um valor maior que zero.");
  if (!(fields.dayOfMonth >= 1 && fields.dayOfMonth <= 31)) throw new Error("Dia do mês inválido.");
  const supabase = getSupabaseServerClient();
  const first = monthKey(month);

  const { data: old, error } = await supabase
    .from("recurring_expenses")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;

  const values = {
    description: fields.description.trim(),
    amount_cents: fields.amountCents,
    category: fields.category,
    day_of_month: fields.dayOfMonth,
  };

  if (monthKey(old.starts_on as string) >= first) {
    const { error: upError } = await supabase.from("recurring_expenses").update(values).eq("id", id);
    if (upError) throw upError;
    return;
  }

  const { error: insError } = await supabase.from("recurring_expenses").insert({
    ...values,
    starts_on: first,
    ends_on: old.ends_on ?? null,
    created_by: old.created_by ?? null,
  });
  if (insError) throw insError;

  const y = Number(first.slice(0, 4));
  const m = Number(first.slice(5, 7));
  const lastDayBefore = new Date(y, m - 1, 0); // último dia do mês anterior
  const endsOn = `${lastDayBefore.getFullYear()}-${String(lastDayBefore.getMonth() + 1).padStart(2, "0")}-${String(lastDayBefore.getDate()).padStart(2, "0")}`;
  const { error: endError } = await supabase
    .from("recurring_expenses")
    .update({ ends_on: endsOn })
    .eq("id", id);
  if (endError) throw endError;
}


/**
 * O que ainda vai sair do caixa: as avulsas sem "Paguei" (de qualquer data —
 * vencida também conta) e as fixas dos próximos `meses` meses que ainda não
 * debitaram. Da mais antiga pra mais nova.
 */
export async function listPayables(meses = 6): Promise<Expense[]> {
  const hoje = hojeIso();
  const primeiro = monthKey(hoje);
  const [single, recurring] = await Promise.all([
    getSupabaseServerClient()
      .from("expenses")
      .select(COM_CLIENTE)
      .is("paid_on", null)
      .order("spent_on"),
    listRecurring(),
  ]);
  if (single.error) throw single.error;
  const fixed: Expense[] = [];
  let m = primeiro;
  for (let i = 0; i < meses; i += 1) {
    for (const r of recurring) {
      if (!activeIn(r, m)) continue;
      const e = fixaParaExpense(r, m);
      if (!e.paid) fixed.push(e);
    }
    m = nextMonthKey(m);
  }
  return [...(single.data ?? []).map(toExpense), ...fixed].sort((a, b) =>
    a.spentOn.localeCompare(b.spentOn)
  );
}

/**
 * Quanto saiu do caixa depois da conferência do saldo: o pago em dia posterior
 * (até `ate`), o pago no mesmo dia mas marcado depois da hora conferida e as
 * fixas que debitaram depois.
 */
export async function getPaidOutAfter(cashOn: string, cashAt: string, ate: string): Promise<number> {
  const { data, error } = await getSupabaseServerClient()
    .from("expenses")
    .select("amount_cents")
    .lte("paid_on", ate)
    .or(`paid_on.gt.${cashOn},and(paid_on.eq.${cashOn},paid_marked_at.gt.${cashAt})`);
  if (error) throw error;
  let total = (data ?? []).reduce((s, r) => s + (r.amount_cents as number), 0);
  const recurring = await listRecurring();
  let m = monthKey(cashOn);
  while (m <= ate) {
    for (const r of recurring) {
      if (!activeIn(r, m)) continue;
      const dia = dayIn(m, r.dayOfMonth);
      if (dia > cashOn && dia <= ate) total += r.amountCents;
    }
    m = nextMonthKey(m);
  }
  return total;
}

/**
 * Custo mensal médio do estúdio: a média dos três últimos meses fechados.
 * Sem histórico, vale o que as fixas pesam neste mês.
 */
export async function getCustoMensal(): Promise<number> {
  const atual = monthKey(hojeIso());
  const anteriores = [3, 2, 1].map((n) => {
    const total = Number(atual.slice(0, 4)) * 12 + Number(atual.slice(5, 7)) - 1 - n;
    return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}-01`;
  });
  const porMes = await listExpensesByMonth([...anteriores, atual]);
  const soma = (m: string) => porMes[m].reduce((s, e) => s + e.amountCents, 0);
  const media = Math.round(anteriores.reduce((s, m) => s + soma(m), 0) / anteriores.length);
  if (media > 0) return media;
  return porMes[atual].filter((e) => e.recurringId).reduce((s, e) => s + e.amountCents, 0);
}

/** Gasto de cliente no mês, por cliente: é o que a Análise tira do que o cliente rendeu. */
export async function getClientCosts(month: string): Promise<Record<string, number>> {
  const from = monthKey(month);
  const { data, error } = await getSupabaseServerClient()
    .from("expenses")
    .select("client_id, amount_cents")
    .not("client_id", "is", null)
    .gte("spent_on", from)
    .lt("spent_on", nextMonthKey(from));
  if (error) throw error;
  const result: Record<string, number> = {};
  for (const row of data ?? []) {
    const id = row.client_id as string;
    result[id] = (result[id] ?? 0) + (row.amount_cents as number);
  }
  return result;
}

/** Tudo que se gastou só com um cliente, do mais recente para o mais antigo. */
export async function listClientExpenses(clientId: string): Promise<Expense[]> {
  const { data, error } = await getSupabaseServerClient()
    .from("expenses")
    .select(COM_CLIENTE)
    .eq("client_id", clientId)
    .order("spent_on", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toExpense);
}
