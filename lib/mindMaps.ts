import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { newMap, parseMap, type MindNode, type TemplateKind } from "@/lib/mindMap";
import { slugify } from "@/lib/slug";

export type MindMapStatus = "draft" | "published";

export interface MindMapRow {
  id: string;
  slug: string;
  title: string;
  root: MindNode;
  status: MindMapStatus;
  client_id: string | null;
  created_at: string;
  updated_at: string;
}

const parse = (row: MindMapRow): MindMapRow => ({ ...row, root: parseMap(row.root) });

export async function listMindMaps(): Promise<Omit<MindMapRow, "root">[]> {
  const { data, error } = await getSupabaseServerClient()
    .from("mind_maps")
    .select("id, slug, title, status, client_id, created_at, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getMindMap(id: string): Promise<MindMapRow | null> {
  const { data, error } = await getSupabaseServerClient()
    .from("mind_maps").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? parse(data) : null;
}

export async function getMindMapBySlug(slug: string): Promise<MindMapRow | null> {
  const { data, error } = await getSupabaseServerClient()
    .from("mind_maps").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data ? parse(data) : null;
}

export async function createMindMap(
  title: string,
  clientId: string | null = null,
  template: TemplateKind = "blank"
): Promise<MindMapRow> {
  // Sufixo aleatório sempre: o link é público, então também não fica adivinhável.
  const slug = `${slugify(title) || "mapa"}-${Math.random().toString(36).slice(2, 6)}`;
  const { data, error } = await getSupabaseServerClient()
    .from("mind_maps")
    .insert({ title, slug, root: newMap(title, template), client_id: clientId })
    .select("*").single();
  if (error) throw error;
  return parse(data);
}

export async function saveMindMap(id: string, root: MindNode) {
  const { error } = await getSupabaseServerClient()
    .from("mind_maps")
    .update({ root, title: root.text || "Mapa mental", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function setMindMapStatus(id: string, status: MindMapStatus) {
  const { error } = await getSupabaseServerClient()
    .from("mind_maps").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function deleteMindMap(id: string) {
  const { error } = await getSupabaseServerClient().from("mind_maps").delete().eq("id", id);
  if (error) throw error;
}

export async function setMindMapClient(id: string, clientId: string | null) {
  const { error } = await getSupabaseServerClient()
    .from("mind_maps").update({ client_id: clientId }).eq("id", id);
  if (error) throw error;
}

/** Os clientes que dá pra escolher (os mesmos da Galeria). */
export async function listClientOptions(): Promise<{ id: string; name: string }[]> {
  const { data, error } = await getSupabaseServerClient()
    .from("gallery_clients").select("id, name").order("name");
  if (error) throw error;
  return data ?? [];
}
