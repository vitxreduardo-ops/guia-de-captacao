import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { BacklogFormat } from "@/lib/backlogTypes";

/** Quantos dias depois de hoje a janela alcança. */
export const UPCOMING_DAYS_AHEAD = 3;

export interface UpcomingPost {
  id: string;
  title: string;
  format: BacklogFormat;
  post_date: string;
  post_time: string | null;
  client_name: string | null;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

/**
 * Dia em ISO a partir de hoje. Usa data local de propósito: "hoje" é o dia de
 * quem está olhando a tela, não o do UTC.
 */
export function isoDayFromToday(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Materiais agendados de hoje até hoje + UPCOMING_DAYS_AHEAD.
 *
 * Não filtra por coluna: o nome das colunas é editável pelo admin, então não
 * existe jeito confiável de saber que um card já foi publicado. A janela mostra
 * tudo que tem data marcada nela.
 */
export async function listUpcomingPosts(): Promise<UpcomingPost[]> {
  const supabase = getSupabaseServerClient();

  const [cardsResult, clientsResult] = await Promise.all([
    supabase
      .from("backlog_cards")
      .select("id, title, format, post_date, post_time, client_id")
      .gte("post_date", isoDayFromToday())
      .lte("post_date", isoDayFromToday(UPCOMING_DAYS_AHEAD))
      .order("post_date")
      // Com horário primeiro; o que não tem hora marcada fecha o dia.
      .order("post_time", { nullsFirst: false }),
    supabase.from("gallery_clients").select("id, name"),
  ]);

  if (cardsResult.error) throw cardsResult.error;
  if (clientsResult.error) throw clientsResult.error;

  const clientNameById = new Map(
    (clientsResult.data ?? []).map((client) => [
      client.id as string,
      client.name as string,
    ])
  );

  return (cardsResult.data ?? []).map((card) => ({
    id: card.id as string,
    title: card.title as string,
    format: card.format as BacklogFormat,
    post_date: card.post_date as string,
    post_time: (card.post_time as string | null) ?? null,
    client_name: card.client_id
      ? clientNameById.get(card.client_id as string) ?? null
      : null,
  }));
}
