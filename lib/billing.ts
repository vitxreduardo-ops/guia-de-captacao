import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  monthKey,
  nextMonthKey,
  parseBRLToCents,
  sumCents,
  type MonthDelivery,
  type MonthlyInvoice,
  type MonthlyInvoiceItem,
  type MonthlyInvoiceWithItems,
  type Service,
} from "@/lib/billingTypes";

export type {
  MonthDelivery,
  MonthlyInvoice,
  MonthlyInvoiceItem,
  MonthlyInvoiceWithItems,
  Service,
};

// -------------------------------------------------------------- catálogo

export async function listServices(): Promise<Service[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .order("position");
  if (error) throw error;
  return (data ?? []) as Service[];
}

export async function createService(fields: { name: string; price: unknown }) {
  const supabase = getSupabaseServerClient();

  const { data: last, error: lastError } = await supabase
    .from("services")
    .select("position")
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastError) throw lastError;

  const { error } = await supabase.from("services").insert({
    name: fields.name.trim() || "Novo serviço",
    price_cents: parseBRLToCents(fields.price),
    position: (last?.position ?? -1) + 1,
  });
  if (error) throw error;
}

export async function updateService(
  id: string,
  fields: { name?: string; price?: unknown; active?: boolean }
) {
  const supabase = getSupabaseServerClient();
  const patch: Record<string, string | number | boolean> = {
    updated_at: new Date().toISOString(),
  };
  if (fields.name !== undefined) patch.name = fields.name.trim() || "Sem nome";
  if (fields.price !== undefined) patch.price_cents = parseBRLToCents(fields.price);
  if (fields.active !== undefined) patch.active = fields.active;

  const { error } = await supabase.from("services").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteService(id: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("services").delete().eq("id", id);
  if (error) throw error;
}

// ------------------------------------------------------------- entregas

/**
 * O que o cliente recebeu no mês: cards do quadro de entregas que já estão numa
 * coluna marcada como entregue, com `post_date` dentro do mês. A data do card é
 * a competência — no quadro de entregas ela é lida como "data da entrega".
 */
export async function getMonthDeliveries(
  clientId: string,
  month: string
): Promise<MonthDelivery[]> {
  const supabase = getSupabaseServerClient();
  const from = monthKey(month);
  const to = nextMonthKey(from);

  // Toda coluna faturável entra: a entrega feita já é da nota do mês, paga ou
  // não. A coluna diz qual das duas.
  const { data: columns, error: columnsError } = await supabase
    .from("backlog_columns")
    .select("id, paid")
    .eq("board", "entregas")
    .eq("billable", true);
  if (columnsError) throw columnsError;

  const paidByColumn = new Map(
    (columns ?? []).map((column) => [column.id as string, Boolean(column.paid)])
  );
  const columnIds = [...paidByColumn.keys()];
  if (columnIds.length === 0) return [];

  const { data, error } = await supabase
    .from("backlog_cards")
    .select(
      "id, column_id, title, post_date, quantity, unit_price_cents, paid_at, payment_method, services(name)"
    )
    .eq("client_id", clientId)
    .in("column_id", columnIds)
    .gte("post_date", from)
    .lt("post_date", to)
    .order("post_date");
  if (error) throw error;

  return (data ?? []).map((row) => {
    // O join do PostgREST vem como objeto ou array dependendo da cardinalidade
    // inferida, então normaliza os dois casos.
    const service = row.services as { name: string } | { name: string }[] | null;
    const serviceName = Array.isArray(service) ? service[0]?.name : service?.name;
    return {
      card_id: row.id as string,
      title: (row.title as string) ?? "",
      service_name: serviceName ?? null,
      post_date: (row.post_date as string | null) ?? null,
      quantity: (row.quantity as number) ?? 1,
      unit_price_cents: (row.unit_price_cents as number | null) ?? 0,
      paid: paidByColumn.get(row.column_id as string) ?? false,
      paid_at: (row.paid_at as string | null) ?? null,
      payment_method: (row.payment_method as string | null) ?? null,
    } satisfies MonthDelivery;
  });
}

// ----------------------------------------------------------- fechamento

/**
 * Congela o mês: copia as entregas para a nota. Os itens são cópias, não
 * referências — depois disso, editar ou apagar um card não mexe mais no valor
 * já fechado. Refechar o mesmo mês substitui o snapshot inteiro.
 */
export async function closeMonth(params: {
  clientId: string;
  month: string;
  notes: string;
  userId: string | null;
}): Promise<string> {
  const supabase = getSupabaseServerClient();
  const month = monthKey(params.month);
  const deliveries = await getMonthDeliveries(params.clientId, month);

  const { data: invoice, error } = await supabase
    .from("monthly_invoices")
    .upsert(
      {
        client_id: params.clientId,
        month,
        total_cents: sumCents(deliveries),
        notes: params.notes.trim(),
        closed_at: new Date().toISOString(),
        closed_by: params.userId,
      },
      { onConflict: "client_id,month" }
    )
    .select("id")
    .single();
  if (error) throw error;

  const invoiceId = invoice.id as string;

  const { error: clearError } = await supabase
    .from("monthly_invoice_items")
    .delete()
    .eq("invoice_id", invoiceId);
  if (clearError) throw clearError;

  if (deliveries.length > 0) {
    const { error: itemsError } = await supabase
      .from("monthly_invoice_items")
      .insert(
        deliveries.map((delivery, index) => ({
          invoice_id: invoiceId,
          card_id: delivery.card_id,
          description: delivery.service_name
            ? `${delivery.service_name} — ${delivery.title}`
            : delivery.title,
          quantity: delivery.quantity,
          unit_price_cents: delivery.unit_price_cents,
          position: index,
          paid: delivery.paid,
          paid_at: delivery.paid_at,
          payment_method: delivery.payment_method,
        }))
      );
    if (itemsError) throw itemsError;
  }

  return invoiceId;
}

export async function getInvoice(
  clientId: string,
  month: string
): Promise<MonthlyInvoiceWithItems | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("monthly_invoices")
    .select("*, gallery_clients(name), monthly_invoice_items(*)")
    .eq("client_id", clientId)
    .eq("month", monthKey(month))
    .maybeSingle();
  if (error) throw error;
  return data ? toInvoiceWithItems(data) : null;
}

export async function listInvoices(limit = 24): Promise<MonthlyInvoiceWithItems[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("monthly_invoices")
    .select("*, gallery_clients(name), monthly_invoice_items(*)")
    .order("month", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(toInvoiceWithItems);
}

/** Reabre o mês apagando o snapshot; o total volta a seguir o quadro. */
export async function reopenInvoice(id: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("monthly_invoices").delete().eq("id", id);
  if (error) throw error;
}

function toInvoiceWithItems(row: Record<string, unknown>): MonthlyInvoiceWithItems {
  const client = row.gallery_clients as { name: string } | { name: string }[] | null;
  const clientName = Array.isArray(client) ? client[0]?.name : client?.name;
  const items = ((row.monthly_invoice_items ?? []) as MonthlyInvoiceItem[])
    .slice()
    .sort((a, b) => a.position - b.position);

  return {
    id: row.id as string,
    client_id: row.client_id as string,
    month: row.month as string,
    total_cents: (row.total_cents as number) ?? 0,
    notes: (row.notes as string) ?? "",
    closed_at: row.closed_at as string,
    closed_by: (row.closed_by as string | null) ?? null,
    client_name: clientName ?? "Cliente",
    items,
  };
}

// ------------------------------------------------------------ ano / resumo

export interface YearClientTotals {
  clientId: string;
  clientName: string;
  /** Fechado por mês (índice 0 = janeiro), em centavos. */
  byMonth: number[];
  totalCents: number;
  deliveries: number;
}

/**
 * Consolidado do ano por cliente. O dinheiro vem das notas fechadas (o valor
 * que de fato foi cobrado), e a contagem de entregas vem do quadro — meses
 * ainda abertos aparecem no número de entregas mas não no total faturado.
 */
export async function getYearTotals(year: number): Promise<YearClientTotals[]> {
  const supabase = getSupabaseServerClient();
  const from = `${year}-01-01`;
  const to = `${year + 1}-01-01`;

  const [clientsResult, invoicesResult, columnsResult] = await Promise.all([
    supabase.from("gallery_clients").select("id, name").order("name"),
    supabase
      .from("monthly_invoices")
      .select("client_id, month, total_cents")
      .gte("month", from)
      .lt("month", to),
    supabase
      .from("backlog_columns")
      .select("id")
      .eq("board", "entregas")
      .eq("billable", true),
  ]);

  if (clientsResult.error) throw clientsResult.error;
  if (invoicesResult.error) throw invoicesResult.error;
  if (columnsResult.error) throw columnsResult.error;

  const columnIds = (columnsResult.data ?? []).map((column) => column.id as string);
  const cardsResult = columnIds.length
    ? await supabase
        .from("backlog_cards")
        .select("client_id")
        .in("column_id", columnIds)
        .gte("post_date", from)
        .lt("post_date", to)
    : { data: [], error: null };
  if (cardsResult.error) throw cardsResult.error;

  const totals = new Map<string, YearClientTotals>(
    (clientsResult.data ?? []).map((client) => [
      client.id as string,
      {
        clientId: client.id as string,
        clientName: client.name as string,
        byMonth: Array(12).fill(0),
        totalCents: 0,
        deliveries: 0,
      },
    ])
  );

  for (const invoice of invoicesResult.data ?? []) {
    const row = totals.get(invoice.client_id as string);
    if (!row) continue;
    const index = Number(String(invoice.month).slice(5, 7)) - 1;
    row.byMonth[index] += (invoice.total_cents as number) ?? 0;
    row.totalCents += (invoice.total_cents as number) ?? 0;
  }

  for (const card of cardsResult.data ?? []) {
    const row = totals.get(card.client_id as string);
    if (row) row.deliveries += 1;
  }

  return [...totals.values()];
}

/** Anos que já têm nota fechada, do mais novo pro mais velho. */
export async function listInvoiceYears(): Promise<number[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("monthly_invoices")
    .select("month")
    .order("month", { ascending: false });
  if (error) throw error;

  const years = new Set<number>((data ?? []).map((row) => Number(String(row.month).slice(0, 4))));
  years.add(new Date().getFullYear());
  return [...years].sort((a, b) => b - a);
}
