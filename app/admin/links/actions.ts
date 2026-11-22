"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireTeam } from "@/lib/session";
import { createShortLink, updateShortLink } from "@/lib/shortLinks";

export type CriarLinkEstado = { erro?: string; ok?: string } | null;

export async function criarLinkAction(_: CriarLinkEstado, formData: FormData): Promise<CriarLinkEstado> {
  await requireTeam("links");
  const clientId = String(formData.get("client_id") ?? "") || null;
  let rotulo = String(formData.get("rotulo") ?? "").trim();
  if (!rotulo && clientId) {
    const { data } = await getSupabaseServerClient().from("gallery_clients").select("name").eq("id", clientId).maybeSingle();
    rotulo = data?.name ?? "";
  }
  const r = await createShortLink({
    url: String(formData.get("url") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    rotulo,
    clientId,
    avisar: formData.get("avisar") === "on",
    expiraDia: String(formData.get("expira") ?? ""),
    utm: formData.get("utm") === "on",
  });
  if ("erro" in r) return { erro: r.erro };
  revalidatePath("/admin/links");
  return { ok: r.slug };
}

export async function atualizarLinkAction(_: CriarLinkEstado, formData: FormData): Promise<CriarLinkEstado> {
  await requireTeam("links");
  const erro = await updateShortLink(String(formData.get("id")), {
    url: String(formData.get("url") ?? ""),
    rotulo: String(formData.get("rotulo") ?? ""),
    clientId: String(formData.get("client_id") ?? "") || null,
    avisar: formData.get("avisar") === "on",
    ativo: formData.get("ativo") === "on",
    expiraDia: String(formData.get("expira") ?? ""),
    utm: formData.get("utm") === "on",
  });
  if (erro) return erro;
  revalidatePath("/admin/links");
  return { ok: "salvo" };
}

export async function apagarLinkAction(formData: FormData) {
  await requireTeam("links");
  await getSupabaseServerClient().from("short_links").delete().eq("id", String(formData.get("id")));
  revalidatePath("/admin/links");
}

/** Botão "Copiar curto" dos links públicos (orçamento, contrato…): devolve o endereço já pronto. */
export async function encurtarLinkAction(url: string, rotulo?: string): Promise<{ curto: string } | { erro: string }> {
  await requireTeam();
  const r = await createShortLink({ url, rotulo });
  if ("erro" in r) return r;
  revalidatePath("/admin/links");
  return { curto: `https://tatuestudio.com.br/${r.slug}` };
}
