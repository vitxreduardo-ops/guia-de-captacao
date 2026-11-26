import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getMoneyYear, getPagoNoMes, getReceived, getReceivedAfter, getReceivables, type ReceivableRow } from "@/lib/dinheiro";
import { getCustoMensal, getExpenseYear, getPaidOutAfter, listExpensesByMonth, listPayables } from "@/lib/expenses";
import { monthKey } from "@/lib/billingTypes";
import { livreParaGastar, previstoRecorrentes, projetar, reserva, type Recorrente, type OrigemReserva, type Projecao } from "@/lib/caixaCalc";
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
export interface ClienteRecorrente extends Recorrente {
  name: string;
}

export interface CaixaView {
  settings: FinanceSettings;
  /** Clientes recorrentes cadastrados na Projeção (vazio para quem vê só alguns clientes). */
  recorrentes: ClienteRecorrente[];
  /** Quanto os recorrentes acrescentam à projeção; 0 com a previsão desligada. */
  previstoCents: number;
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

export async function getCaixa(
  scope: string[] | null = null,
  opcoes: { recorrentes?: boolean } = {}
): Promise<CaixaView> {
  const hoje = hojeIso();
  // Caixa, contas a pagar e reserva são do estúdio todo: quem só vê alguns
  // clientes recebe apenas a lista do que falta receber deles.
  if (scope !== null) {
    return {
      settings: await getFinanceSettings(),
      recorrentes: [],
      previstoCents: 0,
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
  const [settings, receber, pagar, custoMensal, recorrentes, pagoNoMes] = await Promise.all([
    getFinanceSettings(),
    getReceivables(null),
    listPayables(6),
    getCustoMensal(),
    listRecurring(),
    getPagoNoMes(hoje),
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

  // Já lançado por cliente e mês de vencimento; neste mês conta também o que já foi pago.
  const lancado = new Map<string, number>();
  for (const r of receber) {
    if (r.due) lancado.set(`${r.clientId}|${monthKey(r.due)}`, (lancado.get(`${r.clientId}|${monthKey(r.due)}`) ?? 0) + r.cents);
  }
  const mesAtual = monthKey(hoje);
  const previsto = opcoes.recorrentes === false
    ? []
    : previstoRecorrentes({
        hoje,
        meses: 6,
        recorrentes,
        jaLancado: (c, m) => (lancado.get(`${c}|${m}`) ?? 0) + (m === mesAtual ? (pagoNoMes.get(c) ?? 0) : 0),
      });

  const projecao =
    caixaHoje === null
      ? null
      : projetar({
          hoje,
          caixa: caixaHoje,
          entradas: [...receber.map((r) => ({ date: r.due, cents: r.cents })), ...previsto],
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
    recorrentes,
    previstoCents: previsto.reduce((t, e) => t + e.cents, 0),
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

/** Clientes ativos, para escolher de quem é um gasto (e quem é recorrente). */
export async function listClientOptions(): Promise<{ id: string; name: string; paymentDay: number | null }[]> {
  const { data, error } = await getSupabaseServerClient()
    .from("gallery_clients")
    .select("id, name, payment_day")
    .is("archived_at", null)
    .order("name");
  if (error) throw error;
  return (data ?? []).map((c) => ({
    id: c.id as string,
    name: c.name as string,
    paymentDay: (c.payment_day as number | null) ?? null,
  }));
}

/** Clientes recorrentes da Projeção; cliente arquivado fica de fora. */
export async function listRecurring(): Promise<ClienteRecorrente[]> {
  const { data, error } = await getSupabaseServerClient()
    .from("recurring_clients")
    .select("client_id, cents, pay_day, gallery_clients!inner(name, archived_at)")
    .is("gallery_clients.archived_at", null);
  if (error) throw error;
  return ((data ?? []) as unknown as { client_id: string; cents: number | string; pay_day: number; gallery_clients: { name: string } | { name: string }[] }[])
    .map((r) => ({
      clientId: r.client_id,
      cents: Number(r.cents),
      dia: r.pay_day,
      name: (Array.isArray(r.gallery_clients) ? r.gallery_clients[0] : r.gallery_clients).name,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export async function saveRecurring(clientId: string, cents: number, dia: number) {
  const { error } = await getSupabaseServerClient()
    .from("recurring_clients")
    .upsert({ client_id: clientId, cents, pay_day: dia });
  if (error) throw error;
}

export async function removeRecurring(clientId: string) {
  const { error } = await getSupabaseServerClient().from("recurring_clients").delete().eq("client_id", clientId);
  if (error) throw error;
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
