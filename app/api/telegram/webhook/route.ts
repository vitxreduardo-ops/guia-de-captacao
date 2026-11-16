import { timingSafeEqual } from "node:crypto";
import { after } from "next/server";
import { claimUpdate } from "@/lib/telegram/identity";
import { handleUpdate, type TelegramUpdate } from "@/lib/telegram/handler";
import { telegramDeps } from "@/lib/telegram/deps";

function secretOk(received: string | null): boolean {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!expected || !received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Webhook do bot. Responde 200 logo depois de marcar o update como visto e
 * processa em `after()`: o Telegram reenvia o que demora, e o reenvio cai no
 * `claimUpdate` e para ali.
 */
export async function POST(request: Request) {
  if (!secretOk(request.headers.get("x-telegram-bot-api-secret-token"))) {
    return new Response(null, { status: 401 });
  }

  const update = (await request.json().catch(() => null)) as TelegramUpdate | null;
  if (!update || typeof update.update_id !== "number") {
    return new Response(null, { status: 400 });
  }

  if (!(await claimUpdate(update.update_id))) return new Response(null, { status: 200 });

  after(async () => {
    try {
      await handleUpdate(update, telegramDeps());
    } catch (error) {
      // Só a mensagem: o erro do cliente Telegram nunca carrega o token.
      console.error("[telegram] update", update.update_id, error instanceof Error ? error.message : error);
    }
  });

  return new Response(null, { status: 200 });
}
