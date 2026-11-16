"use server";

import { revalidatePath } from "next/cache";
import { requireTeam } from "@/lib/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { IaError, preencherPlanejamento, rascunharCampo } from "@/lib/planejamentoAi";
import {
  createPlanejamento,
  deletePlanejamento,
  getPlanejamentoById,
  salvarCampo,
  setPlanejamentoStatus,
} from "@/lib/planejamentos";
import type { CampoTexto } from "@/lib/planejamentoTypes";

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

export type CampoState = { erro?: string; texto?: string; salvo?: boolean };

const CAMPOS = ["fala", "legenda", "card"];

/** A equipe escreve (ou revisa) o campo: grava e tira a marca de rascunho. */
export async function salvarCampoAction(_prev: CampoState, formData: FormData): Promise<CampoState> {
  await requireTeam("planejamentos");
  const id = String(formData.get("id") ?? "");
  const entregaId = String(formData.get("entrega") ?? "");
  const campo = String(formData.get("campo") ?? "");
  const texto = String(formData.get("texto") ?? "").trim();
  if (!CAMPOS.includes(campo)) return { erro: "Campo inválido." };
  if (!texto) return { erro: "Escreva o texto antes de salvar." };
  if (!(await salvarCampo(id, entregaId, campo as CampoTexto, texto, false))) return { erro: "Entrega não encontrada." };
  revalidatePath("/admin/planejamentos");
  return { salvo: true, texto };
}

/** A IA escreve um rascunho a partir do que o planejamento já diz. Fica escondido do cliente até a revisão. */
export async function rascunharCampoAction(_prev: CampoState, formData: FormData): Promise<CampoState> {
  await requireTeam("planejamentos");
  const id = String(formData.get("id") ?? "");
  const entregaId = String(formData.get("entrega") ?? "");
  const campo = String(formData.get("campo") ?? "");
  if (!CAMPOS.includes(campo)) return { erro: "Campo inválido." };
  const p = await getPlanejamentoById(id);
  const entrega = p?.content.entregas.find((x) => x.id === entregaId);
  if (!p || !entrega) return { erro: "Entrega não encontrada." };
  try {
    const texto = await rascunharCampo({ cliente: p.client_name ?? "", content: p.content, entrega, campo: campo as CampoTexto });
    await salvarCampo(id, entregaId, campo as CampoTexto, texto, true);
    revalidatePath("/admin/planejamentos");
    return { texto };
  } catch (error) {
    return { erro: error instanceof IaError ? error.message : "Não consegui escrever o rascunho." };
  }
}
