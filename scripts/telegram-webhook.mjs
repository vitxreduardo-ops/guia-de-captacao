// Registra o webhook do bot no Telegram. Rodar uma vez depois do deploy
// (e de novo se o domínio ou o segredo mudarem):
//
//   node --env-file=.env.local scripts/telegram-webhook.mjs https://sistema.tatuestudio.com.br
//
// Lê TELEGRAM_BOT_TOKEN e TELEGRAM_WEBHOOK_SECRET do ambiente; não imprime
// nenhum dos dois.
const base = process.argv[2];
const { TELEGRAM_BOT_TOKEN: token, TELEGRAM_WEBHOOK_SECRET: secret } = process.env;
if (!base || !token || !secret) {
  console.error("Uso: node --env-file=.env.local scripts/telegram-webhook.mjs <https://domínio>");
  console.error("Precisa de TELEGRAM_BOT_TOKEN e TELEGRAM_WEBHOOK_SECRET no ambiente.");
  process.exit(1);
}
const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    url: `${base.replace(/\/$/, "")}/api/telegram/webhook`,
    secret_token: secret,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
  }),
});
const json = await res.json();
console.log(json.ok ? "Webhook registrado." : `Falhou: ${json.description}`);
