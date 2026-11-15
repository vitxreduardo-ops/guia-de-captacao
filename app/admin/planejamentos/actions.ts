"use server";

import { revalidatePath } from "next/cache";
import { requireTeam } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { IaError, preencherPlanejamento } from "@/lib/planejamentoAi";
import {
  createPlanejamento,
  deletePlanejamento,
  setPlanejamentoStatus,
} from "@/lib/planejamentos";

// O limite do corpo na Vercel é 4,5 MB; o PDF vai em base64 (+33%) dentro do JSON da OpenAI.
const MAX_PDF = 3_000_000;

export type ImportState = { erro?: string; ok?: boolean };

export async function importarPlanejamentoAction(
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  await requireTeam("planejamentos");
  const clientId = String(formData.get("client_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const texto = String(formData.get("texto") ?? "");
  const arquivo = formData.get("pdf");
  const pdf = arquivo instanceof File && arquivo.size > 0 ? arquivo : null;

  if (!clientId) return { erro: "Escolha o cliente." };
  if (!title) return { erro: "Dê um nome ao planejamento (ex.: Novembro 2026)." };
  if (!texto.trim() && !pdf) return { erro: "Cole o conteúdo do artifact ou escolha um PDF." };
  if (pdf && (pdf.type !== "application/pdf" || pdf.size > MAX_PDF)) {
    return { erro: "O PDF precisa ter até 3 MB." };
  }

  const { data: cliente } = await getSupabaseServerClient()
    .from("gallery_clients")
    .select("name")
    .eq("id", clientId)
    .maybeSingle();
  if (!cliente) return { erro: "Cliente não encontrado." };

  try {
    const content = await preencherPlanejamento({
      texto,
      pdf: pdf
        ? { nome: pdf.name, base64: Buffer.from(await pdf.arrayBuffer()).toString("base64") }
        : undefined,
    });
    await createPlanejamento({ clientId, clientName: cliente.name, title, content });
  } catch (error) {
    return { erro: error instanceof IaError ? error.message : "Não consegui ler o material." };
  }

  revalidatePath("/admin/planejamentos");
  return { ok: true };
}

export async function publicarPlanejamentoAction(formData: FormData) {
  await requireTeam("planejamentos");
  const id = String(formData.get("id") ?? "");
  const status = formData.get("status") === "published" ? "published" : "draft";
  if (!id) return;
  await setPlanejamentoStatus(id, status);
  revalidatePath("/admin/planejamentos");
}

export async function excluirPlanejamentoAction(formData: FormData) {
  await requireTeam("planejamentos");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deletePlanejamento(id);
  revalidatePath("/admin/planejamentos");
}
