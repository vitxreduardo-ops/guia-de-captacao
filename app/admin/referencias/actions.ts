"use server";

import { revalidatePath } from "next/cache";
import {
  createReferencePin,
  deleteReferencePin,
  listReferenceTags,
  updateReferencePin,
  type ReferencePinFields,
} from "@/lib/referencePins";
import { resolveReferencePin } from "@/lib/references";
import { canonicalizeTags } from "@/lib/tags";

function parseTags(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function normalizeUrl(url: string) {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(url) ? url : `https://${url}`;
}

async function readFields(
  formData: FormData
): Promise<ReferencePinFields | null> {
  // Capa digitada à mão manda: é o conserto de quando a og:image do link
  // expirou ou nunca existiu, e refazer a descoberta apagaria o conserto.
  const manualThumb = String(formData.get("thumb_url") ?? "").trim();
  const comuns = {
    // Sem título, o domínio já identifica melhor que um card em branco.
    title: String(formData.get("title") ?? "").trim(),
    note: String(formData.get("note") ?? "").trim(),
    tags: canonicalizeTags(
      parseTags(formData.get("tags")),
      await listReferenceTags()
    ),
  };

  // Arquivo enviado pelo painel: já está na pasta do Drive (ver
  // /api/referencias/upload) e é servido pelos mesmos proxies das galerias,
  // então nada aqui depende de site de terceiro continuar no ar.
  const driveFileId = String(formData.get("drive_file_id") ?? "").trim();
  if (driveFileId) {
    const uploadKind = String(formData.get("upload_kind") ?? "");
    return {
      ...comuns,
      url: `/api/drive-image/${driveFileId}`,
      // O Drive gera a miniatura inclusive de vídeo, o que dá capa ao webm
      // sem precisar extrair quadro nenhum.
      thumb_url: manualThumb || `/api/drive-thumbnail/${driveFileId}?size=1200`,
      kind: uploadKind === "video" ? "video" : "image",
      drive_file_id: driveFileId,
    };
  }

  const rawUrl = String(formData.get("url") ?? "").trim();
  if (!rawUrl) return null;
  const url = normalizeUrl(rawUrl);

  const resolved = await resolveReferencePin(url);

  return {
    ...comuns,
    url,
    thumb_url: manualThumb || resolved.thumb_url,
    kind: resolved.kind,
    drive_file_id: "",
  };
}

export async function createReferencePinAction(formData: FormData) {
  const fields = await readFields(formData);
  if (!fields) return;

  await createReferencePin(fields);
  revalidatePath("/admin/referencias");
}

export async function updateReferencePinAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const fields = await readFields(formData);
  if (!id || !fields) return;

  await updateReferencePin(id, fields);
  revalidatePath("/admin/referencias");
}

export async function deleteReferencePinAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteReferencePin(id);
  revalidatePath("/admin/referencias");
}
