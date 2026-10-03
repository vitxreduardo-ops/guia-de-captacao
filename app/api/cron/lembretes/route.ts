import { NextResponse } from "next/server";
import { notifyClientUsers } from "@/lib/clientPush";
import { tomorrowISO } from "@/lib/editorialMonths";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Lembrete diário (cron da Vercel, 09:00 de Brasília): avisa o cliente de
 * cada postagem marcada para amanhã que ele já enxerga no portal. A Vercel
 * manda `Authorization: Bearer $CRON_SECRET`; sem o segredo configurado, a
 * rota recusa tudo.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("backlog_cards")
    .select("client_id, title, column:backlog_columns!inner(client_visible)")
    .eq("post_date", tomorrowISO())
    .not("client_id", "is", null)
    .eq("column.client_visible", true);
  if (error) {
    console.error("Falha ao buscar postagens de amanhã", error);
    return NextResponse.json({ error: "Falha na consulta" }, { status: 500 });
  }

  await Promise.all(
    (data ?? []).map((card) =>
      notifyClientUsers(card.client_id as string, {
        title: "Postagem amanhã",
        body: card.title as string,
        url: "/cliente/calendario",
      })
    )
  );
  return NextResponse.json({ avisos: data?.length ?? 0 });
}
