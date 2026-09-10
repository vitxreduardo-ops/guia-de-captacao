import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { ReferenceKind } from "@/lib/references";

export interface ReferencePin {
  id: string;
  title: string;
  url: string;
  /** Capa servida pelo próprio site de origem. Vazio = card sem miniatura. */
  thumb_url: string;
  kind: ReferenceKind;
  note: string;
  /** Nicho e qualquer outra etiqueta livre — ver `lib/tags.ts`. */
  tags: string[];
  created_at: string;
}

export type ReferencePinFields = Omit<ReferencePin, "id" | "created_at">;

function toReferencePin(row: Record<string, unknown>): ReferencePin {
  const kind = row.kind;
  return {
    id: String(row.id),
    title: typeof row.title === "string" ? row.title : "",
    url: typeof row.url === "string" ? row.url : "",
    thumb_url: typeof row.thumb_url === "string" ? row.thumb_url : "",
    kind: kind === "image" || kind === "video" ? kind : "link",
    note: typeof row.note === "string" ? row.note : "",
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    created_at: String(row.created_at ?? ""),
  };
}

export async function listReferencePins(): Promise<ReferencePin[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("reference_pins")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(toReferencePin);
}

/** Todas as tags em uso, com repetição — quem chama decide como agrupar. */
export async function listReferenceTags(): Promise<string[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("reference_pins").select("tags");

  if (error) throw error;
  return (data ?? []).flatMap((row) =>
    Array.isArray(row.tags) ? (row.tags as string[]) : []
  );
}

export async function createReferencePin(
  fields: ReferencePinFields
): Promise<ReferencePin> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("reference_pins")
    .insert(fields)
    .select("*")
    .single();

  if (error) throw error;
  return toReferencePin(data);
}

export async function updateReferencePin(
  id: string,
  fields: ReferencePinFields
): Promise<ReferencePin> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("reference_pins")
    .update(fields)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return toReferencePin(data);
}

export async function deleteReferencePin(id: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("reference_pins").delete().eq("id", id);
  if (error) throw error;
}
