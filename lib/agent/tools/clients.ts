import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { matchByName } from "@/lib/agent/match";
import { canSeeClient } from "@/lib/agent/permissions";
import { reqString } from "@/lib/agent/validate";
import type { ReadTool } from "@/lib/agent/types";

export const findClients: ReadTool = {
  kind: "read",
  name: "find_clients",
  topic: "clientes",
  description:
    "Procura clientes por nome, apelido parcial ou código de 4 dígitos. Use antes de afirmar qual cliente " +
    "a pessoa quis dizer; se vier mais de um, pergunte.",
  parameters: {
    type: "object",
    properties: { query: { type: "string" } },
    required: ["query"],
    additionalProperties: false,
  },
  async run(actor, args) {
    const query = reqString(args, "query", 100);
    const { data, error } = await getSupabaseServerClient()
      .from("gallery_clients")
      .select("id, name, client_code, contact_name, archived_at");
    if (error) throw error;
    const visible = (data ?? []).filter((c) => canSeeClient(actor, c.id as string)) as {
      id: string;
      name: string;
      client_code: string;
      contact_name: string | null;
      archived_at: string | null;
    }[];
    const found = matchByName(visible, query, (c) => [c.name], (c) => c.client_code);
    const items = found.kind === "one" ? [found.item] : found.kind === "many" ? found.items : [];
    return {
      encontrados: items.map((c) => ({
        codigo: c.client_code,
        nome: c.name,
        contato: c.contact_name,
        arquivado: Boolean(c.archived_at),
      })),
    };
  },
};
