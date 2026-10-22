"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createMindMap, deleteMindMap, saveMindMap, setMindMapClient, setMindMapStatus } from "@/lib/mindMaps";
import { parseMap } from "@/lib/mindMap";
import { requireTeam } from "@/lib/session";

export async function createMindMapAction(formData: FormData) {
  await requireTeam("mapas");
  const title = String(formData.get("title") ?? "").trim();
  const clientId = String(formData.get("client_id") ?? "") || null;
  const template = formData.get("template") === "funil" ? "funil" : "blank";
  const map = await createMindMap(title || "Novo mapa", clientId, template);
  revalidatePath("/admin/mapas");
  redirect(`/admin/mapas/${map.id}`);
}

export async function deleteMindMapAction(formData: FormData) {
  await requireTeam("mapas");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteMindMap(id);
  revalidatePath("/admin/mapas");
}

/** Chamada pelo editor a cada pausa de digitação; não revalida pra não piscar a tela. */
export async function saveMindMapAction(id: string, root: unknown) {
  await requireTeam("mapas");
  await saveMindMap(id, parseMap(root));
}

export async function setMindMapStatusAction(formData: FormData) {
  await requireTeam("mapas");
  const id = String(formData.get("id") ?? "");
  const status = formData.get("status") === "published" ? "published" : "draft";
  if (!id) return;
  await setMindMapStatus(id, status);
  revalidatePath(`/mapa/editar/${id}`);
  revalidatePath("/admin/mapas");
}

export async function setMindMapClientAction(formData: FormData) {
  await requireTeam("mapas");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await setMindMapClient(id, String(formData.get("client_id") ?? "") || null);
  revalidatePath(`/mapa/editar/${id}`);
  revalidatePath("/admin/mapas");
}
