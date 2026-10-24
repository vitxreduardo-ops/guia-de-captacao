import { NextResponse, type NextRequest } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { getSupabaseServerClient, REFERENCES_BUCKET } from "@/lib/supabase/server";
import { IG_FORMAT_ERROR, IG_MEDIA_PREFIX, igExtensionFor } from "@/lib/instagramMidia";

/**
 * Gera uma URL de envio direto pro Storage. O arquivo vai do navegador pro
 * Supabase sem passar pela Vercel, que recusa corpo acima de ~4,5 MB — pouco
 * pra um Reel.
 */
export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session || session.role === "client") {
    return NextResponse.json({ error: "Sem sessão" }, { status: 401 });
  }

  const { type } = (await request.json().catch(() => ({}))) as { type?: string };
  const extension = igExtensionFor(type ?? "");
  if (!extension) {
    return NextResponse.json({ error: IG_FORMAT_ERROR }, { status: 415 });
  }

  const supabase = getSupabaseServerClient();
  const path = `${IG_MEDIA_PREFIX}/${crypto.randomUUID()}.${extension}`;
  const { data, error } = await supabase.storage
    .from(REFERENCES_BUCKET)
    .createSignedUploadUrl(path);
  if (error || !data) {
    console.error("Falha ao assinar envio do Instagram", error);
    return NextResponse.json({ error: "Falha ao preparar o envio" }, { status: 500 });
  }

  return NextResponse.json({
    signedUrl: data.signedUrl,
    publicUrl: supabase.storage.from(REFERENCES_BUCKET).getPublicUrl(path).data.publicUrl,
  });
}
