"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  removeProspectFromCalendar,
  syncProspectToCalendar,
} from "@/lib/googleCalendar";
import {
  createProspect,
  createStage,
  deleteProspect,
  deleteStage,
  logTouch,
  moveProspect,
  readProspectForm,
  reorderStages,
  updateProspect,
  updateStage,
} from "@/lib/prospects";
import { getCurrentSession } from "@/lib/session";

const PATHS = [
  "/admin/prospeccao",
  "/admin/prospeccao/tabela",
  "/admin/prospeccao/etapas",
];

function revalidate(prospectId?: string) {
  for (const path of PATHS) revalidatePath(path);
  if (prospectId) revalidatePath(`/admin/prospeccao/${prospectId}`);
}

/**
 * Espelha o contato no Google Agenda sem deixar a integração derrubar a ação.
 * Mesma escolha do kanban: o Google fora do ar (ou nenhuma conta conectada)
 * não pode impedir alguém de registrar uma conversa. O banco é a fonte da
 * verdade, e o "Sincronizar tudo" da tela da agenda conserta o que ficou pra
 * trás.
 */
async function mirrorToCalendar(prospectId: string) {
  try {
    await syncProspectToCalendar(prospectId);
  } catch (error) {
    console.error("[prospeccao] falha ao sincronizar com o Google", error);
  }
}

async function authorId(): Promise<string | null> {
  return (await getCurrentSession())?.userId ?? null;
}

// -------------------------------------------------------------- contatos

export async function createProspectAction(formData: FormData) {
  const fields = readProspectForm(formData);
  if (!fields.stage_id) return;

  const prospect = await createProspect({
    ...fields,
    owner_id: fields.owner_id ?? (await authorId()),
  });
  await mirrorToCalendar(prospect.id);
  revalidate(prospect.id);
}

export async function updateProspectAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await updateProspect(id, readProspectForm(formData));
  await mirrorToCalendar(id);
  revalidate(id);
}

export async function deleteProspectAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // Antes de apagar a linha: o cascade leva `prospect_events` junto e os
  // eventos ficariam órfãos na agenda de todo mundo.
  try {
    await removeProspectFromCalendar(id);
  } catch (error) {
    console.error("[prospeccao] falha ao limpar a agenda", error);
  }
  await deleteProspect(id);
  revalidate();
  // Quem apaga está na ficha do contato, que acabou de deixar de existir.
  redirect("/admin/prospeccao");
}

/**
 * "Falei" — registra o que aconteceu e marca o próximo contato de uma vez.
 * A próxima data é obrigatória: é a regra que este funil existe pra impor.
 * Sem ela a ação não grava nada e a tela devolve o aviso.
 */
export async function logTouchAction(
  formData: FormData
): Promise<{ ok: true } | { ok: false; message: string }> {
  const id = String(formData.get("prospect_id") ?? "");
  if (!id) return { ok: false, message: "Contato não encontrado." };

  const nextDate = String(formData.get("next_contact_date") ?? "").trim();
  const keepOpen = formData.get("no_next") === "on";

  if (!nextDate && !keepOpen) {
    return {
      ok: false,
      message:
        "Marque a data do próximo contato — ou diga que este encerrou, na caixa abaixo.",
    };
  }

  const minutes = Number.parseInt(
    String(formData.get("next_contact_minutes") ?? ""),
    10
  );

  await logTouch({
    prospectId: id,
    authorId: await authorId(),
    kind: "contato",
    message: String(formData.get("message") ?? "").trim(),
    next: {
      date: keepOpen ? null : nextDate || null,
      time: String(formData.get("next_contact_time") ?? "").trim() || null,
      minutes: Number.isFinite(minutes) && minutes > 0 ? minutes : null,
      what: String(formData.get("next_contact_what") ?? "").trim(),
    },
  });
  await mirrorToCalendar(id);
  revalidate(id);
  return { ok: true };
}

/** Nota solta no histórico, sem mexer na data do próximo contato. */
export async function addNoteAction(formData: FormData) {
  const id = String(formData.get("prospect_id") ?? "");
  const message = String(formData.get("message") ?? "").trim();
  if (!id || !message) return;

  const { getSupabaseServerClient } = await import("@/lib/supabase/server");
  const { error } = await getSupabaseServerClient()
    .from("prospect_touches")
    .insert({
      prospect_id: id,
      author_id: await authorId(),
      kind: "nota",
      message,
    });
  if (error) throw error;
  revalidate(id);
}

export async function moveProspectAction(formData: FormData) {
  const id = String(formData.get("prospect_id") ?? "");
  const stageId = String(formData.get("stage_id") ?? "");
  if (!id || !stageId) return;

  await moveProspect({
    prospectId: id,
    stageId,
    authorId: await authorId(),
    lostReason: String(formData.get("lost_reason") ?? "").trim(),
  });
  revalidate(id);
}

// ---------------------------------------------------------------- etapas

export async function createStageAction(formData: FormData) {
  await createStage({
    name: String(formData.get("name") ?? ""),
    color: String(formData.get("color") ?? "#6b7280"),
    kind: String(formData.get("kind") ?? "ativa"),
  });
  revalidate();
}

export async function updateStageAction(formData: FormData) {
  await updateStage(String(formData.get("id") ?? ""), {
    name: String(formData.get("name") ?? ""),
    color: String(formData.get("color") ?? "#6b7280"),
    kind: String(formData.get("kind") ?? "ativa"),
    playbook: String(formData.get("playbook") ?? ""),
  });
  revalidate();
}

export async function deleteStageAction(
  formData: FormData
): Promise<{ ok: true } | { ok: false; message: string }> {
  const result = await deleteStage(String(formData.get("id") ?? ""));
  revalidate();
  if (result.ok) return { ok: true };
  return {
    ok: false,
    message:
      result.count === 1
        ? "Tem 1 contato nesta etapa. Mova ele antes de apagar."
        : `Tem ${result.count} contatos nesta etapa. Mova eles antes de apagar.`,
  };
}

export async function reorderStagesAction(orderedIds: string[]) {
  await reorderStages(orderedIds);
  revalidate();
}

// ----------------------------------------------------------------- radar

export async function createRadarAction(formData: FormData) {
  const { createRadarCompany } = await import("@/lib/prospects");
  if (!String(formData.get("company") ?? "").trim()) return;
  await createRadarCompany(formData);
  revalidatePath("/admin/prospeccao/radar");
}

export async function updateRadarAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { updateRadarCompany } = await import("@/lib/prospects");
  await updateRadarCompany(id, formData);
  revalidatePath("/admin/prospeccao/radar");
}

export async function deleteRadarAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { deleteRadarCompany } = await import("@/lib/prospects");
  await deleteRadarCompany(id);
  revalidatePath("/admin/prospeccao/radar");
}
