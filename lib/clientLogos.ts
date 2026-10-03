import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { svgIsLight } from "@/lib/clientLogoMatch";

/**
 * O acervo de logos de clientes, compartilhado por todas as propostas.
 *
 * A proposta não aponta para cá: ela copia nome e URL para dentro da própria
 * seção. Assim uma proposta já enviada não muda porque alguém mexeu no acervo
 * depois.
 */
export interface ClientLogoRecord {
  id: string;
  name: string;
  logo_url: string;
  created_at: string;
}

export async function listClientLogos(): Promise<ClientLogoRecord[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("client_logos")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function addClientLogo(fields: {
  name: string;
  logo_url: string;
}): Promise<ClientLogoRecord> {
  const supabase = getSupabaseServerClient();

  // O mesmo arquivo enviado duas vezes não vira duas entradas no acervo.
  const { data: existente } = await supabase
    .from("client_logos")
    .select("*")
    .eq("logo_url", fields.logo_url)
    .maybeSingle();

  if (existente) return existente;

  const { data, error } = await supabase
    .from("client_logos")
    .insert({ name: fields.name, logo_url: fields.logo_url })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function renameClientLogo(id: string, name: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("client_logos")
    .update({ name })
    .eq("id", id);
  if (error) throw error;
}

/**
 * Tira o logo do acervo. As propostas que já o usam seguem intactas — elas
 * guardam a própria cópia do nome e da URL.
 */
export async function deleteClientLogo(id: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("client_logos").delete().eq("id", id);
  if (error) throw error;
}

/** Logo clara demais pra fundo branco? Só SVG é inspecionado; o resto conta como escura. */
export async function isLightLogo(url: string): Promise<boolean> {
  if (!url.split("?")[0].toLowerCase().endsWith(".svg")) return false;
  try {
    const res = await fetch(url, { cache: "force-cache" });
    return res.ok ? svgIsLight(await res.text()) : false;
  } catch {
    return false;
  }
}
