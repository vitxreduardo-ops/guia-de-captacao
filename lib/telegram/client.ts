import "server-only";

/**
 * Chamada crua à Bot API. O token vai na URL, então nada aqui loga a URL nem
 * o corpo: só o método e a descrição de erro que o Telegram devolve.
 */
export async function telegram<T = unknown>(
  method: string,
  body: Record<string, unknown>
): Promise<T> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN não configurado.");
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => null)) as
    | { ok: boolean; result?: T; description?: string }
    | null;
  if (!json?.ok) {
    throw new Error(`Telegram ${method}: ${json?.description ?? res.status}`);
  }
  return json.result as T;
}
