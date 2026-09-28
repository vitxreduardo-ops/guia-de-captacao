import "server-only";
import webpush from "web-push";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type PushSubscriptionJSON = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

/**
 * Sem as três chaves o push fica desligado em silêncio: a campainha continua
 * funcionando, só não chega nada no celular.
 */
function configured() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

/** O endpoint é único: reinscrever o mesmo aparelho só troca o dono/chaves. */
export async function savePushSubscription(
  userId: string,
  sub: PushSubscriptionJSON
) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
    { onConflict: "endpoint" }
  );
  if (error) throw error;
}

export async function deletePushSubscription(userId: string, endpoint: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", userId)
    .eq("endpoint", endpoint);
  if (error) throw error;
}

/**
 * Manda pra todos os aparelhos da pessoa. Endpoint que responde 404/410 é
 * aparelho que desinstalou o app ou revogou a permissão — sai da tabela pra
 * não ser tentado de novo a cada notificação.
 */
export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url: string }
) {
  if (!configured()) return;

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);
  if (error) throw error;

  const body = JSON.stringify(payload);
  await Promise.all(
    (data ?? []).map(async (row) => {
      try {
        await webpush.sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
          body
        );
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", row.endpoint);
        } else {
          console.error("Falha ao enviar push", status, err);
        }
      }
    })
  );
}
