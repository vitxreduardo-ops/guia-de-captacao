// Cria um cliente de teste com login no portal /cliente (usuário: cliente-teste,
// senha: teste123) e três entregas. Rodar: node scripts/seed-cliente-teste.mjs
// Para limpar: node scripts/seed-cliente-teste.mjs --limpar
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.split("=")[0], l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")])
);
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const ok = (r) => {
  if (r.error) throw r.error;
  return r.data;
};
const SLUG = "cliente-teste-apagar";
const COLUMN = "Teste do portal (apagar)";

if (process.argv.includes("--limpar")) {
  // client_id dos cards é "on delete set null": sem apagar antes, eles ficam
  // soltos no quadro. Os cards, a coluna de teste e depois o cliente.
  const found = ok(await sb.from("gallery_clients").select("id").eq("slug", SLUG));
  for (const c of found) ok(await sb.from("backlog_cards").delete().eq("client_id", c.id).select());
  ok(await sb.from("backlog_columns").delete().eq("name", COLUMN).select());
  ok(await sb.from("gallery_clients").delete().eq("slug", SLUG).select());
  // cartões soltos de seeds antigos (títulos, legendas e posição >= 900 dos exemplos)
  const strays = ok(
    await sb.from("backlog_cards").delete().is("client_id", null).gte("position", 900)
      .in("caption", ["Legenda de exemplo do reel.", "Cinco dicas rápidas.", ""])
      .in("title", ["Reel de lançamento", "Carrossel de dicas", "Foto institucional"]).select("id")
  );
  console.log(`Cartões soltos apagados: ${strays.length}`);
  console.log("Cliente de teste apagado.");
  process.exit(0);
}

const hex = (b) => Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
const salt = crypto.getRandomValues(new Uint8Array(16));
const km = await crypto.subtle.importKey("raw", new TextEncoder().encode("teste123"), "PBKDF2", false, ["deriveBits"]);
const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, km, 256);
const hash = `100000:${hex(salt)}:${hex(bits)}`;

const client = ok(await sb.from("gallery_clients").insert({ slug: SLUG, name: "Cliente Teste (apagar)", status: "published", gallery_article: "da" }).select().single());
const cols = ok(
  await sb.from("backlog_columns")
    .insert({ name: COLUMN, board: "entregas", color: "#6b7280", position: 99, client_visible: true })
    .select("id")
);
const guide = ok(await sb.from("guides").select("id").eq("status", "published").limit(1));

ok(
  await sb.from("backlog_cards").insert(
    [
      { title: "Reel de lançamento", format: "reel", caption: "Legenda de exemplo do reel.", post_date: "2026-10-10" },
      { title: "Carrossel de dicas", format: "carrossel", caption: "Cinco dicas rápidas.", post_date: "2026-10-14", guide_id: guide[0]?.id ?? null },
      { title: "Foto institucional", format: "foto", caption: "", post_date: "2026-10-01", approved_at: new Date().toISOString() },
    ].map((c, i) => ({ ...c, client_id: client.id, column_id: cols[0].id, position: 900 + i }))
  )
);
ok(
  await sb.from("editorial_ideas").insert([
    { client_id: client.id, month: "2026-12-01", title: "Retrospectiva do ano", notes: "Reel com os melhores momentos.", internal: false },
    { client_id: client.id, month: "2027-02-01", title: "Campanha de Carnaval", notes: "", internal: false },
    { client_id: client.id, month: "2026-12-01", title: "Ideia só da equipe", notes: "", internal: true },
  ])
);
ok(await sb.from("users").insert({ username: "cliente-teste", email: "", password_hash: hash, role: "client", client_id: client.id }));
console.log("Pronto. Entre em /admin/login com cliente-teste / teste123");
