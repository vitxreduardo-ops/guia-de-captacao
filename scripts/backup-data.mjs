// Script de backup: exporta todas as tabelas do Supabase para JSON.
// Uso: node scripts/backup-data.mjs <pasta-de-destino>
// Lê as credenciais de .env.local (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  const content = readFileSync(envPath, "utf-8");
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    env[key] = value;
  }
  return env;
}

const destDir = process.argv[2];
if (!destDir) {
  console.error("Uso: node scripts/backup-data.mjs <pasta-de-destino>");
  process.exit(1);
}

const env = loadEnvLocal();
const url = env.SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY não encontrados em .env.local");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false },
});

const TABLES = [
  "guides",
  "videos",
  "scenes",
  "visual_references",
  "shot_list_items",
  "checklist_items",
];

if (!existsSync(destDir)) {
  mkdirSync(destDir, { recursive: true });
}

const summary = {};

for (const table of TABLES) {
  const { data, error } = await supabase.from(table).select("*");
  if (error) {
    console.error(`Erro ao exportar "${table}":`, error.message);
    process.exit(1);
  }
  writeFileSync(
    path.join(destDir, `${table}.json`),
    JSON.stringify(data, null, 2)
  );
  summary[table] = data.length;
  console.log(`${table}: ${data.length} linha(s)`);
}

writeFileSync(
  path.join(destDir, "_summary.json"),
  JSON.stringify({ exported_at: new Date().toISOString(), counts: summary }, null, 2)
);

console.log("Backup de dados concluído em:", destDir);
