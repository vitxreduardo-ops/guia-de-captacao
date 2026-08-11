import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export interface LibraryLink {
  id: string;
  title: string;
  url: string;
  description: string;
  created_at: string;
}

function normalizeUrl(url: string) {
  const trimmed = url.trim();
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export async function listLibraryLinks(): Promise<LibraryLink[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("library_links")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((link) => ({
    ...link,
    url: link.url ? normalizeUrl(link.url) : link.url,
  }));
}

export async function createLibraryLink(fields: {
  title: string;
  url: string;
  description: string;
}): Promise<LibraryLink> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("library_links")
    .insert({
      title: fields.title,
      url: normalizeUrl(fields.url),
      description: fields.description,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteLibraryLink(id: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("library_links").delete().eq("id", id);
  if (error) throw error;
}
