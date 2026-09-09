import "server-only";
import { getSupabaseServerClient, REFERENCES_BUCKET } from "@/lib/supabase/server";

export async function uploadReferenceImage(
  guideId: string,
  file: File
): Promise<string> {
  const supabase = getSupabaseServerClient();
  const extension = file.name.split(".").pop() || "jpg";
  const path = `${guideId}/${crypto.randomUUID()}.${extension}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error } = await supabase.storage
    .from(REFERENCES_BUCKET)
    .upload(path, arrayBuffer, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from(REFERENCES_BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
}

export async function uploadBudgetReferenceImage(
  budgetId: string,
  file: File
): Promise<string> {
  const supabase = getSupabaseServerClient();
  const extension = file.name.split(".").pop() || "jpg";
  const path = `budgets/${budgetId}/${crypto.randomUUID()}.${extension}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error } = await supabase.storage
    .from(REFERENCES_BUCKET)
    .upload(path, arrayBuffer, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from(REFERENCES_BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
}

const MAX_MIRROR_BYTES = 15 * 1024 * 1024;

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

/**
 * Copia uma imagem remota pro nosso bucket e devolve a URL pública.
 *
 * O og:image do Instagram/Facebook é uma URL assinada que expira em alguns
 * dias — guardar essa URL no banco faz a referência sumir sozinha depois. Aqui
 * a imagem é baixada uma vez e passa a ser servida por nós.
 *
 * Devolve null se a cópia falhar (link fora do ar, resposta que não é imagem,
 * arquivo grande demais); nesse caso o chamador segue com a URL original, que
 * é o comportamento antigo.
 */
export async function mirrorRemoteImage(
  pathPrefix: string,
  url: string
): Promise<string | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) {
      console.error(`[mirrorRemoteImage] status ${response.status} em ${url}`);
      return null;
    }

    const contentType = (
      response.headers.get("content-type") ?? ""
    ).split(";")[0].trim().toLowerCase();
    if (!contentType.startsWith("image/")) {
      console.error(
        `[mirrorRemoteImage] resposta não é imagem (${contentType}) em ${url}`
      );
      return null;
    }

    const bytes = await response.arrayBuffer();
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_MIRROR_BYTES) {
      console.error(
        `[mirrorRemoteImage] tamanho fora do limite (${bytes.byteLength}) em ${url}`
      );
      return null;
    }

    const extension = EXTENSION_BY_TYPE[contentType] ?? "jpg";
    const path = `${pathPrefix}/${crypto.randomUUID()}.${extension}`;
    const supabase = getSupabaseServerClient();

    const { error } = await supabase.storage
      .from(REFERENCES_BUCKET)
      .upload(path, bytes, { contentType, upsert: false });

    if (error) {
      console.error(`[mirrorRemoteImage] upload falhou:`, error);
      return null;
    }

    const { data } = supabase.storage
      .from(REFERENCES_BUCKET)
      .getPublicUrl(path);

    return data.publicUrl;
  } catch (error) {
    console.error(`[mirrorRemoteImage] erro ao copiar ${url}:`, error);
    return null;
  }
}
