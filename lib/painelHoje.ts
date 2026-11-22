import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { BacklogFormat } from "@/lib/backlogTypes";
import { addDays } from "@/lib/painelHojeText";
import { todayISO } from "@/lib/prospectTypes";

/** Entrega atrasada mais velha que isto sai da fila: depois de um mês, vira
 *  coluna esquecida do kanban, não atraso — e puxar o histórico inteiro do
 *  banco todo dia custaria mais do que ajuda. */
const LATE_LOOKBACK_DAYS = 30;

/** Raia da semana: `clientes` é o quadro `entregas`, `tatu` é o `instagram`.
 *  Dois quadros diferentes — a tela nunca mistura os dois numa lista só. */
export type Lane = "clientes" | "tatu";

export interface WeekItem {
  id: string;
  title: string;
  lane: Lane;
  format: BacklogFormat;
  date: string;
  time: string | null;
  clientName: string | null;
}

export interface LateDelivery {
  id: string;
  title: string;
  date: string;
  clientName: string | null;
}

interface ColumnRef {
  board: "instagram" | "entregas";
  billable: boolean;
}

/**
 * Cards com data de hoje até daqui a seis dias (a semana) e as entregas de
 * cliente que ficaram pra trás.
 *
 * Entrega em coluna faturável já foi concluída: não é "pela frente" nem
 * atraso. No quadro da Tatu não existe esse sinal (o nome das colunas é
 * editável), então ali a semana mostra tudo que tem data, como o Painel
 * antigo fazia.
 */
export async function getPainelCards(clientScope: string[] | null = null) {
  const today = todayISO();
  const supabase = getSupabaseServerClient();

  const [cardsResult, clientsResult] = await Promise.all([
    supabase
      .from("backlog_cards")
      .select(
        "id, title, format, post_date, post_time, client_id, backlog_columns(board, billable)"
      )
      .gte("post_date", addDays(today, -LATE_LOOKBACK_DAYS))
      .lte("post_date", addDays(today, 6))
      .order("post_date")
      .order("post_time", { nullsFirst: false }),
    supabase.from("gallery_clients").select("id, name"),
  ]);

  if (cardsResult.error) throw cardsResult.error;
  if (clientsResult.error) throw clientsResult.error;

  const clientName = new Map(
    (clientsResult.data ?? []).map((client) => [
      client.id as string,
      client.name as string,
    ])
  );

  const week: WeekItem[] = [];
  const late: LateDelivery[] = [];

  for (const card of cardsResult.data ?? []) {
    const clientId = card.client_id as string | null;
    // Sem cliente é do backlog do Instagram, que não é restrito por cliente.
    if (clientScope !== null && clientId !== null && !clientScope.includes(clientId)) {
      continue;
    }

    const rel = card.backlog_columns as unknown as ColumnRef | ColumnRef[] | null;
    const column = Array.isArray(rel) ? rel[0] : rel;
    if (!column) continue;

    const date = card.post_date as string;
    const name = clientId ? (clientName.get(clientId) ?? null) : null;

    if (column.board === "entregas") {
      if (column.billable) continue;
      if (date < today) {
        late.push({ id: card.id as string, title: card.title as string, date, clientName: name });
        continue;
      }
    } else if (date < today) {
      continue;
    }

    week.push({
      id: card.id as string,
      title: card.title as string,
      lane: column.board === "entregas" ? "clientes" : "tatu",
      format: card.format as BacklogFormat,
      date,
      time: ((card.post_time as string | null) ?? null)?.slice(0, 5) ?? null,
      clientName: name,
    });
  }

  return { today, week, late };
}
