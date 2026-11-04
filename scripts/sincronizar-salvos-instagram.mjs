/**
 * Sincroniza as coleções salvas do Instagram (colecoes.json, mantido pelo
 * atualizar.py em Tatu Estudio Criativo/referencias-instagram) com
 * /admin/referencias/salvos: copia cada miniatura pro bucket e grava as linhas.
 * Tags, cliente e anotação editados na tela nunca são sobrescritos.
 *
 *   node scripts/sincronizar-salvos-instagram.mjs [caminho/colecoes.json]          # simulação
 *   node scripts/sincronizar-salvos-instagram.mjs [caminho/colecoes.json] --apply  # grava
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
const BUCKET = "guide-references";
const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const file =
  args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--status") ??
  "/Users/creativehome/Documents/Claude Code/Tatu Estudio Criativo/referencias-instagram/colecoes.json";

// --status login|ok: só registra o estado da conexão (a tarefa agendada chama
// isso quando o Instagram pede login) e sai.
const si = args.indexOf("--status");
if (si >= 0) {
  const state = args[si + 1];
  if (!["ok", "login"].includes(state)) throw new Error("use --status ok|login");
  const now = new Date().toISOString();
  const { error } = await db.from("instagram_saved_status")
    .upsert({ id: 1, state, checked_at: now, ...(state === "ok" ? { ok_at: now } : {}) });
  if (error) throw error;
  console.log("Estado:", state);
  process.exit(0);
}
const data = JSON.parse(readFileSync(file, "utf8"));

async function mirror(id, url) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
    const type = (r.headers.get("content-type") ?? "").split(";")[0];
    if (!r.ok || !type.startsWith("image/")) return "";
    const path = `salvos-instagram/${id}.${type.includes("png") ? "png" : "jpg"}`;
    const { error } = await db.storage.from(BUCKET).upload(path, await r.arrayBuffer(), { contentType: type, upsert: true });
    if (error) throw error;
    return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  } catch (e) {
    console.error("miniatura falhou", id, e.message);
    return "";
  }
}

for (const [ci, col] of data.collections.entries()) {
  const { data: existing } = await db
    .from("instagram_saved_posts").select("id,thumb_url,creator").eq("collection_key", col.key);
  const have = new Map((existing ?? []).map((r) => [r.id, r.thumb_url]));
  const hasCreator = new Set((existing ?? []).filter((r) => r.creator).map((r) => r.id));
  const keep = new Set(col.posts.map((p) => p.id));
  const gone = [...have.keys()].filter((id) => !keep.has(id));
  const fresh = col.posts.filter((p) => !have.get(p.id));
  console.log(`${col.name}: ${col.posts.length} posts, ${fresh.length} novos/sem capa, ${gone.length} removidos`);
  if (!APPLY) continue;

  await db.from("instagram_saved_collections").upsert({ key: col.key, name: col.name, url: col.url, position: ci });
  for (const [pi, p] of col.posts.entries()) {
    const thumb = have.get(p.id) || (p.thumb ? await mirror(p.id, p.thumb) : "");
    if (have.has(p.id)) {
      // Existente: só ordem e capa; o resto é do que foi editado na tela.
      await db.from("instagram_saved_posts").update({ position: pi, ...(thumb ? { thumb_url: thumb } : {}), ...(p.creator && !hasCreator.has(p.id) ? { creator: p.creator } : {}) })
        .eq("collection_key", col.key).eq("id", p.id);
    } else {
      await db.from("instagram_saved_posts").insert({
        collection_key: col.key, id: p.id, type: p.type, label: p.label ?? "", creator: p.creator ?? "",
        thumb_url: thumb, added_on: p.added ?? null, position: pi,
      });
    }
  }
  if (gone.length) await db.from("instagram_saved_posts").delete().eq("collection_key", col.key).in("id", gone);
}
if (APPLY) {
  const now = new Date().toISOString();
  await db.from("instagram_saved_status").upsert({ id: 1, state: "ok", checked_at: now, ok_at: now });
}
console.log(APPLY ? "Gravado." : "Simulação. Use --apply para gravar.");
