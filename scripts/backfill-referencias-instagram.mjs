/**
 * Recupera referências cuja imagem aponta pra uma URL assinada do Instagram
 * (cdninstagram/fbcdn), que expira em alguns dias. Rebusca a og:image a partir
 * do source_url guardado, copia o arquivo pro nosso bucket e atualiza a linha.
 *
 * Só precisa rodar uma vez, pra linhas criadas antes de o mirror existir
 * (mirrorRemoteImage em lib/storage.ts). Sem --apply, só mostra o que faria.
 *
 *   node scripts/backfill-referencias-instagram.mjs          # simulação
 *   node scripts/backfill-referencias-instagram.mjs --apply  # grava
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);

const db = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const UA = "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)";
const OG = /<meta[^>]+(?:property|name)=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i;
const DRY = !process.argv.includes("--apply");

for (const table of ["budget_references", "visual_references", "photo_items", "card_items"]) {
  const { data, error } = await db
    .from(table)
    .select("id, image_url, source_url")
    .not("source_url", "is", null);
  if (error) throw error;

  const stale = (data ?? []).filter(
    (r) => /cdninstagram|fbcdn/.test(r.image_url)
  );

  for (const row of stale) {
    const html = await fetch(row.source_url, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      redirect: "follow",
    }).then((r) => (r.ok ? r.text() : null));
    const og = html?.match(OG)?.[1]?.replace(/&amp;/g, "&");
    if (!og) { console.log(`${table} ${row.id}: og:image não encontrada`); continue; }

    const res = await fetch(og);
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!res.ok || !type.startsWith("image/")) {
      console.log(`${table} ${row.id}: download falhou (${res.status} ${type})`);
      continue;
    }
    const bytes = Buffer.from(await res.arrayBuffer());
    const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[type] ?? "jpg";
    const path = `mirrors/${crypto.randomUUID()}.${ext}`;

    if (DRY) { console.log(`${table} ${row.id}: OK (${bytes.length} bytes) -> ${path}`); continue; }

    const up = await db.storage.from("guide-references").upload(path, bytes, { contentType: type });
    if (up.error) { console.log(`${table} ${row.id}: upload falhou`, up.error.message); continue; }
    const url = db.storage.from("guide-references").getPublicUrl(path).data.publicUrl;
    const upd = await db.from(table).update({ image_url: url }).eq("id", row.id);
    console.log(`${table} ${row.id}: ${upd.error ? "update falhou " + upd.error.message : url}`);
  }
}
