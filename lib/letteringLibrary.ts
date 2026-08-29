import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const FONTS_BUCKET = "lettering-fonts";

export interface LayoutSalvo {
  id: string;
  name: string;
  /** A lista de camadas, no mesmo formato que o rascunho do navegador. */
  data: unknown;
  is_template: boolean;
  updated_at: string;
}

export interface FonteSalva {
  id: string;
  client: string;
  label: string;
  /** Nome com que a fonte é registrada no navegador. */
  family: string;
}

export async function listarLayouts(): Promise<LayoutSalvo[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("lettering_layouts")
    .select("id, name, data, is_template, updated_at")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as LayoutSalvo[];
}

export async function salvarLayout(
  name: string,
  data: unknown,
  isTemplate = false,
): Promise<LayoutSalvo> {
  const supabase = getSupabaseServerClient();
  const { data: row, error } = await supabase
    .from("lettering_layouts")
    .insert({ name, data, is_template: isTemplate })
    .select("id, name, data, is_template, updated_at")
    .single();

  if (error) throw error;
  return row as LayoutSalvo;
}

export async function regravarLayout(id: string, data: unknown) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("lettering_layouts")
    .update({ data, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function excluirLayout(id: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("lettering_layouts")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function listarFontes(): Promise<FonteSalva[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("lettering_fonts")
    .select("id, client, label, family")
    .order("client")
    .order("label");

  if (error) throw error;
  return (data ?? []) as FonteSalva[];
}

/**
 * Guarda o arquivo da fonte e cadastra a família.
 *
 * A família é derivada do cliente e do nome, e não sorteada: o layout salvo
 * guarda esse nome dentro do JSON, e um nome novo a cada envio quebraria todo
 * layout salvo antes.
 */
export async function guardarFonte(
  client: string,
  label: string,
  arquivo: File,
): Promise<FonteSalva> {
  const supabase = getSupabaseServerClient();
  const slug = `${client}-${label}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const family = `lettering-${slug}`;
  const extensao = arquivo.name.split(".").pop()?.toLowerCase() ?? "ttf";
  const storagePath = `${family}.${extensao}`;

  const { error: erroUpload } = await supabase.storage
    .from(FONTS_BUCKET)
    .upload(storagePath, await arquivo.arrayBuffer(), {
      contentType: arquivo.type || "font/ttf",
      upsert: true,
    });
  if (erroUpload) throw erroUpload;

  const { data, error } = await supabase
    .from("lettering_fonts")
    .upsert(
      { client, label, family, storage_path: storagePath },
      { onConflict: "family" },
    )
    .select("id, client, label, family")
    .single();

  if (error) throw error;
  return data as FonteSalva;
}

export async function excluirFonte(id: string) {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("lettering_fonts")
    .select("storage_path")
    .eq("id", id)
    .single();

  if (data?.storage_path) {
    await supabase.storage.from(FONTS_BUCKET).remove([data.storage_path]);
  }

  const { error } = await supabase.from("lettering_fonts").delete().eq("id", id);
  if (error) throw error;
}

/** Bytes da fonte, pra rota que serve o arquivo pro navegador. */
export async function baixarFonte(family: string) {
  const supabase = getSupabaseServerClient();
  const { data: cadastro } = await supabase
    .from("lettering_fonts")
    .select("storage_path")
    .eq("family", family)
    .single();

  if (!cadastro?.storage_path) return null;

  const { data, error } = await supabase.storage
    .from(FONTS_BUCKET)
    .download(cadastro.storage_path);

  if (error || !data) return null;
  return data;
}
