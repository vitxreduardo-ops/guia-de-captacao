"use server";

import { revalidatePath } from "next/cache";
import {
  addCardItem,
  addChecklistItem,
  addPhotoItem,
  addScene,
  addShotListItem,
  addVideo,
  addVideoReferenceItem,
  addVisualReference,
  deleteCardItem,
  deleteChecklistItem,
  deletePhotoItem,
  deleteScene,
  deleteShotListItem,
  deleteVideo,
  deleteVideoReferenceItem,
  deleteVisualReference,
  getGuideWithSections,
  setGuideStatus,
  toggleCardItemSelected,
  toggleChecklistItem,
  togglePhotoItemSelected,
  toggleVideoReferenceItemSelected,
  toggleVisualReferenceSelected,
  updateGuideInfo,
  updateScene,
  updateVideo,
  type ChecklistCategory,
} from "@/lib/guides";
import {
  fetchInstagramCarousel,
  fetchOgImage,
  isLikelyImageUrl,
} from "@/lib/references";
import { mirrorRemoteImage, uploadReferenceImage } from "@/lib/storage";

function revalidateGuide(id: string, slug?: string | null) {
  revalidatePath(`/admin/guias/${id}`);
  revalidatePath("/admin/guias");
  if (slug) revalidatePath(`/guia/${slug}`);
}

/**
 * Quando o usuário cola um link que não é uma imagem direta (ex: post do
 * Instagram/Pinterest), tenta extrair a imagem de capa (og:image) do link
 * pra usar como referência visual, guardando o link original em source_url.
 * Se não conseguir, mantém o comportamento anterior (link tratado como link).
 * Carrossel do Instagram traz todas as imagens em gallery_urls.
 */
async function resolveReferenceImage(urlInput: string): Promise<{
  image_url: string;
  source_url: string | null;
  gallery_urls: string[];
}> {
  if (isLikelyImageUrl(urlInput)) {
    return { image_url: urlInput, source_url: null, gallery_urls: [] };
  }

  const slides = await fetchInstagramCarousel(urlInput);
  if (slides.length > 1) {
    // Mesma razão da og:image abaixo: os links do Instagram expiram.
    const mirrored = await Promise.all(
      slides.map(
        async (slide) => (await mirrorRemoteImage("mirrors", slide)) ?? slide
      )
    );
    return {
      image_url: mirrored[0],
      source_url: urlInput,
      gallery_urls: mirrored,
    };
  }

  const ogImage = await fetchOgImage(urlInput);
  if (ogImage) {
    // A og:image do Instagram/Facebook é assinada e expira; guardamos uma
    // cópia nossa pra referência não sumir depois.
    const mirrored = await mirrorRemoteImage("mirrors", ogImage);
    return {
      image_url: mirrored ?? ogImage,
      source_url: urlInput,
      gallery_urls: [],
    };
  }

  return { image_url: urlInput, source_url: null, gallery_urls: [] };
}

export async function updateGuideInfoAction(formData: FormData) {
  const id = String(formData.get("id"));
  const title = String(formData.get("title") ?? "").trim() || "Sem título";
  const clientName = String(formData.get("client_name") ?? "").trim();
  const shootDateRaw = String(formData.get("shoot_date") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const tags = String(formData.get("tags") ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  await updateGuideInfo(id, {
    title,
    client_name: clientName,
    shoot_date: shootDateRaw || null,
    location,
    tags,
  });

  revalidateGuide(id);
}

export async function setStatusAction(formData: FormData) {
  const id = String(formData.get("id"));
  const status = String(formData.get("status")) as "draft" | "published";
  await setGuideStatus(id, status);
  const guide = await getGuideWithSections(id);
  revalidateGuide(id, guide?.slug);
}

export async function addVideoAction(formData: FormData) {
  const guideId = String(formData.get("guide_id"));
  const title = String(formData.get("title") ?? "").trim();
  await addVideo(guideId, title || "Sem título");
  revalidateGuide(guideId);
}

export async function updateVideoAction(formData: FormData) {
  const id = String(formData.get("id"));
  const guideId = String(formData.get("guide_id"));
  const title = String(formData.get("title") ?? "").trim() || "Sem título";
  await updateVideo(id, title);
  revalidateGuide(guideId);
}

export async function deleteVideoAction(formData: FormData) {
  const id = String(formData.get("id"));
  const guideId = String(formData.get("guide_id"));
  await deleteVideo(id);
  revalidateGuide(guideId);
}

export async function addSceneAction(formData: FormData) {
  const guideId = String(formData.get("guide_id"));
  const videoId = String(formData.get("video_id"));
  const script = String(formData.get("script") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!script && !description) return;

  const scene = await addScene(videoId, { script, description });

  const urlInput = String(formData.get("image_url") ?? "").trim();
  const caption = String(formData.get("caption") ?? "").trim();
  const file = formData.get("file");

  let imageUrl = "";
  let sourceUrl: string | null = null;
  let galleryUrls: string[] = [];

  if (file instanceof File && file.size > 0) {
    imageUrl = await uploadReferenceImage(guideId, file);
  } else if (urlInput) {
    const resolved = await resolveReferenceImage(urlInput);
    imageUrl = resolved.image_url;
    sourceUrl = resolved.source_url;
    galleryUrls = resolved.gallery_urls;
  }

  if (imageUrl) {
    await addVisualReference(guideId, {
      image_url: imageUrl,
      source_url: sourceUrl,
      gallery_urls: galleryUrls,
      caption,
      scene_id: scene.id,
    });
  }

  revalidateGuide(guideId);
}

export async function updateSceneAction(formData: FormData) {
  const id = String(formData.get("id"));
  const guideId = String(formData.get("guide_id"));
  const script = String(formData.get("script") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  await updateScene(id, { script, description });
  revalidateGuide(guideId);
}

export async function deleteSceneAction(formData: FormData) {
  const id = String(formData.get("id"));
  const guideId = String(formData.get("guide_id"));
  await deleteScene(id);
  revalidateGuide(guideId);
}

export async function addVisualReferenceAction(formData: FormData) {
  const guideId = String(formData.get("guide_id"));
  const caption = String(formData.get("caption") ?? "").trim();
  const sceneId = String(formData.get("scene_id") ?? "") || null;
  const urlInput = String(formData.get("image_url") ?? "").trim();
  const file = formData.get("file");

  let imageUrl = "";
  let sourceUrl: string | null = null;
  let galleryUrls: string[] = [];

  if (file instanceof File && file.size > 0) {
    imageUrl = await uploadReferenceImage(guideId, file);
  } else if (urlInput) {
    const resolved = await resolveReferenceImage(urlInput);
    imageUrl = resolved.image_url;
    sourceUrl = resolved.source_url;
    galleryUrls = resolved.gallery_urls;
  }

  if (!imageUrl) return;

  await addVisualReference(guideId, {
    image_url: imageUrl,
    source_url: sourceUrl,
    gallery_urls: galleryUrls,
    caption,
    scene_id: sceneId,
  });

  revalidateGuide(guideId);
}

export async function deleteVisualReferenceAction(formData: FormData) {
  const id = String(formData.get("id"));
  const guideId = String(formData.get("guide_id"));
  await deleteVisualReference(id);
  revalidateGuide(guideId);
}

export async function toggleVisualReferenceSelectedAction(
  guideId: string,
  id: string,
  selected: boolean
) {
  await toggleVisualReferenceSelected(id, selected);
  revalidateGuide(guideId);
}

async function resolveMediaItemInput(formData: FormData, guideId: string) {
  const caption = String(formData.get("caption") ?? "").trim();
  const urlInput = String(formData.get("image_url") ?? "").trim();
  const file = formData.get("file");

  let imageUrl = "";
  let sourceUrl: string | null = null;
  let galleryUrls: string[] = [];

  if (file instanceof File && file.size > 0) {
    imageUrl = await uploadReferenceImage(guideId, file);
  } else if (urlInput) {
    const resolved = await resolveReferenceImage(urlInput);
    imageUrl = resolved.image_url;
    sourceUrl = resolved.source_url;
    galleryUrls = resolved.gallery_urls;
  }

  return { imageUrl, sourceUrl, galleryUrls, caption };
}

export async function addPhotoItemAction(formData: FormData) {
  const guideId = String(formData.get("guide_id"));
  const { imageUrl, sourceUrl, galleryUrls, caption } =
    await resolveMediaItemInput(formData, guideId);
  if (!imageUrl) return;

  await addPhotoItem(guideId, {
    image_url: imageUrl,
    source_url: sourceUrl,
    gallery_urls: galleryUrls,
    caption,
  });
  revalidateGuide(guideId);
}

export async function deletePhotoItemAction(formData: FormData) {
  const id = String(formData.get("id"));
  const guideId = String(formData.get("guide_id"));
  await deletePhotoItem(id);
  revalidateGuide(guideId);
}

export async function togglePhotoItemSelectedAction(
  guideId: string,
  id: string,
  selected: boolean
) {
  await togglePhotoItemSelected(id, selected);
  revalidateGuide(guideId);
}

export async function addCardItemAction(formData: FormData) {
  const guideId = String(formData.get("guide_id"));
  const { imageUrl, sourceUrl, galleryUrls, caption } =
    await resolveMediaItemInput(formData, guideId);
  if (!imageUrl) return;

  await addCardItem(guideId, {
    image_url: imageUrl,
    source_url: sourceUrl,
    gallery_urls: galleryUrls,
    caption,
  });
  revalidateGuide(guideId);
}

export async function deleteCardItemAction(formData: FormData) {
  const id = String(formData.get("id"));
  const guideId = String(formData.get("guide_id"));
  await deleteCardItem(id);
  revalidateGuide(guideId);
}

export async function toggleCardItemSelectedAction(
  guideId: string,
  id: string,
  selected: boolean
) {
  await toggleCardItemSelected(id, selected);
  revalidateGuide(guideId);
}

export async function addVideoReferenceItemAction(formData: FormData) {
  const guideId = String(formData.get("guide_id"));
  const { imageUrl, sourceUrl, galleryUrls, caption } =
    await resolveMediaItemInput(formData, guideId);
  if (!imageUrl) return;

  await addVideoReferenceItem(guideId, {
    image_url: imageUrl,
    source_url: sourceUrl,
    gallery_urls: galleryUrls,
    caption,
  });
  revalidateGuide(guideId);
}

export async function deleteVideoReferenceItemAction(formData: FormData) {
  const id = String(formData.get("id"));
  const guideId = String(formData.get("guide_id"));
  await deleteVideoReferenceItem(id);
  revalidateGuide(guideId);
}

export async function toggleVideoReferenceItemSelectedAction(
  guideId: string,
  id: string,
  selected: boolean
) {
  await toggleVideoReferenceItemSelected(id, selected);
  revalidateGuide(guideId);
}

export async function addShotListItemAction(formData: FormData) {
  const guideId = String(formData.get("guide_id"));
  const description = String(formData.get("description") ?? "").trim();
  const shotType = String(formData.get("shot_type") ?? "").trim();
  const duration = String(formData.get("duration") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  if (!description) return;
  await addShotListItem(guideId, {
    description,
    shot_type: shotType,
    duration,
    notes,
  });
  revalidateGuide(guideId);
}

export async function deleteShotListItemAction(formData: FormData) {
  const id = String(formData.get("id"));
  const guideId = String(formData.get("guide_id"));
  await deleteShotListItem(id);
  revalidateGuide(guideId);
}

export async function addChecklistItemAction(formData: FormData) {
  const guideId = String(formData.get("guide_id"));
  const category = String(formData.get("category")) as ChecklistCategory;
  const label = String(formData.get("label") ?? "").trim();
  if (!label) return;
  await addChecklistItem(guideId, { category, label });
  revalidateGuide(guideId);
}

export async function toggleChecklistItemAction(formData: FormData) {
  const id = String(formData.get("id"));
  const guideId = String(formData.get("guide_id"));
  const done = String(formData.get("done")) === "true";
  await toggleChecklistItem(id, done);
  revalidateGuide(guideId);
}

export async function deleteChecklistItemAction(formData: FormData) {
  const id = String(formData.get("id"));
  const guideId = String(formData.get("guide_id"));
  await deleteChecklistItem(id);
  revalidateGuide(guideId);
}
