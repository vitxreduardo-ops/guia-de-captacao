import { NextResponse } from "next/server";
import {
  containerState,
  finishPublish,
  refreshExpiringTokens,
  startPublish,
} from "@/lib/instagram";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Publicador do Instagram (a cada ~10 min). Dois passos por card, pra nunca
 * esperar vídeo processar dentro da requisição:
 *   agendado   → cria o container       → publicando
 *   publicando → container pronto?      → publicado (ou falhou)
 * Sem retry automático: erro vira 'falhou' com a mensagem em ig_error.
 */
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    // `segredoConfigurado` separa "a variável não chegou a este deploy" de
    // "o valor enviado é outro", sem expor o segredo.
    return NextResponse.json(
      { error: "Não autorizado", segredoConfigurado: Boolean(secret) },
      { status: 401 }
    );
  }

  const supabase = getSupabaseServerClient();
  const { data: cards, error } = await supabase
    .from("backlog_cards")
    .select(
      "id, client_id, format, caption, ig_publish_at, ig_status, ig_media_urls, ig_container_id"
    )
    .in("ig_status", ["agendado", "publicando"])
    .not("client_id", "is", null)
    .not("ig_publish_at", "is", null);
  if (error) {
    console.error("Falha ao buscar posts do Instagram", error);
    return NextResponse.json({ error: "Falha na consulta" }, { status: 500 });
  }

  const fail = (id: string, err: unknown) =>
    supabase
      .from("backlog_cards")
      .update({
        ig_status: "falhou",
        ig_error: err instanceof Error ? err.message : String(err),
      })
      .eq("id", id);

  const result = { criados: 0, publicados: 0, falhas: 0 };
  for (const card of cards ?? []) {
    const { data: account } = await supabase
      .from("instagram_accounts")
      .select("ig_user_id, access_token")
      .eq("client_id", card.client_id)
      .maybeSingle();

    try {
      if (!account) throw new Error("Cliente sem Instagram conectado.");

      if (card.ig_status === "agendado") {
        if (new Date(card.ig_publish_at as string) > new Date()) continue;
        // Reivindica o card: se duas execuções se sobrepõem, só uma passa.
        const { data: claimed } = await supabase
          .from("backlog_cards")
          .update({ ig_status: "publicando", ig_error: null })
          .eq("id", card.id)
          .eq("ig_status", "agendado")
          .select("id");
        if (!claimed?.length) continue;
        try {
          const containerId = await startPublish(account as never, {
            format: card.format as string,
            urls: card.ig_media_urls as string[],
            caption: card.caption as string,
          });
          await supabase
            .from("backlog_cards")
            .update({ ig_container_id: containerId })
            .eq("id", card.id);
          result.criados += 1;
        } catch (err) {
          await fail(card.id as string, err);
          result.falhas += 1;
        }
        continue;
      }

      // publicando
      if (!card.ig_container_id) continue; // reivindicado agora há pouco
      const state = await containerState(
        card.ig_container_id as string,
        (account as { access_token: string }).access_token
      );
      if (state === "processando") continue;
      if (state === "erro") throw new Error("Instagram recusou a mídia (container em erro).");
      const mediaId = await finishPublish(account as never, card.ig_container_id as string);
      await supabase
        .from("backlog_cards")
        .update({ ig_status: "publicado", ig_media_id: mediaId, ig_error: null })
        .eq("id", card.id);
      result.publicados += 1;
    } catch (err) {
      await fail(card.id as string, err);
      result.falhas += 1;
    }
  }

  const tokensComFalha = await refreshExpiringTokens();
  return NextResponse.json({ ...result, tokensComFalha });
}
