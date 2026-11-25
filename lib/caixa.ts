import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getMoneyYear, getReceived, getReceivedAfter, getReceivables, type ReceivableRow } from "@/lib/dinheiro";
import { getCustoMensal, getExpenseYear, getPaidOutAfter, listExpensesByMonth, listPayables } from "@/lib/expenses";
import { monthKey } from "@/lib/billingTypes";
import { livreParaGastar, projetar, reserva, type OrigemReserva, type Projecao } from "@/lib/caixaCalc";
import type { Expense } from "@/lib/expensesTypes";

export interface FinanceSettings {
  /** Saldo que a pessoa conferiu na conta; null enquanto ninguém informou. */
  cashCents: number | null;
  /** Dia da conferência: o que entra e sai depois dele o app soma sozinho. */
  cashOn: string | null;
  /** Hora da conferência (ISO). */
  cashAt: string | null;
  revenueGoalCents: number | null;
  /** Reserva estimada: parte do que entra que fica guardada, em centésimos de por cento (600 = 6%). */
  reserveRateBps: number;
  /** Reserva mínima em reais; null = não definida. */
  reserveMinCents: number | null;
  /** Reserva mínima em meses de custo; null = não definida. */
  reserveMinMonths: number | null;
  /** Quanto já havia na reserva guardada quando a pessoa informou. */
  reserveBaseCents: number;
}

export const hojeIso = () => new Date().toLocaleDateString("sv-SE");

export async function getFinanceSettings(): Promise<FinanceSettings> {
  const { data, error } = await getSupabaseServerClient()
    .from("finance_settings")
    .select("*")
    .eq("id", true)
    .maybeSingle();
  if (error) throw error;
  return {
    cashCents: data?.cash_cents != null ? Number(data.cash_cents) : null,
    cashOn: (data?.cash_on as string | null) ?? null,
    cashAt: (data?.cash_at as string | null) ?? null,
    revenueGoalCents: data?.revenue_goal_cents != null ? Number(data.revenue_goal_cents) : null,
    reserveRateBps: (data?.reserve_rate_bps as number | undefined) ?? 600,
    reserveMinCents: data?.reserve_min_cents != null ? Number(data.reserve_min_cents) : null,
    reserveMinMonths: data?.reserve_min_months != null ? Number(data.reserve_min_months) : null,
    reserveBaseCents: Number(data?.reserve_base_cents ?? 0),
  };
}

export async function saveFinanceSettings(fields: Partial<{
  cashCents: number;
  cashOn: string;
  cashAt: string;
  revenueGoalCents: number | null;
  reserveRateBps: number;
  reserveMinCents: number | null;
  reserveMinMonths: number | null;
  reserveBaseCents: number;
}>) {
  const row: Record<string, unknown> = { id: true };
  if (fields.cashCents !== undefined) row.cash_cents = fields.cashCents;
  if (fields.cashOn !== undefined) row.cash_on = fields.cashOn;
  if (fields.cashAt !== undefined) row.cash_at = fields.cashAt;
  if (fields.revenueGoalCents !== undefined) row.revenue_goal_cents = fields.revenueGoalCents;
  if (fields.reserveRateBps !== undefined) row.reserve_rate_bps = fields.reserveRateBps;
  if (fields.reserveBaseCents !== undefined) row.reserve_base_cents = fields.reserveBaseCents;
  if (fields.reserveMinCents !== undefined) row.reserve_min_cents = fields.reserveMinCents;
  if (fields.reserveMinMonths !== undefined) row.reserve_min_months = fields.reserveMinMonths;
  const { error } = await getSupabaseServerClient().from("finance_settings").upsert(row);
  if (error) throw error;
}

/**
 * Tudo da conta do caixa numa chamada só: o que há hoje, o que falta receber,
 * o que falta pagar, a projeção e a reserva. As abas Visão geral, A pagar e
 * receber e Projeção leem daqui, então os números nunca divergem entre elas.
 */
export interface CaixaView {
  settings: FinanceSettings;
  hoje: string;
  /** Null enquanto o saldo não foi informado. */
  caixaHoje: number | null;
  receber: ReceivableRow[];
  pagar: Expense[];
  projecao: Projecao | null;
  custoMensal: number;
  /** O piso do caixa em centavos (ver `reserva` em caixaCalc). */
  reservaMinima: number;
  reservaOrigem: OrigemReserva;
  /** Quanto o caixa está acima (ou abaixo, negativo) do piso; null sem saldo. */
  reservaFolga: number | null;
  /** Meses de custo que o caixa cobre: só informação. */
  reservaMeses: number | null;
  livre: number | null;
}

export async function getCaixa(scope: string[] | null = null): Promise<CaixaView> {
  const hoje = hojeIso();
  // Caixa, contas a pagar e reserva são do estúdio todo: quem só vê alguns
  // clientes recebe apenas a lista do que falta receber deles.
  if (scope !== null) {
    return {
      settings: await getFinanceSettings(),
      hoje,
      caixaHoje: null,
      receber: await getReceivables(scope),
      pagar: [],
      projecao: null,
      custoMensal: 0,
      reservaMinima: 0,
      reservaOrigem: "padrao",
      reservaFolga: null,
      reservaMeses: null,
      livre: null,
    };
  }
  const [settings, receber, pagar, custoMensal] = await Promise.all([
    getFinanceSettings(),
    getReceivables(null),
    listPayables(6),
    getCustoMensal(),
  ]);

  let caixaHoje: number | null = null;
  if (settings.cashCents !== null && settings.cashOn) {
    // O que foi marcado depois da conferência soma sozinho; o que veio antes já está no saldo.
    const apos = settings.cashAt ?? `${settings.cashOn}T23:59:59Z`;
    const [entrou, saiu] = await Promise.all([
      getReceivedAfter(settings.cashOn, apos),
      getPaidOutAfter(settings.cashOn, apos, hoje),
    ]);
    caixaHoje = settings.cashCents + entrou - saiu;
  }

  const projecao =
    caixaHoje === null
      ? null
      : projetar({
          hoje,
          caixa: caixaHoje,
          entradas: receber.map((r) => ({ date: r.due, cents: r.cents })),
          saidas: pagar.map((e) => ({ date: e.spentOn, cents: e.amountCents })),
        });
  const r = reserva({
    caixa: caixaHoje ?? 0,
    custoMensal,
    minCents: settings.reserveMinCents,
    minMeses: settings.reserveMinMonths,
  });
  return {
    settings,
    hoje,
    caixaHoje,
    receber,
    pagar,
    projecao,
    custoMensal,
    reservaMinima: r.minimaCents,
    reservaOrigem: r.origem,
    reservaFolga: caixaHoje === null ? null : r.folgaCents,
    reservaMeses: caixaHoje === null ? null : r.meses,
    livre: projecao ? livreParaGastar(projecao.menorCents, r.minimaCents) : null,
  };
}

function nextDay(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString("sv-SE");
}

/** Clientes ativos, para escolher de quem é um gasto. */
export async function listClientOptions(): Promise<{ id: string; name: string }[]> {
  const { data, error } = await getSupabaseServerClient()
    .from("gallery_clients")
    .select("id, name")
    .is("archived_at", null)
    .order("name");
  if (error) throw error;
  return (data ?? []).map((c) => ({ id: c.id as string, name: c.name as string }));
}

/**
 * O que entrou (pelo dia do pagamento) e o que saiu em cada mês do ano,
 * índice 0 = janeiro. "Saiu" conta tudo que tem data no mês, inclusive o que
 * ainda vai pagar: o resultado é o que o mês deve deixar.
 */
export async function getResultadoAno(year: number): Promise<{ entrou: number[]; saiu: number[] }> {
  const [entrou, saiu] = await Promise.all([getMoneyYear(year, null, "pagamento"), getExpenseYear(year)]);
  return { entrou: entrou.map((m) => m.paidCents), saiu };
}

export interface Lancamento {
  key: string;
  data: string;
  titulo: string;
  detalhe: string;
  cents: number;
  tipo: "entrada" | "saida";
}

/** As últimas entradas e saídas, misturadas, da mais recente para a mais antiga. */
export async function getUltimosLancamentos(limite = 6): Promise<Lancamento[]> {
  const hoje = hojeIso();
  const desde = new Date(`${hoje}T12:00:00`);
  desde.setDate(desde.getDate() - 45);
  const desdeIso = desde.toLocaleDateString("sv-SE");
  const atual = monthKey(hoje);
  const anterior = monthKey(desdeIso);
  const [recebido, saidas] = await Promise.all([
    getReceived(desdeIso, nextDay(hoje), null),
    listExpensesByMonth(anterior === atual ? [atual] : [anterior, atual]),
  ]);
  // Vários trabalhos do mesmo cliente no mesmo dia viram uma linha só.
  const porDia = new Map<string, Lancamento>();
  for (const r of recebido) {
    const key = `e${r.clientId}${r.date}`;
    const antes = porDia.get(key);
    porDia.set(key, { key, data: r.date, titulo: r.name, detalhe: "Recebido", tipo: "entrada", cents: (antes?.cents ?? 0) + r.cents });
  }
  const entradas = [...porDia.values()];
  const pagas: Lancamento[] = Object.values(saidas)
    .flat()
    .filter((e) => e.paid && e.spentOn >= desdeIso)
    .map((e) => ({
      key: `s${e.id}${e.spentOn}`,
      data: e.spentOn,
      titulo: e.description || "Saída",
      detalhe: e.clientName ? `Gasto de ${e.clientName}` : "Saída",
      cents: e.amountCents,
      tipo: "saida",
    }));
  return [...entradas, ...pagas].sort((a, b) => b.data.localeCompare(a.data)).slice(0, limite);
}

/** Meses em que a pessoa tocou em "Reserva feita", com o valor guardado em cada um. */
export async function listReserveDeposits(): Promise<{ month: string; cents: number }[]> {
  const { data, error } = await getSupabaseServerClient()
    .from("reserve_deposits")
    .select("month, cents")
    .order("month");
  if (error) throw error;
  return (data ?? []).map((r) => ({ month: r.month as string, cents: Number(r.cents) }));
}

export async function setReserveDeposit(month: string, cents: number) {
  const { error } = await getSupabaseServerClient()
    .from("reserve_deposits")
    .upsert({ month: monthKey(month), cents, done_at: new Date().toISOString() });
  if (error) throw error;
}

export async function removeReserveDeposit(month: string) {
  const { error } = await getSupabaseServerClient()
    .from("reserve_deposits")
    .delete()
    .eq("month", monthKey(month));
  if (error) throw error;
}
