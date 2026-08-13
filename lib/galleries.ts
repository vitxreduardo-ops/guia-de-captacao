import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isRenderableMediaMimeType } from "@/lib/googleDrive";
import { isLikelyImageUrl } from "@/lib/references";

export type GalleryClientStatus = "draft" | "published";

export interface GalleryClient {
  id: string;
  slug: string;
  name: string;
  status: GalleryClientStatus;
  drive_folder_id: string | null;
  drive_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GalleryImage {
  id: string;
  client_id: string;
  position: number;
  image_url: string;
  source_url: string | null;
  caption: string;
  selected: boolean;
  drive_file_id: string | null;
  mime_type: string | null;
  drive_relative_path: string | null;
  drive_modified_time: string | null;
  created_at: string;
}

export function isGalleryImageVideo(image: GalleryImage): boolean {
  return Boolean(image.mime_type?.startsWith("video/"));
}

/**
 * Miniatura leve pra usar no grid (e como poster de vídeo) — pra fotos/vídeos
 * sincronizados do Drive, usa o preview otimizado do próprio Drive em vez do
 * arquivo original inteiro (mais rápido, mais leve). Itens adicionados por
 * link manual não têm proxy de miniatura — usam a imagem direto.
 */
export function galleryThumbnailUrl(image: GalleryImage, size?: number): string {
  if (!image.drive_file_id) return image.image_url;
  return size
    ? `/api/drive-thumbnail/${image.drive_file_id}?size=${size}`
    : `/api/drive-thumbnail/${image.drive_file_id}`;
}

/**
 * Link de download do arquivo original (não a miniatura) — usado no botão
 * "Baixar" do lightbox. Pra itens do Drive, adiciona ?download=1 pro proxy
 * responder com Content-Disposition: attachment (nome do arquivo original).
 */
export function galleryDownloadUrl(image: GalleryImage): string {
  return image.drive_file_id
    ? `${image.image_url}?download=1`
    : image.image_url;
}

/**
 * Se o item pode ser aberto em qualidade completa dentro do próprio app
 * (imagem/vídeo em formato que o navegador realmente renderiza).
 */
export function isGalleryImageRenderableInApp(image: GalleryImage): boolean {
  if (image.mime_type) return isRenderableMediaMimeType(image.mime_type);
  return Boolean(image.source_url) || isLikelyImageUrl(image.image_url);
}

// Preview grande usado ao ampliar a foto — bem mais leve e rápido que
// buscar o arquivo original inteiro, e suficiente pra qualquer tela.
const LIGHTBOX_PREVIEW_SIZE = 1600;
const GRID_THUMBNAIL_SIZE = 640;

export interface GalleryDisplayItem {
  id: string;
  kind: "image" | "video" | "file";
  thumbSrc: string;
  /** Preview grande (não o arquivo bruto) usado no lightbox/player. */
  previewSrc: string;
  /** Arquivo original, só usado pro botão de download. */
  downloadSrc: string;
  sourceUrl: string | null;
  caption: string;
  createdAt: string;
  /** Data real de captura/modificação do arquivo (Drive) — cai pra
   * created_at quando não vem do Drive (item adicionado manualmente). */
  capturedAt: string;
}

export interface GalleryFolderNode {
  name: string;
  /** Caminho completo até essa pasta (chave única, usada pra navegação). */
  path: string;
  folders: GalleryFolderNode[];
  items: GalleryDisplayItem[];
  /** Mais recente created_at entre todos os itens dentro dessa pasta
   * (recursivo) — usado pra ordenar pastas por "última adição". */
  latestAddedAt: string;
}

function toDisplayItem(image: GalleryImage): GalleryDisplayItem {
  const renderable = isGalleryImageRenderableInApp(image);
  const video = isGalleryImageVideo(image);
  return {
    id: image.id,
    kind: !renderable ? "file" : video ? "video" : "image",
    thumbSrc: galleryThumbnailUrl(image, GRID_THUMBNAIL_SIZE),
    // Vídeo precisa do arquivo de mídia de verdade pra tocar — a miniatura
    // do Drive é só um JPEG, nunca serve de <source> de vídeo. Só imagem se
    // beneficia do preview grande (mais leve que o arquivo original).
    previewSrc:
      image.drive_file_id && !video
        ? galleryThumbnailUrl(image, LIGHTBOX_PREVIEW_SIZE)
        : image.image_url,
    downloadSrc: galleryDownloadUrl(image),
    sourceUrl: image.source_url,
    caption: image.caption,
    createdAt: image.created_at,
    capturedAt: image.drive_modified_time ?? image.created_at,
  };
}

/**
 * Monta a árvore de pastas (a partir de `drive_relative_path`, ex:
 * "02.FEVEREIRO/FOTOS") pra navegação tipo Finder na galeria pública — cada
 * segmento do caminho vira uma pasta clicável, com as fotos/vídeos só
 * aparecendo dentro da pasta certa. Itens sem subpasta (link manual ou solto
 * na raiz) caem direto em `items` da raiz.
 */
export function buildGalleryFolderTree(images: GalleryImage[]): GalleryFolderNode {
  const root: GalleryFolderNode = {
    name: "",
    path: "",
    folders: [],
    items: [],
    latestAddedAt: new Date(0).toISOString(),
  };

  for (const image of images) {
    const segments = (image.drive_relative_path ?? "")
      .split("/")
      .map((segment) => segment.trim())
      .filter(Boolean);

    let node = root;
    let path = "";
    for (const segment of segments) {
      path = path ? `${path}/${segment}` : segment;
      let child = node.folders.find((folder) => folder.name === segment);
      if (!child) {
        child = {
          name: segment,
          path,
          folders: [],
          items: [],
          latestAddedAt: new Date(0).toISOString(),
        };
        node.folders.push(child);
      }
      node = child;
    }

    node.items.push(toDisplayItem(image));
  }

  function computeLatestAddedAt(node: GalleryFolderNode): string {
    let latest = node.items.reduce(
      (max, item) => (item.createdAt > max ? item.createdAt : max),
      new Date(0).toISOString()
    );
    for (const folder of node.folders) {
      const folderLatest = computeLatestAddedAt(folder);
      if (folderLatest > latest) latest = folderLatest;
    }
    node.latestAddedAt = latest;
    return latest;
  }
  computeLatestAddedAt(root);

  return root;
}

export interface GalleryClientWithImages extends GalleryClient {
  images: GalleryImage[];
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

async function generateUniqueSlug(name: string) {
  const supabase = getSupabaseServerClient();
  const base = slugify(name) || "cliente";

  let candidate = base;
  let attempt = 0;

  while (true) {
    const { data, error } = await supabase
      .from("gallery_clients")
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

export async function listGalleryClients(): Promise<GalleryClient[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("gallery_clients")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

async function attachImages(
  client: GalleryClient
): Promise<GalleryClientWithImages> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("gallery_images")
    .select("*")
    .eq("client_id", client.id)
    .order("position", { ascending: true });

  if (error) throw error;
  return { ...client, images: data ?? [] };
}

export async function getGalleryClientWithImages(
  id: string
): Promise<GalleryClientWithImages | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("gallery_clients")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return attachImages(data);
}

export async function getGalleryClientBySlugWithImages(
  slug: string
): Promise<GalleryClientWithImages | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("gallery_clients")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return attachImages(data);
}

export async function createGalleryClient(
  name: string
): Promise<GalleryClient> {
  const supabase = getSupabaseServerClient();
  const slug = await generateUniqueSlug(name || "novo-cliente");

  const { data, error } = await supabase
    .from("gallery_clients")
    .insert({ name: name || "Novo cliente", slug })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateGalleryClientName(id: string, name: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("gallery_clients")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function setGalleryClientStatus(
  id: string,
  status: GalleryClientStatus
) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("gallery_clients")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteGalleryClient(id: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("gallery_clients").delete().eq("id", id);
  if (error) throw error;
}

async function nextImagePosition(clientId: string) {
  const supabase = getSupabaseServerClient();
  const { count, error } = await supabase
    .from("gallery_images")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId);

  if (error) throw error;
  return count ?? 0;
}

export async function addGalleryImage(
  clientId: string,
  fields: { image_url: string; source_url?: string | null; caption: string }
) {
  const supabase = getSupabaseServerClient();
  const position = await nextImagePosition(clientId);
  const { error } = await supabase.from("gallery_images").insert({
    client_id: clientId,
    position,
    image_url: fields.image_url,
    source_url: fields.source_url ?? null,
    caption: fields.caption,
  });
  if (error) throw error;
}

export async function deleteGalleryImage(id: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("gallery_images").delete().eq("id", id);
  if (error) throw error;
}


/**
 * Substitui todas as fotos vindas do Drive de um cliente pela lista atual da
 * pasta (sincronização = espelha o estado da pasta, não faz merge). Fotos
 * adicionadas manualmente por link (drive_file_id nulo) não são afetadas.
 */
export async function replaceGalleryImagesFromDrive(
  clientId: string,
  folderId: string,
  files: {
    id: string;
    name: string;
    mimeType: string;
    relativePath: string;
    modifiedTime: string | null;
  }[]
) {
  const supabase = getSupabaseServerClient();

  const { error: deleteError } = await supabase
    .from("gallery_images")
    .delete()
    .eq("client_id", clientId)
    .not("drive_file_id", "is", null);
  if (deleteError) throw deleteError;

  if (files.length > 0) {
    const rows = files.map((file, index) => ({
      client_id: clientId,
      position: index,
      image_url: `/api/drive-image/${file.id}`,
      source_url: `https://drive.google.com/file/d/${file.id}/view`,
      caption: file.name,
      drive_file_id: file.id,
      mime_type: file.mimeType,
      drive_relative_path: file.relativePath || null,
      drive_modified_time: file.modifiedTime,
    }));
    const { error: insertError } = await supabase
      .from("gallery_images")
      .insert(rows);
    if (insertError) throw insertError;
  }

  const { error: updateError } = await supabase
    .from("gallery_clients")
    .update({
      drive_folder_id: folderId,
      drive_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", clientId);
  if (updateError) throw updateError;
}

/**
 * Confirma que um fileId é de uma foto que já foi sincronizada pra alguma
 * galeria (não um jeito de baixar qualquer arquivo do Drive da conta
 * conectada por ID adivinhado) e devolve o nome original, usado como nome
 * de arquivo no download.
 */
export async function getKnownDriveFileByFileId(
  fileId: string
): Promise<{ caption: string; published: boolean } | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("gallery_images")
    .select("caption, gallery_clients(status)")
    .eq("drive_file_id", fileId);
  if (error) throw error;
  if (!data || data.length === 0) return null;

  // O mesmo arquivo do Drive pode estar em mais de uma galeria. Só libera
  // cache compartilhado se alguma delas já está publicada — enquanto for só
  // rascunho, a resposta não pode ficar guardada no CDN.
  const published = data.some((row) => {
    const client = row.gallery_clients as unknown as
      | { status: string }
      | { status: string }[]
      | null;
    if (!client) return false;
    return Array.isArray(client)
      ? client.some((entry) => entry.status === "published")
      : client.status === "published";
  });

  return { caption: data[0].caption, published };
}
