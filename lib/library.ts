import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export interface LibraryLink {
  id: string;
  title: string;
  url: string;
  description: string;
  tags: string[];
  /** Override manual do logo. Vazio = a interface deriva do domínio. */
  icon_url: string;
  created_at: string;
}

export interface LibraryLinkFields {
  title: string;
  url: string;
  description: string;
  tags: string[];
  icon_url: string;
}

function normalizeUrl(url: string) {
  const trimmed = url.trim();
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** Linha crua do Supabase virando `LibraryLink`, com os campos opcionais
 *  preenchidos — o banco pode estar numa migração atrás. */
function toLibraryLink(row: Record<string, unknown>): LibraryLink {
  const url = typeof row.url === "string" ? row.url : "";
  return {
    id: String(row.id),
    title: typeof row.title === "string" ? row.title : "",
    url: url ? normalizeUrl(url) : url,
    description: typeof row.description === "string" ? row.description : "",
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    icon_url: typeof row.icon_url === "string" ? row.icon_url : "",
    created_at: String(row.created_at ?? ""),
  };
}

export async function listLibraryLinks(): Promise<LibraryLink[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("library_links")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(toLibraryLink);
}

/** Todas as tags em uso, com repetição — quem chama decide como agrupar. */
export async function listLibraryTags(): Promise<string[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("library_links").select("tags");

  if (error) throw error;
  return (data ?? []).flatMap((row) =>
    Array.isArray(row.tags) ? (row.tags as string[]) : []
  );
}

export async function createLibraryLink(
  fields: LibraryLinkFields
): Promise<LibraryLink> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("library_links")
    .insert({
      title: fields.title,
      url: normalizeUrl(fields.url),
      description: fields.description,
      tags: fields.tags,
      icon_url: fields.icon_url,
    })
    .select("*")
    .single();

  if (error) throw error;
  return toLibraryLink(data);
}

export async function updateLibraryLink(
  id: string,
  fields: LibraryLinkFields
): Promise<LibraryLink> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("library_links")
    .update({
      title: fields.title,
      url: normalizeUrl(fields.url),
      description: fields.description,
      tags: fields.tags,
      icon_url: fields.icon_url,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return toLibraryLink(data);
}

export async function deleteLibraryLink(id: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("library_links").delete().eq("id", id);
  if (error) throw error;
}
