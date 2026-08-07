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
