"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  archivePage, createPage, deletePage, movePage, restorePage, savePage, searchPages, setFavorite,
  type PageHit, type SaveResult,
} from "@/lib/notion";

import { requireTeam } from "@/lib/session";

const refresh = () => revalidatePath("/admin/notas", "layout");

/** Cria uma página (na raiz ou dentro de outra) e já abre. */
export async function createPageAction(parentId: string | null) {
  await requireTeam("notas");
  const id = await createPage(parentId);
  refresh();
  redirect(`/admin/notas/${id}`);
}

/** Chamada pelo editor a cada pausa de digitação; não revalida pra não piscar a tela. */
export async function savePageAction(
  id: string,
  fields: { title: string; icon: string; content: unknown[]; cover: string; full_width: boolean; tags: string[] },
  expectedUpdatedAt: string
): Promise<SaveResult> {
  await requireTeam("notas");
  if (!Array.isArray(fields.content)) throw new Error("conteúdo inválido");
  return savePage(
    id,
    {
      title: String(fields.title ?? "").slice(0, 200),
      icon: String(fields.icon ?? "").slice(0, 8),
      content: fields.content,
      cover: String(fields.cover ?? "").slice(0, 600),
      full_width: Boolean(fields.full_width),
      tags: (Array.isArray(fields.tags) ? fields.tags : []).map((t) => String(t).trim().slice(0, 40)).filter(Boolean).slice(0, 20),
    },
    expectedUpdatedAt
  );
}

export async function movePageAction(id: string, newParent: string | null) {
  await requireTeam("notas");
  const ok = await movePage(id, newParent);
  if (ok) refresh();
  return ok;
}

/** `goHome`: volta pro início depois (a página aberta é a que foi pra lixeira). */
export async function archivePageAction(id: string, goHome = true) {
  await requireTeam("notas");
  await archivePage(id);
  refresh();
  if (goHome) redirect("/admin/notas");
}

export async function restorePageAction(id: string) {
  await requireTeam("notas");
  await restorePage(id);
  refresh();
}

export async function deletePageAction(id: string) {
  await requireTeam("notas");
  await deletePage(id);
  refresh();
}

export async function setFavoriteAction(id: string, favorite: boolean) {
  await requireTeam("notas");
  await setFavorite(id, favorite);
  refresh();
}

export async function searchPagesAction(q: string): Promise<PageHit[]> {
  await requireTeam("notas");
  return searchPages(q);
}
