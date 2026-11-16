import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/users";

/** Quem está falando com o bot, sempre relido do banco (nunca do cookie). */
export interface TelegramActor {
  userId: string;
  username: string;
  role: Exclude<UserRole, "client">;
  allowedSections: string[] | null;
  allowedClientIds: string[] | null;
}

const TOKEN_TTL_MINUTES = 15;

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

/** Código de uso único pro link `t.me/<bot>?start=<código>`. */
export async function createLinkToken(userId: string): Promise<string> {
  // 32 bytes em base64url = 43 caracteres, dentro do limite de 64 do `start`.
  const token = randomBytes(32).toString("base64url");
  const { error } = await getSupabaseServerClient()
    .from("telegram_link_tokens")
    .insert({
      token_hash: hash(token),
      user_id: userId,
      expires_at: new Date(Date.now() + TOKEN_TTL_MINUTES * 60_000).toISOString(),
    });
  if (error) throw error;
  return token;
}

/**
 * Consome o código e liga o Telegram à pessoa. O `update ... is null` faz o
 * código valer uma vez só, mesmo com duas mensagens chegando juntas.
 */
export async function consumeLinkToken(
  token: string,
  tg: { id: number; username?: string }
): Promise<TelegramActor | null> {
  const supabase = getSupabaseServerClient();
  const { data: row, error } = await supabase
    .from("telegram_link_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("token_hash", hash(token))
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("user_id")
    .maybeSingle();
  if (error) throw error;
  if (!row) return null;

  const { data: user } = await supabase
    .from("users")
    .select("role")
    .eq("id", row.user_id)
    .maybeSingle();
  if (!user || user.role === "client") return null;

  // Troca qualquer vínculo anterior, dos dois lados: a pessoa trocou de
  // celular, ou este Telegram estava em outra conta.
  await supabase
    .from("telegram_identities")
    .update({ active: false })
    .eq("active", true)
    .or(`user_id.eq.${row.user_id},telegram_user_id.eq.${tg.id}`);

  const { error: insertError } = await supabase.from("telegram_identities").insert({
    user_id: row.user_id,
    telegram_user_id: tg.id,
    telegram_username: tg.username ?? "",
  });
  if (insertError) throw insertError;
  return findActor(tg.id);
}

export async function findActor(telegramUserId: number): Promise<TelegramActor | null> {
  const { data, error } = await getSupabaseServerClient()
    .from("telegram_identities")
    .select("users(id, username, role, allowed_sections, allowed_client_ids)")
    .eq("telegram_user_id", telegramUserId)
    .eq("active", true)
    .maybeSingle();
  if (error) throw error;
  const u = data?.users as unknown as {
    id: string;
    username: string;
    role: UserRole;
    allowed_sections: string[] | null;
    allowed_client_ids: string[] | null;
  } | null;
  if (!u || u.role === "client") return null;
  return {
    userId: u.id,
    username: u.username,
    role: u.role,
    allowedSections: u.allowed_sections ?? null,
    allowedClientIds: u.allowed_client_ids ?? null,
  };
}

export async function unlinkTelegram(userId: string) {
  const { error } = await getSupabaseServerClient()
    .from("telegram_identities")
    .update({ active: false })
    .eq("user_id", userId)
    .eq("active", true);
  if (error) throw error;
}

/** @ do Telegram ligado a esta pessoa, ou null. */
export async function getLinkedTelegram(userId: string): Promise<string | null> {
  const { data, error } = await getSupabaseServerClient()
    .from("telegram_identities")
    .select("telegram_username")
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle();
  if (error) throw error;
  return data ? (data.telegram_username as string) || "sem @" : null;
}

/** Marca o update como visto. false = já tinha sido processado. */
export async function claimUpdate(updateId: number): Promise<boolean> {
  const { error } = await getSupabaseServerClient()
    .from("telegram_processed_updates")
    .insert({ update_id: updateId });
  if (!error) return true;
  if (error.code === "23505") return false;
  throw error;
}
