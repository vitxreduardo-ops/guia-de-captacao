import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { canonicalizeTags } from "@/lib/tags";
import { blocksToPlainText, canMove, descendantIds, makeSnippet, type PageMeta } from "@/lib/notionTree";

export interface NotionPage extends PageMeta {
  content: unknown[];
  /** URL de imagem ou "cor:<nome>"; vazio = sem capa. */
  cover: string;
  full_width: boolean;
}

export type PageHit = PageMeta & { snippet: string };

const META = "id, parent_id, title, icon, position, favorite, tags, archived_at, updated_at";
const db = () => getSupabaseServerClient();

/** Todas as páginas (sem o conteúdo), inclusive arquivadas: a árvore e a lixeira saem daqui. */
export async function listPages(): Promise<PageMeta[]> {
  const { data, error } = await db().from("notion_pages").select(META);
  if (error) throw error;
  return data ?? [];
}

export async function getPage(id: string): Promise<NotionPage | null> {
  const { data, error } = await db()
    .from("notion_pages").select(`${META}, content, cover, full_width`).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? { ...data, content: Array.isArray(data.content) ? data.content : [] } : null;
}

/** Todas as grafias de tag em uso, pra reaproveitar a que já existe. */
export async function listAllTags(): Promise<string[]> {
  return (await listPages()).flatMap((p) => p.tags);
}

export async function createPage(parentId: string | null): Promise<string> {
  const siblings = (await listPages()).filter((p) => p.parent_id === parentId);
  const position = siblings.reduce((m, p) => Math.max(m, p.position), -1) + 1;
  const { data, error } = await db()
    .from("notion_pages").insert({ parent_id: parentId, position }).select("id").single();
  if (error) throw error;
  return data.id;
}

export type SaveResult = { ok: true; updated_at: string } | { ok: false; conflict: true };

/**
 * Só grava se ninguém salvou depois do que esta aba carregou (updated_at igual).
 * Senão devolve conflito e não sobrescreve nada.
 */
export async function savePage(
  id: string,
  fields: { title: string; icon: string; content: unknown[]; cover: string; full_width: boolean; tags: string[] },
  expectedUpdatedAt: string
): Promise<SaveResult> {
  const updated_at = new Date().toISOString();
  // Casa contra as tags já em uso: "referencia" digitada hoje não vira uma 2ª tag.
  const tags = canonicalizeTags(fields.tags, await listAllTags());
  const { data, error } = await db()
    .from("notion_pages")
    .update({
      title: fields.title,
      icon: fields.icon,
      content: fields.content,
      cover: fields.cover,
      tags,
      full_width: fields.full_width,
      plain_text: blocksToPlainText(fields.content),
      updated_at,
    })
    .eq("id", id)
    .eq("updated_at", expectedUpdatedAt)
    .select("id");
  if (error) throw error;
  return data && data.length > 0 ? { ok: true, updated_at } : { ok: false, conflict: true };
}

export async function movePage(id: string, newParent: string | null): Promise<boolean> {
  const pages = await listPages();
  if (!canMove(pages, id, newParent)) return false;
  const siblings = pages.filter((p) => p.parent_id === newParent && p.id !== id);
  const position = siblings.reduce((m, p) => Math.max(m, p.position), -1) + 1;
  const { error } = await db()
    .from("notion_pages").update({ parent_id: newParent, position }).eq("id", id);
  if (error) throw error;
  return true;
}

async function setArchived(id: string, archivedAt: string | null) {
  const pages = await listPages();
  const ids = [id, ...descendantIds(pages, id)];
  const { error } = await db().from("notion_pages").update({ archived_at: archivedAt }).in("id", ids);
  if (error) throw error;
  return pages;
}

export async function archivePage(id: string) {
  await setArchived(id, new Date().toISOString());
}

/** Restaura a subárvore; se a página-mãe continua na lixeira, a página sobe pra raiz. */
export async function restorePage(id: string) {
  const pages = await setArchived(id, null);
  const self = pages.find((p) => p.id === id);
  const parent = pages.find((p) => p.id === self?.parent_id);
  if (parent?.archived_at) await movePage(id, null);
}

/** Definitivo: o cascade do banco leva as subpáginas junto. */
export async function deletePage(id: string) {
  const { error } = await db().from("notion_pages").delete().eq("id", id);
  if (error) throw error;
}

export async function setFavorite(id: string, favorite: boolean) {
  const { error } = await db().from("notion_pages").update({ favorite }).eq("id", id);
  if (error) throw error;
}

/** Busca por título e texto, com o trecho que bateu. Escapa curingas do ILIKE. */
export async function searchPages(q: string): Promise<PageHit[]> {
  const term = q.trim().replace(/[\\%_,()]/g, " ").trim();
  if (!term) return [];
  const { data, error } = await db()
    .from("notion_pages")
    .select(`${META}, plain_text`)
    .is("archived_at", null)
    .or(`title.ilike.%${term}%,plain_text.ilike.%${term}%`)
    .order("updated_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []).map(({ plain_text, ...meta }) => ({ ...meta, snippet: makeSnippet(plain_text ?? "", term) }));
}
