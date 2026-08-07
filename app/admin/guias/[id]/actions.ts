"use server";

import { revalidatePath } from "next/cache";
import {
  addChecklistItem,
  addScene,
  addShotListItem,
  addVideo,
  addVisualReference,
  deleteChecklistItem,
  deleteScene,
  deleteShotListItem,
  deleteVideo,
  deleteVisualReference,
  getGuideWithSections,
  setGuideStatus,
  toggleChecklistItem,
  updateGuideInfo,
  updateScene,
  updateVideo,
  type ChecklistCategory,
} from "@/lib/guides";
import { uploadReferenceImage } from "@/lib/storage";

function revalidateGuide(id: string, slug?: string | null) {
  revalidatePath(`/admin/guias/${id}`);
  revalidatePath("/admin");
  if (slug) revalidatePath(`/guia/${slug}`);
}

export async function updateGuideInfoAction(formData: FormData) {
  const id = String(formData.get("id"));
  const title = String(formData.get("title") ?? "").trim() || "Sem título";
  const clientName = String(formData.get("client_name") ?? "").trim();
  const shootDateRaw = String(formData.get("shoot_date") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();

  await updateGuideInfo(id, {
    title,
    client_name: clientName,
    shoot_date: shootDateRaw || null,
    location,
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
  const title = String(formData.get("title") ?? "").trim();
  const script = String(formData.get("script") ?? "").trim();
  if (!title && !script) return;

  const scene = await addScene(videoId, { title, script });

  const urlInput = String(formData.get("image_url") ?? "").trim();
  const caption = String(formData.get("caption") ?? "").trim();
  const file = formData.get("file");

  let imageUrl = urlInput;
  if (file instanceof File && file.size > 0) {
    imageUrl = await uploadReferenceImage(guideId, file);
  }

  if (imageUrl) {
    await addVisualReference(guideId, {
      image_url: imageUrl,
      caption,
      scene_id: scene.id,
    });
  }

  revalidateGuide(guideId);
}

export async function updateSceneAction(formData: FormData) {
  const id = String(formData.get("id"));
  const guideId = String(formData.get("guide_id"));
  const title = String(formData.get("title") ?? "").trim();
  const script = String(formData.get("script") ?? "").trim();
  await updateScene(id, { title, script });
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

  let imageUrl = urlInput;

  if (file instanceof File && file.size > 0) {
    imageUrl = await uploadReferenceImage(guideId, file);
  }

  if (!imageUrl) return;

  await addVisualReference(guideId, {
    image_url: imageUrl,
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
