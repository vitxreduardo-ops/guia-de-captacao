"use server";

import { revalidatePath } from "next/cache";
import {
  addGalleryImage,
  deleteGalleryImage,
  getGalleryClientWithImages,
  replaceGalleryImagesFromDrive,
  setGalleryClientStatus,
  updateGalleryClientName,
} from "@/lib/galleries";
import { fetchOgImage, isLikelyImageUrl, resolveDriveImageUrl } from "@/lib/references";
import { extractDriveFolderId, listDriveFolderMediaRecursive } from "@/lib/googleDrive";

function revalidateClient(id: string, slug?: string | null) {
  revalidatePath(`/admin/galerias/${id}`);
  revalidatePath("/admin/galerias");
  if (slug) revalidatePath(`/galeria/${slug}`);
}

/**
 * Resolve o link colado pro admin numa imagem exibível: link direto de
 * imagem, link de arquivo do Google Drive (compartilhado publicamente) ou,
 * como último recurso, tenta extrair a og:image do link.
 */
async function resolveGalleryImage(
  urlInput: string
): Promise<{ image_url: string; source_url: string | null }> {
  if (isLikelyImageUrl(urlInput)) {
    return { image_url: urlInput, source_url: null };
  }

  const driveImage = resolveDriveImageUrl(urlInput);
  if (driveImage) {
    return { image_url: driveImage, source_url: urlInput };
  }

  const ogImage = await fetchOgImage(urlInput);
  if (ogImage) {
    return { image_url: ogImage, source_url: urlInput };
  }

  return { image_url: urlInput, source_url: null };
}

export async function updateGalleryClientNameAction(formData: FormData) {
  const id = String(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim() || "Sem nome";
  await updateGalleryClientName(id, name);
  revalidateClient(id);
}

export async function setGalleryClientStatusAction(formData: FormData) {
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as "draft" | "published";
  await setGalleryClientStatus(id, status);
  const client = await getGalleryClientWithImages(id);
  revalidateClient(id, client?.slug);
}

export async function addGalleryImageAction(formData: FormData) {
  const clientId = String(formData.get("guide_id"));
  const caption = String(formData.get("caption") ?? "").trim();
  const urlInput = String(formData.get("image_url") ?? "").trim();
  if (!urlInput) return;

  const { image_url, source_url } = await resolveGalleryImage(urlInput);
  await addGalleryImage(clientId, { image_url, source_url, caption });

  const client = await getGalleryClientWithImages(clientId);
  revalidateClient(clientId, client?.slug);
}

export async function deleteGalleryImageAction(formData: FormData) {
  const id = String(formData.get("id"));
  const clientId = String(formData.get("guide_id"));
  await deleteGalleryImage(id);
  const client = await getGalleryClientWithImages(clientId);
  revalidateClient(clientId, client?.slug);
}

export async function syncDriveFolderAction(formData: FormData) {
  const clientId = String(formData.get("guide_id"));
  const folderUrlInput = String(formData.get("drive_folder_url") ?? "").trim();
  if (!folderUrlInput) return;

  const folderId = extractDriveFolderId(folderUrlInput);
  if (!folderId) {
    throw new Error(
      "Link de pasta do Drive inválido — cole o link da pasta (drive.google.com/drive/folders/...)."
    );
  }

  const files = await listDriveFolderMediaRecursive(folderId);
  await replaceGalleryImagesFromDrive(clientId, folderId, files);

  const client = await getGalleryClientWithImages(clientId);
  revalidateClient(clientId, client?.slug);
}
