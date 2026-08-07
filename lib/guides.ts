import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type GuideStatus = "draft" | "published";
export type ChecklistCategory = "equipamento" | "locacao";

export interface Guide {
  id: string;
  slug: string;
  title: string;
  client_name: string;
  shoot_date: string | null;
  location: string;
  status: GuideStatus;
  created_at: string;
  updated_at: string;
}

export interface Video {
  id: string;
  guide_id: string;
  position: number;
  title: string;
}

export interface Scene {
  id: string;
  video_id: string;
  position: number;
  title: string;
  script: string;
  recorded: boolean;
}

export interface VisualReference {
  id: string;
  guide_id: string;
  scene_id: string | null;
  image_url: string;
  source_url: string | null;
  caption: string;
  position: number;
  selected: boolean;
}

export interface PhotoItem {
  id: string;
  guide_id: string;
  position: number;
  image_url: string;
  source_url: string | null;
  caption: string;
  selected: boolean;
}

export interface CardItem {
  id: string;
  guide_id: string;
  position: number;
  image_url: string;
  source_url: string | null;
  caption: string;
  selected: boolean;
}

export interface ShotListItem {
  id: string;
  guide_id: string;
  position: number;
  description: string;
  shot_type: string;
  duration: string;
  notes: string;
}

export interface ChecklistItem {
  id: string;
  guide_id: string;
  category: ChecklistCategory;
  position: number;
  label: string;
  done: boolean;
}

export interface VideoWithScenes extends Video {
  scenes: Scene[];
}

export interface GuideWithSections extends Guide {
  videos: VideoWithScenes[];
  visual_references: VisualReference[];
  photo_items: PhotoItem[];
  card_items: CardItem[];
  shot_list_items: ShotListItem[];
  checklist_items: ChecklistItem[];
}

function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

async function generateUniqueSlug(title: string) {
  const supabase = getSupabaseServerClient();
  const base = slugify(title) || "guia";

  let candidate = base;
  let attempt = 0;

  while (true) {
    const { data, error } = await supabase
      .from("guides")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (error) throw error;
    if (!data) return candidate;

    attempt += 1;
    candidate = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    if (attempt > 10) {
      candidate = `${base}-${Date.now()}`;
      return candidate;
    }
  }
}

export async function listGuides(): Promise<Guide[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("guides")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

async function attachSections(guide: Guide): Promise<GuideWithSections> {
  const supabase = getSupabaseServerClient();

  const [
    videosResult,
    visualReferences,
    photoItems,
    cardItems,
    shotListItems,
    checklistItems,
  ] = await Promise.all([
    supabase
      .from("videos")
      .select("*")
      .eq("guide_id", guide.id)
      .order("position", { ascending: true }),
    supabase
      .from("visual_references")
      .select("*")
      .eq("guide_id", guide.id)
      .order("position", { ascending: true }),
    supabase
      .from("photo_items")
      .select("*")
      .eq("guide_id", guide.id)
      .order("position", { ascending: true }),
    supabase
      .from("card_items")
      .select("*")
      .eq("guide_id", guide.id)
      .order("position", { ascending: true }),
    supabase
      .from("shot_list_items")
      .select("*")
      .eq("guide_id", guide.id)
      .order("position", { ascending: true }),
    supabase
      .from("checklist_items")
      .select("*")
      .eq("guide_id", guide.id)
      .order("position", { ascending: true }),
  ]);

  if (videosResult.error) throw videosResult.error;
  if (visualReferences.error) throw visualReferences.error;
  if (photoItems.error) throw photoItems.error;
  if (cardItems.error) throw cardItems.error;
  if (shotListItems.error) throw shotListItems.error;
  if (checklistItems.error) throw checklistItems.error;

  const videos: Video[] = videosResult.data ?? [];
  const videoIds = videos.map((video) => video.id);

  let scenes: Scene[] = [];
  if (videoIds.length > 0) {
    const scenesResult = await supabase
      .from("scenes")
      .select("*")
      .in("video_id", videoIds)
      .order("position", { ascending: true });
    if (scenesResult.error) throw scenesResult.error;
    scenes = scenesResult.data ?? [];
  }

  const videosWithScenes: VideoWithScenes[] = videos.map((video) => ({
    ...video,
    scenes: scenes.filter((scene) => scene.video_id === video.id),
  }));

  return {
    ...guide,
    videos: videosWithScenes,
    visual_references: visualReferences.data ?? [],
    photo_items: photoItems.data ?? [],
    card_items: cardItems.data ?? [],
    shot_list_items: shotListItems.data ?? [],
    checklist_items: checklistItems.data ?? [],
  };
}

export async function getGuideWithSections(
  id: string
): Promise<GuideWithSections | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("guides")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return attachSections(data);
}

export async function getGuideBySlugWithSections(
  slug: string
): Promise<GuideWithSections | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("guides")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return attachSections(data);
}

export async function createGuide(title: string): Promise<Guide> {
  const supabase = getSupabaseServerClient();
  const slug = await generateUniqueSlug(title || "novo-guia");

  const { data, error } = await supabase
    .from("guides")
    .insert({ title: title || "Novo guia", slug })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateGuideInfo(
  id: string,
  fields: Partial<
    Pick<Guide, "title" | "client_name" | "shoot_date" | "location">
  >
) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("guides")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function setGuideStatus(id: string, status: GuideStatus) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("guides")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteGuide(id: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("guides").delete().eq("id", id);
  if (error) throw error;
}

async function nextPosition(table: string, column: string, value: string) {
  const supabase = getSupabaseServerClient();
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq(column, value);

  if (error) throw error;
  return count ?? 0;
}

// Videos

export async function addVideo(
  guideId: string,
  title: string
): Promise<Video> {
  const supabase = getSupabaseServerClient();
  const position = await nextPosition("videos", "guide_id", guideId);
  const { data, error } = await supabase
    .from("videos")
    .insert({ guide_id: guideId, position, title })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateVideo(id: string, title: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("videos").update({ title }).eq("id", id);
  if (error) throw error;
}

export async function deleteVideo(id: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("videos").delete().eq("id", id);
  if (error) throw error;
}

// Scenes (roteiro)

export async function addScene(
  videoId: string,
  fields: { title: string; script: string }
): Promise<Scene> {
  const supabase = getSupabaseServerClient();
  const position = await nextPosition("scenes", "video_id", videoId);
  const { data, error } = await supabase
    .from("scenes")
    .insert({
      video_id: videoId,
      position,
      title: fields.title,
      script: fields.script,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function updateScene(
  id: string,
  fields: { title: string; script: string }
) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("scenes").update(fields).eq("id", id);
  if (error) throw error;
}

export async function deleteScene(id: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("scenes").delete().eq("id", id);
  if (error) throw error;
}

export async function toggleSceneRecorded(id: string, recorded: boolean) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("scenes")
    .update({ recorded })
    .eq("id", id);
  if (error) throw error;
}

// Visual references

export async function addVisualReference(
  guideId: string,
  fields: {
    image_url: string;
    source_url?: string | null;
    caption: string;
    scene_id: string | null;
  }
) {
  const supabase = getSupabaseServerClient();
  const position = await nextPosition(
    "visual_references",
    "guide_id",
    guideId
  );
  const { error } = await supabase.from("visual_references").insert({
    guide_id: guideId,
    position,
    image_url: fields.image_url,
    source_url: fields.source_url ?? null,
    caption: fields.caption,
    scene_id: fields.scene_id,
  });
  if (error) throw error;
}

export async function deleteVisualReference(id: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("visual_references")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function toggleVisualReferenceSelected(
  id: string,
  selected: boolean
) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("visual_references")
    .update({ selected })
    .eq("id", id);
  if (error) throw error;
}

// Fotos e Cards (painéis de imagens embedadas no nível do guia)

type MediaItemTable = "photo_items" | "card_items";

async function addMediaItem(
  table: MediaItemTable,
  guideId: string,
  fields: { image_url: string; source_url?: string | null; caption: string }
) {
  const supabase = getSupabaseServerClient();
  const position = await nextPosition(table, "guide_id", guideId);
  const { error } = await supabase.from(table).insert({
    guide_id: guideId,
    position,
    image_url: fields.image_url,
    source_url: fields.source_url ?? null,
    caption: fields.caption,
  });
  if (error) throw error;
}

async function deleteMediaItem(table: MediaItemTable, id: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw error;
}

async function toggleMediaItemSelected(
  table: MediaItemTable,
  id: string,
  selected: boolean
) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from(table)
    .update({ selected })
    .eq("id", id);
  if (error) throw error;
}

export function addPhotoItem(
  guideId: string,
  fields: { image_url: string; source_url?: string | null; caption: string }
) {
  return addMediaItem("photo_items", guideId, fields);
}

export function deletePhotoItem(id: string) {
  return deleteMediaItem("photo_items", id);
}

export function togglePhotoItemSelected(id: string, selected: boolean) {
  return toggleMediaItemSelected("photo_items", id, selected);
}

export function addCardItem(
  guideId: string,
  fields: { image_url: string; source_url?: string | null; caption: string }
) {
  return addMediaItem("card_items", guideId, fields);
}

export function deleteCardItem(id: string) {
  return deleteMediaItem("card_items", id);
}

export function toggleCardItemSelected(id: string, selected: boolean) {
  return toggleMediaItemSelected("card_items", id, selected);
}

// Shot list

export async function addShotListItem(
  guideId: string,
  fields: {
    description: string;
    shot_type: string;
    duration: string;
    notes: string;
  }
) {
  const supabase = getSupabaseServerClient();
  const position = await nextPosition("shot_list_items", "guide_id", guideId);
  const { error } = await supabase.from("shot_list_items").insert({
    guide_id: guideId,
    position,
    ...fields,
  });
  if (error) throw error;
}

export async function deleteShotListItem(id: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("shot_list_items")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

// Checklist

export async function addChecklistItem(
  guideId: string,
  fields: { category: ChecklistCategory; label: string }
) {
  const supabase = getSupabaseServerClient();
  const position = await nextPosition("checklist_items", "guide_id", guideId);
  const { error } = await supabase.from("checklist_items").insert({
    guide_id: guideId,
    position,
    category: fields.category,
    label: fields.label,
  });
  if (error) throw error;
}

export async function toggleChecklistItem(id: string, done: boolean) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("checklist_items")
    .update({ done })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteChecklistItem(id: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("checklist_items")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
