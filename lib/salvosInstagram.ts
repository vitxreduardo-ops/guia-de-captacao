import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export interface SavedCollection {
  key: string;
  name: string;
  url: string;
}

export interface SavedPost {
  collection_key: string;
  id: string;
  type: "p" | "reel";
  label: string;
  /** @ do perfil que publicou, sem o "@". */
  creator: string;
  thumb_url: string;
  note: string;
  client: string;
  tags: string[];
  added_on: string | null;
}

export async function listSavedInstagram(): Promise<{
  collections: SavedCollection[];
  posts: SavedPost[];
}> {
  const db = getSupabaseServerClient();
  const [cols, posts] = await Promise.all([
    db.from("instagram_saved_collections").select("key,name,url").order("position"),
    db.from("instagram_saved_posts").select("*").order("position"),
  ]);
  if (cols.error) throw cols.error;
  if (posts.error) throw posts.error;
  return {
    collections: (cols.data ?? []) as SavedCollection[],
    posts: (posts.data ?? []) as SavedPost[],
  };
}

export interface SavedStatus {
  state: "ok" | "login";
  checked_at: string | null;
  ok_at: string | null;
}

export async function getSavedStatus(): Promise<SavedStatus> {
  const { data } = await getSupabaseServerClient()
    .from("instagram_saved_status")
    .select("state,checked_at,ok_at")
    .eq("id", 1)
    .maybeSingle();
  return (data as SavedStatus | null) ?? { state: "ok", checked_at: null, ok_at: null };
}

export async function updateSavedPost(
  collectionKey: string,
  id: string,
  fields: Pick<SavedPost, "label" | "creator" | "note" | "client" | "tags">
) {
  const { error } = await getSupabaseServerClient()
    .from("instagram_saved_posts")
    .update(fields)
    .eq("collection_key", collectionKey)
    .eq("id", id);
  if (error) throw error;
}
