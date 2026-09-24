import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Roteiro } from "@/lib/roteiroTypes";

export async function listRoteiros(filtro: {
  tag?: string;
  favoritos?: boolean;
}): Promise<Roteiro[]> {
  let query = getSupabaseServerClient()
    .from("roteiros")
    .select("*")
    .order("created_at", { ascending: false });

  if (filtro.tag) query = query.contains("tags", [filtro.tag]);
  if (filtro.favoritos) query = query.eq("favorito", true);

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao carregar roteiros: ${error.message}`);
  return (data ?? []) as Roteiro[];
}

export async function insertRoteiro(
  row: Omit<Roteiro, "id" | "created_at" | "favorito" | "status">
): Promise<string> {
  const { data, error } = await getSupabaseServerClient()
    .from("roteiros")
    .insert(row)
    .select("id")
    .single();
  if (error) throw new Error(`Erro ao salvar roteiro: ${error.message}`);
  return data.id;
}

export async function updateRoteiro(
  id: string,
  updates: Partial<Pick<Roteiro, "favorito" | "status" | "tags">>
) {
  const { error } = await getSupabaseServerClient()
    .from("roteiros")
    .update(updates)
    .eq("id", id);
  if (error) throw new Error(`Erro ao atualizar roteiro: ${error.message}`);
}
