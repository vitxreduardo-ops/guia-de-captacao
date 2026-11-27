import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { dueDateOf } from "@/lib/backlogTypes";
import { setBacklogCardColumn, setBacklogCardPayment } from "@/lib/backlog";
import type { PaymentMethod } from "@/lib/backlogTypes";
import {
  lineTotalCents,
  monthKey,
  nextMonthKey,
  type MonthlyInvoiceWithItems,
} from "@/lib/billingTypes";
import type {
  MoneyClient,
  MoneyItem,
  MoneyMonth,
  MoneyOpenElsewhere,
  MoneyYearMonth,
} from "@/lib/dinheiroTypes";

/** Data local em AAAA-MM-DD (toISOString viraria o dia anterior à noite). */
function iso(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

function dueOf(month: string, paymentDay: number | null): string | null {
  return paymentDay ? iso(dueDateOf(month, paymentDay)) : null;
}

interface CardRow {
  id: string;
  client_id: string;
  column_id: string;
  title: string | null;
  post_date: string | null;
  billing_month: string | null;
  quantity: number | null;
  unit_price_cents: number | null;
  paid_at: string | null;
  paid_cents: number | null;
  due_on: string | null;
  payment_method: string | null;
  custom_service: string | null;
  services: { name: string } | { name: string }[] | null;
}

const CARD_FIELDS =
  "id, client_id, column_id, title, post_date, billing_month, quantity, unit_price_cents, paid_at, paid_cents, due_on, payment_method, custom_service, services(name)";

const cardMonth = (row: CardRow): string | null =>
  row.billing_month
    ? monthKey(row.billing_month)
    : row.post_date
      ? monthKey(row.post_date)
      : null;

async function billableColumns() {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("backlog_columns")
    .select("id, paid, position")
    .eq("board", "entregas")
    .eq("billable", true)
    .order("position");
  if (error) throw error;
  return (data ?? []) as { id: string; paid: boolean; position: number }[];
}

/** Vencimento da entrega: o escolhido à mão ou o dia combinado, no mês seguinte ao do trabalho. */
function effectiveDue(row: CardRow, paymentDay: number | null): string | null {
  if (row.due_on) return row.due_on;
  const m = cardMonth(row);
  return m ? dueOf(m, paymentDay) : null;
}

function toItem(row: CardRow, paid: boolean, dueOn: string | null = row.due_on): MoneyItem {
  const service = Array.isArray(row.services) ? row.services[0] : row.services;
  const quantity = row.quantity ?? 1;
  const unitCents = row.unit_price_cents ?? 0;
  const totalCents = lineTotalCents({ quantity, unit_price_cents: unitCents });
  // Pago = tudo. Na espera pode ter entrado uma parte (pagamento parcial).
  const receivedCents = paid ? totalCents : Math.min(row.paid_cents ?? 0, totalCents);
  return {
    cardId: row.id,
    month: cardMonth(row),
    title: row.title ?? "",
    serviceName: row.custom_service || service?.name || null,
    date: row.post_date,
    quantity,
    unitCents,
    totalCents,
    receivedCents,
    openCents: totalCents - receivedCents,
    paid,
    paidAt: row.paid_at,
    method: row.payment_method,
    dueOn,
    dueCustom: row.due_on !== null,
  };
}

/** Filtro PostgREST: o card pertence a [from, to) pelo mês de cobrança ou, sem ele, pela data. */
const inRange = (from: string, to: string) =>
  `and(billing_month.gte.${from},billing_month.lt.${to}),and(billing_month.is.null,post_date.gte.${from},post_date.lt.${to})`;

/**
 * Tudo que a tela Dinheiro mostra de um mês: quem recebeu, quem deve e o que
 * ficou pra trás. Sai direto dos cards do quadro de entregas — não depende de
 * "fechar o mês", que ninguém precisa fazer pra saber quanto entrou.
 */
export async function getMoneyMonth(
  month: string,
  clientScope: string[] | null
): Promise<MoneyMonth> {
  const supabase = getSupabaseServerClient();
  const from = monthKey(month);
  const hoje = iso(new Date());

  const clientsQuery = supabase
    .from("gallery_clients")
    .select("id, name, contact_name, phone, payment_day")
    .is("archived_at", null);
  const [columns, clientsResult] = await Promise.all([
    billableColumns(),
    clientScope ? clientsQuery.in("id", clientScope) : clientsQuery,
  ]);
  if (clientsResult.error) throw clientsResult.error;

  const clients = clientsResult.data ?? [];
  const paidByColumn = new Map(columns.map((c) => [c.id, c.paid]));
  const empty: MoneyMonth = {
    month: from,
    clients: [],
    paidCents: 0,
    openCents: 0,
    overdueCents: 0,
    monthOverdueCents: 0,
    elsewhere: [],
  };
  if (clients.length === 0 || columns.length === 0) return empty;

  const clientIds = clients.map((c) => c.id as string);
  const unpaidIds = columns.filter((c) => !c.paid).map((c) => c.id);
  // Só o mês aberto na tela + o que ainda está em aberto em qualquer mês.
  // Entrega paga de outro mês não entra: não muda nada aqui.
  const [monthResult, openResult] = await Promise.all([
    supabase
      .from("backlog_cards")
      .select(CARD_FIELDS)
      .in("client_id", clientIds)
      .in("column_id", [...paidByColumn.keys()])
      .or(inRange(from, nextMonthKey(from))),
    unpaidIds.length
      ? supabase
          .from("backlog_cards")
          .select(CARD_FIELDS)
          .in("client_id", clientIds)
          .in("column_id", unpaidIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (monthResult.error) throw monthResult.error;
  if (openResult.error) throw openResult.error;
  const seen = new Set<string>();
  const data = [...(monthResult.data ?? []), ...(openResult.data ?? [])].filter(
    (row) => !seen.has(row.id as string) && seen.add(row.id as string)
  );
  const cards = (data ?? []) as unknown as CardRow[];

  const byClient = new Map<string, MoneyClient>();
  for (const c of clients) {
    const paymentDay = (c.payment_day as number | null) ?? null;
    byClient.set(c.id as string, {
      id: c.id as string,
      name: c.name as string,
      contactName: (c.contact_name as string | null) ?? null,
      phone: (c.phone as string | null) ?? null,
      paymentDay,
      dueDate: dueOf(from, paymentDay),
      items: [],
      paidCents: 0,
      openCents: 0,
      status: "pago",
    });
  }

  const elsewhereMap = new Map<string, MoneyOpenElsewhere>();
  let overdueCents = 0;
  let monthOverdueCents = 0;

  for (const card of cards) {
    const m = cardMonth(card);
    const client = byClient.get(card.client_id);
    if (!m || !client) continue;
    const paid = paidByColumn.get(card.column_id) ?? false;
    const item = toItem(card, paid, effectiveDue(card, client.paymentDay));

    if (m === from) {
      client.items.push(item);
      client.paidCents += item.receivedCents;
      client.openCents += item.openCents;
    } else if (!paid && item.openCents > 0) {
      const due = item.dueOn;
      const key = `${client.id}|${m}`;
      const row = elsewhereMap.get(key) ?? {
        clientId: client.id,
        clientName: client.name,
        month: m,
        cents: 0,
        dueDate: due,
        overdue: false,
      };
      row.cents += item.openCents;
      if (due && (!row.dueDate || due < row.dueDate)) row.dueDate = due;
      // Atrasado é o que passou do vencimento; o resto do mês pode ainda estar no prazo.
      if (due && due < hoje) {
        row.overdue = true;
        row.overdueCents = (row.overdueCents ?? 0) + item.openCents;
      }
      elsewhereMap.set(key, row);
    }
  }

  const list = [...byClient.values()].filter((c) => c.items.length > 0);
  for (const c of list) {
    c.items.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
    const open = c.items.filter((i) => i.openCents > 0);
    // O vencimento do cliente é o mais próximo entre as entregas em aberto.
    const dues = open.map((i) => i.dueOn).filter((d): d is string => d !== null).sort();
    c.dueDate = dues[0] ?? c.dueDate;
    const lateCents = open
      .filter((i) => i.dueOn !== null && i.dueOn < hoje)
      .reduce((sum, i) => sum + i.openCents, 0);
    c.status = c.openCents === 0 ? "pago" : lateCents > 0 ? "atrasado" : "aberto";
    overdueCents += lateCents;
    monthOverdueCents += lateCents;
  }
  const rank = { atrasado: 0, aberto: 1, pago: 2 } as const;
  list.sort(
    (a, b) =>
      rank[a.status] - rank[b.status] ||
      b.openCents - a.openCents ||
      a.name.localeCompare(b.name)
  );

  const elsewhere = [...elsewhereMap.values()].sort((a, b) =>
    a.month.localeCompare(b.month)
  );
  for (const row of elsewhere) overdueCents += row.overdueCents ?? 0;

  return {
    month: from,
    clients: list,
    paidCents: list.reduce((s, c) => s + c.paidCents, 0),
    openCents: list.reduce((s, c) => s + c.openCents, 0),
    overdueCents,
    monthOverdueCents,
    elsewhere,
  };
}

/** Os 12 meses do ano: quanto já entrou e quanto ainda falta entrar. */
export async function getMoneyYear(
  year: number,
  clientScope: string[] | null,
  basis: "trabalho" | "pagamento" = "trabalho"
): Promise<MoneyYearMonth[]> {
  const supabase = getSupabaseServerClient();
  const months: MoneyYearMonth[] = Array.from({ length: 12 }, () => ({
    paidCents: 0,
    openCents: 0,
  }));
  const columns = await billableColumns();
  if (columns.length === 0) return months;
  const paidByColumn = new Map(columns.map((c) => [c.id, c.paid]));

  const from = `${year}-01-01`;
  const to = `${year + 1}-01-01`;
  // Só o ano pedido: pelo mês do trabalho, ou — no modo pagamento — também o
  // que foi pago dentro dele.
  const range =
    inRange(from, to) +
    (basis === "pagamento" ? `,and(paid_at.gte.${from},paid_at.lt.${to})` : "");
  const query = supabase
    .from("backlog_cards")
    .select(CARD_FIELDS)
    .in("column_id", [...paidByColumn.keys()])
    .not("client_id", "is", null)
    .or(range);
  const { data, error } = await (clientScope ? query.in("client_id", clientScope) : query);
  if (error) throw error;

  for (const card of (data ?? []) as unknown as CardRow[]) {
    const paid = paidByColumn.get(card.column_id) ?? false;
    const item = toItem(card, paid);
    // Pelo dia do pagamento só conta o que entrou, no mês em que entrou.
    const m =
      basis === "pagamento" && paid && card.paid_at ? monthKey(card.paid_at) : cardMonth(card);
    if (!m || Number(m.slice(0, 4)) !== year) continue;
    const slot = months[Number(m.slice(5, 7)) - 1];
    slot.paidCents += item.receivedCents;
    if (basis === "trabalho") slot.openCents += item.openCents;
  }
  return months;
}

/** Quanto cada cliente ainda deve, somando todos os meses, e se já passou do dia. */
export async function getOpenByClient(
  clientScope: string[] | null
): Promise<Record<string, { openCents: number; atrasado: boolean }>> {
  const supabase = getSupabaseServerClient();
  const hoje = iso(new Date());
  const columns = (await billableColumns()).filter((c) => !c.paid);
  const result: Record<string, { openCents: number; atrasado: boolean }> = {};
  if (columns.length === 0) return result;

  const query = supabase
    .from("backlog_cards")
    .select(CARD_FIELDS)
    .in("column_id", columns.map((c) => c.id))
    .not("client_id", "is", null);
  const [cards, clients] = await Promise.all([
    clientScope ? query.in("client_id", clientScope) : query,
    supabase.from("gallery_clients").select("id, payment_day"),
  ]);
  if (cards.error) throw cards.error;
  if (clients.error) throw clients.error;
  const days = new Map(
    (clients.data ?? []).map((c) => [c.id as string, (c.payment_day as number | null) ?? null])
  );

  for (const card of (cards.data ?? []) as unknown as CardRow[]) {
    const m = cardMonth(card);
    if (!m) continue;
    const cents = toItem(card, false).openCents;
    if (cents === 0) continue;
    const due = effectiveDue(card, days.get(card.client_id) ?? null);
    const slot = (result[card.client_id] ??= { openCents: 0, atrasado: false });
    slot.openCents += cents;
    if (due && due < hoje) slot.atrasado = true;
  }
  return result;
}

export interface TodayRow {
  clientId: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  month: string;
  cents: number;
  /** Vencimento (AAAA-MM-DD) ou data do recebimento, conforme a lista. */
  date: string | null;
}

export interface TodayView {
  late: TodayRow[];
  upcoming: TodayRow[];
  noDay: TodayRow[];
  received: TodayRow[];
}

/** O que pede atenção agora: atrasado, vence em 7 dias e o que entrou na semana. */
export async function getTodayView(
  clientScope: string[] | null,
  windowDays = 7
): Promise<TodayView> {
  const supabase = getSupabaseServerClient();
  const hoje = iso(new Date());
  const limite = new Date();
  limite.setDate(limite.getDate() + windowDays);
  const limiteIso = iso(limite);
  const desde = new Date();
  desde.setDate(desde.getDate() - windowDays);
  const desdeIso = iso(desde);

  const columns = await billableColumns();
  const view: TodayView = { late: [], upcoming: [], noDay: [], received: [] };
  if (columns.length === 0) return view;
  const paidByColumn = new Map(columns.map((c) => [c.id, c.paid]));

  const unpaidIds = columns.filter((c) => !c.paid).map((c) => c.id);
  const paidIds = columns.filter((c) => c.paid).map((c) => c.id);
  const base = () => {
    const q = supabase.from("backlog_cards").select(CARD_FIELDS).not("client_id", "is", null);
    return clientScope ? q.in("client_id", clientScope) : q;
  };
  const clientsQuery = supabase
    .from("gallery_clients")
    .select("id, name, contact_name, phone, payment_day")
    .is("archived_at", null);
  // Em aberto (qualquer mês) e pago na última semana: nada além disso.
  const [openCards, paidCards, clients] = await Promise.all([
    unpaidIds.length
      ? base().in("column_id", unpaidIds)
      : Promise.resolve({ data: [], error: null }),
    paidIds.length
      ? base().in("column_id", paidIds).gte("paid_at", desdeIso).lte("paid_at", hoje)
      : Promise.resolve({ data: [], error: null }),
    clientsQuery,
  ]);
  if (openCards.error) throw openCards.error;
  if (paidCards.error) throw paidCards.error;
  if (clients.error) throw clients.error;
  const cards = {
    data: [...(openCards.data ?? []), ...(paidCards.data ?? [])],
  };
  const byId = new Map((clients.data ?? []).map((c) => [c.id as string, c]));

  const rows = new Map<string, TodayRow & { list: keyof TodayView }>();
  for (const card of (cards.data ?? []) as unknown as CardRow[]) {
    const client = byId.get(card.client_id);
    const m = cardMonth(card);
    if (!client || !m) continue;
    const paid = paidByColumn.get(card.column_id) ?? false;
    const item = toItem(card, paid);
    const cents = paid ? item.totalCents : item.openCents;
    if (cents === 0) continue;

    let list: keyof TodayView;
    let date: string | null;
    if (paid) {
      if (!card.paid_at || card.paid_at < desdeIso) continue;
      list = "received";
      date = card.paid_at;
    } else {
      date = effectiveDue(card, (client.payment_day as number | null) ?? null);
      list = !date ? "noDay" : date < hoje ? "late" : date <= limiteIso ? "upcoming" : "noDay";
      if (date && date > limiteIso) continue;
    }
    const key = `${list}|${card.client_id}|${list === "received" ? "" : `${m}|${date}`}`;
    const row = rows.get(key) ?? {
      clientId: card.client_id,
      name: client.name as string,
      contactName: (client?.contact_name as string | null) ?? null,
      phone: (client?.phone as string | null) ?? null,
      month: m,
      cents: 0,
      date,
      list,
    };
    row.cents += cents;
    if (list === "received" && date && (!row.date || date > row.date)) row.date = date;
    rows.set(key, row);
  }
  for (const { list, ...row } of rows.values()) view[list].push(row);
  view.late.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  view.upcoming.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  view.received.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  view.noDay.sort((a, b) => b.cents - a.cents);
  return view;
}

/**
 * Quem pagou em cada mês (pelo dia em que o dinheiro entrou, igual ao gráfico
 * do Painel), do maior pro menor. A chave é o mês, "AAAA-MM-01". Serve pro cartão que abre sobre o gráfico.
 */
export async function getPaidByClient(
  months: string[],
  clientScope: string[] | null
): Promise<Record<string, { name: string; cents: number }[]>> {
  const result: Record<string, { name: string; cents: number }[]> = {};
  for (const m of months) result[m] = [];
  if (months.length === 0) return result;

  const supabase = getSupabaseServerClient();
  const sorted = [...months].sort();
  const columns = await billableColumns();
  if (columns.length === 0) return result;
  const paidByColumn = new Map(columns.map((c) => [c.id, c.paid]));

  const query = supabase
    .from("backlog_cards")
    .select(CARD_FIELDS)
    .in("column_id", [...paidByColumn.keys()])
    .not("client_id", "is", null)
    .or(
      inRange(sorted[0], nextMonthKey(sorted[sorted.length - 1])) +
        `,and(paid_at.gte.${sorted[0]},paid_at.lt.${nextMonthKey(sorted[sorted.length - 1])})`
    );
  const [cards, clients] = await Promise.all([
    clientScope ? query.in("client_id", clientScope) : query,
    supabase.from("gallery_clients").select("id, name"),
  ]);
  if (cards.error) throw cards.error;
  if (clients.error) throw clients.error;
  const names = new Map((clients.data ?? []).map((c) => [c.id as string, c.name as string]));

  const sums = new Map<string, Map<string, number>>();
  for (const card of (cards.data ?? []) as unknown as CardRow[]) {
    const paid = paidByColumn.get(card.column_id) ?? false;
    // Mesma regra do `getMoneyYear` no modo pagamento: o que está pago conta
    // no mês em que foi pago; um pagamento parcial, no mês do trabalho.
    const m = paid && card.paid_at ? monthKey(card.paid_at) : cardMonth(card);
    if (!m || !(m in result)) continue;
    const received = toItem(card, paid).receivedCents;
    if (received === 0) continue;
    const perClient = sums.get(m) ?? new Map<string, number>();
    perClient.set(card.client_id, (perClient.get(card.client_id) ?? 0) + received);
    sums.set(m, perClient);
  }
  for (const [m, perClient] of sums) {
    result[m] = [...perClient.entries()]
      .map(([id, cents]) => ({ name: names.get(id) ?? "Cliente", cents }))
      .sort((a, b) => b.cents - a.cents);
  }
  return result;
}

// ------------------------------------------------------------- pagamento

/**
 * "Recebi": leva o card pra coluna de dinheiro recebido do quadro e carimba
 * data e forma. É o mesmo efeito de arrastar o card no quadro de entregas.
 */
export async function markCardsPaid(
  cardIds: string[],
  method: PaymentMethod,
  paidAt: string
) {
  const columns = await billableColumns();
  const paidColumn = columns.find((c) => c.paid);
  if (!paidColumn) throw new Error("O quadro de entregas não tem coluna de pago.");
  for (const cardId of cardIds) {
    await setBacklogCardColumn({ cardId, columnId: paidColumn.id });
    await setBacklogCardPayment({ cardId, paidAt, paymentMethod: method });
    await setPartial(cardId, null);
  }
}

async function setPartial(cardId: string, cents: number | null) {
  const { error } = await getSupabaseServerClient()
    .from("backlog_cards")
    .update({ paid_cents: cents })
    .eq("id", cardId);
  if (error) throw error;
}

/**
 * "Recebi uma parte": soma ao que já entrou. Se com isso o total fecha, vira
 * pagamento completo (o card vai pra coluna de pago, como no "Recebi").
 */
export async function addPartialPayment(
  cardId: string,
  cents: number,
  method: PaymentMethod,
  paidAt: string
) {
  if (!(cents > 0)) throw new Error("Informe um valor maior que zero.");
  const { data, error } = await getSupabaseServerClient()
    .from("backlog_cards")
    .select(CARD_FIELDS)
    .eq("id", cardId)
    .single();
  if (error) throw error;
  const item = toItem(data as unknown as CardRow, false);
  if (cents >= item.openCents) {
    await markCardsPaid([cardId], method, paidAt);
    return;
  }
  await setPartial(cardId, item.receivedCents + cents);
}

/** Desfaz o "Recebi": volta o card pra coluna de espera e limpa o carimbo. */
export async function markCardsUnpaid(cardIds: string[]) {
  const columns = await billableColumns();
  const waiting = columns.find((c) => !c.paid);
  if (!waiting) throw new Error("O quadro de entregas não tem coluna de espera.");
  for (const cardId of cardIds) {
    await setBacklogCardColumn({ cardId, columnId: waiting.id });
    await setBacklogCardPayment({ cardId, paidAt: null, paymentMethod: null });
    await setPartial(cardId, null);
  }
}

/** Client_id de cada card — pra checar o escopo antes de mexer. */
export async function getCardClientIds(cardIds: string[]): Promise<string[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("backlog_cards")
    .select("client_id")
    .in("id", cardIds);
  if (error) throw error;
  return [...new Set((data ?? []).map((r) => r.client_id as string | null).filter((c): c is string => !!c))];
}

// --------------------------------------------------------------- edição

/** Corrige o que a entrega diz sobre dinheiro: nome, quantidade, valor e produto. */
export async function updateCardBilling(
  cardId: string,
  fields: {
    title: string;
    quantity: number;
    unitCents: number;
    customService: string;
    /** AAAA-MM-DD, ou null pra voltar ao vencimento automático. */
    dueOn: string | null;
  }
) {
  if (!Number.isInteger(fields.quantity) || fields.quantity < 1) {
    throw new Error("A quantidade precisa ser 1 ou mais.");
  }
  if (fields.unitCents < 0) throw new Error("O valor não pode ser negativo.");
  const { error } = await getSupabaseServerClient()
    .from("backlog_cards")
    .update({
      title: fields.title.trim(),
      quantity: fields.quantity,
      unit_price_cents: fields.unitCents,
      custom_service: fields.customService.trim() || null,
      due_on: fields.dueOn,
      updated_at: new Date().toISOString(),
    })
    .eq("id", cardId);
  if (error) throw error;
}

/** Muda o vencimento de várias entregas de uma vez. Null volta ao automático. */
export async function setCardsDue(cardIds: string[], dueOn: string | null) {
  const { error } = await getSupabaseServerClient()
    .from("backlog_cards")
    .update({ due_on: dueOn, updated_at: new Date().toISOString() })
    .in("id", cardIds);
  if (error) throw error;
}

/** Só os dados que a cobrança usa; o resto do cadastro fica em Clientes. */
export async function updateClientContact(
  clientId: string,
  fields: { paymentDay: number | null; phone: string; contactName: string }
) {
  if (fields.paymentDay !== null && !(fields.paymentDay >= 1 && fields.paymentDay <= 31)) {
    throw new Error("O dia de pagamento vai de 1 a 31.");
  }
  const { error } = await getSupabaseServerClient()
    .from("gallery_clients")
    .update({
      payment_day: fields.paymentDay,
      phone: fields.phone.trim() || null,
      contact_name: fields.contactName.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", clientId);
  if (error) throw error;
}

// ------------------------------------------------------------------ PDF

/** Relatório do mês montado na hora, no formato da nota — sem precisar fechar. */
export async function getLiveInvoice(
  clientId: string,
  month: string,
  clientScope: string[] | null
): Promise<MonthlyInvoiceWithItems | null> {
  const data = await getMoneyMonth(month, clientScope);
  const client = data.clients.find((c) => c.id === clientId);
  if (!client) return null;
  const key = monthKey(month);
  return {
    id: `${clientId}-${key}`,
    client_id: clientId,
    month: key,
    total_cents: client.paidCents + client.openCents,
    notes: "",
    closed_at: new Date().toISOString(),
    closed_by: null,
    client_name: client.name,
    items: client.items.map((item, index) => ({
      id: item.cardId,
      invoice_id: `${clientId}-${key}`,
      card_id: item.cardId,
      description: item.serviceName
        ? `${item.serviceName} — ${item.title}`
        : item.title,
      quantity: item.quantity,
      unit_price_cents: item.unitCents,
      position: index,
      paid: item.paid,
      paid_at: item.paidAt,
      payment_method: item.method,
    })),
  };
}

// ------------------------------------------------- caixa (a receber / recebido)

export interface ReceivableRow {
  clientId: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  month: string;
  cents: number;
  /** Vencimento AAAA-MM-DD, ou null quando o cliente não tem dia combinado. */
  due: string | null;
  cardIds: string[];
}

/**
 * Tudo que ainda falta entrar, de qualquer mês, uma linha por cliente + mês +
 * vencimento. É a lista do "A receber" e a base da projeção do caixa.
 */
export async function getReceivables(clientScope: string[] | null): Promise<ReceivableRow[]> {
  const unpaidIds = (await billableColumns()).filter((c) => !c.paid).map((c) => c.id);
  return receivablesIn(unpaidIds, clientScope);
}

/**
 * Entregas com valor que ainda estão em produção (colunas antes da cobrança).
 * Não vão para a lista do A receber, mas a projeção do caixa conta com elas
 * na data em que o cliente deve pagar.
 */
export async function getPipelineReceivables(clientScope: string[] | null): Promise<ReceivableRow[]> {
  const { data, error } = await getSupabaseServerClient()
    .from("backlog_columns")
    .select("id")
    .eq("board", "entregas")
    .eq("billable", false);
  if (error) throw error;
  return receivablesIn((data ?? []).map((c) => c.id as string), clientScope);
}

async function receivablesIn(unpaidIds: string[], clientScope: string[] | null): Promise<ReceivableRow[]> {
  const supabase = getSupabaseServerClient();
  if (unpaidIds.length === 0) return [];
  const cards = supabase
    .from("backlog_cards")
    .select(CARD_FIELDS)
    .in("column_id", unpaidIds);
  const clientsQuery = supabase
    .from("gallery_clients")
    .select("id, name, contact_name, phone, payment_day")
    .is("archived_at", null);
  const [cardsResult, clientsResult] = await Promise.all([
    clientScope ? cards.in("client_id", clientScope) : cards,
    clientScope ? clientsQuery.in("id", clientScope) : clientsQuery,
  ]);
  if (cardsResult.error) throw cardsResult.error;
  if (clientsResult.error) throw clientsResult.error;
  const byId = new Map((clientsResult.data ?? []).map((c) => [c.id as string, c]));

  const rows = new Map<string, ReceivableRow>();
  for (const card of (cardsResult.data ?? []) as unknown as CardRow[]) {
    // Sem cliente: entra pelo título do card, uma linha por entrega.
    const client = card.client_id ? byId.get(card.client_id) : null;
    const m = cardMonth(card);
    if ((card.client_id && !client) || !m) continue;
    const cents = toItem(card, false).openCents;
    if (cents === 0) continue;
    const due = effectiveDue(card, (client?.payment_day as number | null) ?? null);
    const key = client ? `${card.client_id}|${m}|${due ?? ""}` : `card|${card.id}`;
    const row = rows.get(key) ?? {
      clientId: card.client_id ?? "",
      name: client ? (client.name as string) : `${card.title || "Entrega"} (sem cliente)`,
      contactName: (client?.contact_name as string | null) ?? null,
      phone: (client?.phone as string | null) ?? null,
      month: m,
      cents: 0,
      due,
      cardIds: [],
    };
    row.cents += cents;
    row.cardIds.push(card.id);
    rows.set(key, row);
  }
  return [...rows.values()].sort(
    (a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999") || b.cents - a.cents
  );
}

export interface ReceivedRow {
  /** Uma linha por entrega: é o que dá para corrigir. */
  cardId: string;
  clientId: string;
  name: string;
  title: string;
  /** Dia em que o dinheiro entrou. */
  date: string;
  cents: number;
  method: string | null;
}

/**
 * O que entrou (pelo dia do pagamento) com `de <= dia < ate`, entrega por
 * entrega. Pagamento parcial não tem data, então só aparece aqui quando a
 * entrega fecha.
 */
export async function getReceived(
  de: string,
  ate: string,
  clientScope: string[] | null
): Promise<ReceivedRow[]> {
  const supabase = getSupabaseServerClient();
  const paidIds = (await billableColumns()).filter((c) => c.paid).map((c) => c.id);
  if (paidIds.length === 0) return [];
  const query = supabase
    .from("backlog_cards")
    .select(CARD_FIELDS)
    .in("column_id", paidIds)
    .not("client_id", "is", null)
    .gte("paid_at", de)
    .lt("paid_at", ate);
  const [cards, clients] = await Promise.all([
    clientScope ? query.in("client_id", clientScope) : query,
    supabase.from("gallery_clients").select("id, name"),
  ]);
  if (cards.error) throw cards.error;
  if (clients.error) throw clients.error;
  const names = new Map((clients.data ?? []).map((c) => [c.id as string, c.name as string]));

  const rows: ReceivedRow[] = [];
  for (const card of (cards.data ?? []) as unknown as CardRow[]) {
    if (!card.paid_at) continue;
    rows.push({
      cardId: card.id,
      clientId: card.client_id,
      name: names.get(card.client_id) ?? "Cliente",
      title: card.title ?? "",
      date: card.paid_at,
      cents: toItem(card, true).totalCents,
      method: card.payment_method,
    });
  }
  return rows.sort((x, y) => y.date.localeCompare(x.date) || y.cents - x.cents);
}

/** Corrige um recebimento: quanto foi, em que dia e como. */
export async function updateReceived(
  cardId: string,
  fields: { totalCents: number; paidAt: string; method: PaymentMethod }
) {
  if (!(fields.totalCents > 0)) throw new Error("Informe um valor maior que zero.");
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("backlog_cards").select("quantity").eq("id", cardId).single();
  if (error) throw error;
  const quantity = (data.quantity as number | null) ?? 1;
  // Mantém a quantidade quando o total divide certo; senão vira uma entrega de valor único.
  const keep = fields.totalCents % quantity === 0;
  const { error: upError } = await supabase
    .from("backlog_cards")
    .update({
      quantity: keep ? quantity : 1,
      unit_price_cents: keep ? fields.totalCents / quantity : fields.totalCents,
    })
    .eq("id", cardId);
  if (upError) throw upError;
  await setBacklogCardPayment({ cardId, paidAt: fields.paidAt, paymentMethod: fields.method });
}

/**
 * Quanto entrou depois da conferência do saldo: pagamentos de dia posterior
 * e os do mesmo dia que foram marcados depois da hora conferida.
 */
export async function getReceivedAfter(cashOn: string, cashAt: string): Promise<number> {
  const paidIds = (await billableColumns()).filter((c) => c.paid).map((c) => c.id);
  if (paidIds.length === 0) return 0;
  const { data, error } = await getSupabaseServerClient()
    .from("backlog_cards")
    .select(CARD_FIELDS)
    .in("column_id", paidIds)
    .not("client_id", "is", null)
    .or(`paid_at.gt.${cashOn},and(paid_at.eq.${cashOn},updated_at.gt.${cashAt})`);
  if (error) throw error;
  return ((data ?? []) as unknown as CardRow[]).reduce((s, card) => s + toItem(card, true).totalCents, 0);
}

/** O que cada cliente já pagou desde o dia 1 do mês de `dia` (AAAA-MM-DD), por id de cliente. */
export async function getPagoNoMes(dia: string): Promise<Map<string, number>> {
  const paidIds = (await billableColumns()).filter((c) => c.paid).map((c) => c.id);
  const porCliente = new Map<string, number>();
  if (paidIds.length === 0) return porCliente;
  const { data, error } = await getSupabaseServerClient()
    .from("backlog_cards")
    .select(CARD_FIELDS)
    .in("column_id", paidIds)
    .not("client_id", "is", null)
    .gte("paid_at", monthKey(dia));
  if (error) throw error;
  for (const card of (data ?? []) as unknown as CardRow[]) {
    porCliente.set(card.client_id, (porCliente.get(card.client_id) ?? 0) + toItem(card, true).totalCents);
  }
  return porCliente;
}

export interface ClientMoney {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  paymentDay: number | null;
  /** Tudo que o cliente já tem de entrega com valor, de qualquer mês. */
  items: MoneyItem[];
  receivedCents: number;
  openCents: number;
  overdueCents: number;
}

/** O financeiro de um cliente inteiro, sem recorte de mês. Null se o cliente não existe. */
export async function getClientMoney(clientId: string): Promise<ClientMoney | null> {
  const supabase = getSupabaseServerClient();
  const [clientResult, columns] = await Promise.all([
    supabase
      .from("gallery_clients")
      .select("id, name, contact_name, phone, payment_day")
      .eq("id", clientId)
      .maybeSingle(),
    billableColumns(),
  ]);
  if (clientResult.error) throw clientResult.error;
  const client = clientResult.data;
  if (!client) return null;
  const paidByColumn = new Map(columns.map((c) => [c.id, c.paid]));
  const paymentDay = (client.payment_day as number | null) ?? null;
  const result: ClientMoney = {
    id: client.id as string,
    name: client.name as string,
    contactName: (client.contact_name as string | null) ?? null,
    phone: (client.phone as string | null) ?? null,
    paymentDay,
    items: [],
    receivedCents: 0,
    openCents: 0,
    overdueCents: 0,
  };
  if (columns.length === 0) return result;

  const { data, error } = await supabase
    .from("backlog_cards")
    .select(CARD_FIELDS)
    .eq("client_id", clientId)
    .in("column_id", [...paidByColumn.keys()]);
  if (error) throw error;
  const hoje = iso(new Date());
  for (const card of (data ?? []) as unknown as CardRow[]) {
    const item = toItem(card, paidByColumn.get(card.column_id) ?? false, effectiveDue(card, paymentDay));
    if (item.totalCents === 0) continue;
    result.items.push(item);
    result.receivedCents += item.receivedCents;
    result.openCents += item.openCents;
    if (item.openCents > 0 && item.dueOn && item.dueOn < hoje) result.overdueCents += item.openCents;
  }
  result.items.sort((a, b) => (a.dueOn ?? "9999").localeCompare(b.dueOn ?? "9999"));
  return result;
}
