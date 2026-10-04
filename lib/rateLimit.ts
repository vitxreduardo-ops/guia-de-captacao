import "server-only";
import { headers } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Conta uma batida em `key` e devolve false quando passou de `max` dentro de
 * `windowSeconds`. Se o banco falhar, deixa passar: travar o login inteiro por
 * causa do contador seria pior que ficar um momento sem limite.
 *
 * ponytail: janela fixa no Postgres (supabase/migrations/0077_rate_limit.sql);
 * trocar por Upstash/Redis se o volume crescer.
 */
export async function rateLimit(
  key: string,
  max: number,
  windowSeconds: number
): Promise<boolean> {
  const { data, error } = await getSupabaseServerClient().rpc("rate_limit_hit", {
    p_key: key,
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("Falha no rate limit", error);
    return true;
  }
  return data === true;
}

/** Atrás da Vercel o IP real é o primeiro da lista do `x-forwarded-for`. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || "sem-ip";
}
