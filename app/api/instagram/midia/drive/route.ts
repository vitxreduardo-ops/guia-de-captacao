import { NextResponse, type NextRequest } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { fetchDriveFileBytes } from "@/lib/googleDrive";
import { getSupabaseServerClient, REFERENCES_BUCKET } from "@/lib/supabase/server";
import {
  extractDriveFileId,
  IG_FORMAT_ERROR,
  IG_MEDIA_PREFIX,
  igExtensionFor,
} from "@/lib/instagramMidia";

export const maxDuration = 300;

/** 150 MB: o arquivo inteiro passa pela memória da função. */
const MAX_BYTES = 150 * 1024 * 1024;

/**
 * Copia um arquivo do Drive do estúdio (link de compartilhamento) pro Storage
 * público e devolve o link que o Instagram consegue baixar. O Drive não serve:
 * o link dele exige login e, em arquivo grande, devolve uma página de aviso em
 * vez do vídeo. A cópia usa a conexão do Drive já feita no sistema, então o
 * arquivo nem precisa estar público.
 */
export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session || session.role === "client") {
    return NextResponse.json({ error: "Sem sessão" }, { status: 401 });
  }

  const { url } = (await request.json().catch(() => ({}))) as { url?: string };
  const fileId = extractDriveFileId(url ?? "");
  if (!fileId) {
    return NextResponse.json({ error: "Isso não parece um link de arquivo do Drive." }, { status: 400 });
  }

  const file = await fetchDriveFileBytes(fileId).catch(() => null);
  if (!file) {
    return NextResponse.json(
      { error: "Não achei o arquivo. Confira se ele está no Drive conectado ao sistema." },
      { status: 404 }
    );
  }

  const extension = igExtensionFor(file.contentType);
  if (!extension) {
    await file.body.cancel();
    return NextResponse.json({ error: IG_FORMAT_ERROR }, { status: 415 });
  }
  if (Number(file.contentLength ?? 0) > MAX_BYTES) {
    await file.body.cancel();
    return NextResponse.json({ error: "Arquivo acima de 150 MB." }, { status: 413 });
  }

  const supabase = getSupabaseServerClient();
  const path = `${IG_MEDIA_PREFIX}/${crypto.randomUUID()}.${extension}`;
  const bytes = await new Response(file.body).arrayBuffer();
  const { error } = await supabase.storage
    .from(REFERENCES_BUCKET)
    .upload(path, bytes, { contentType: file.contentType, upsert: false });
  if (error) {
    console.error("Falha ao copiar mídia do Drive pro Storage", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    publicUrl: supabase.storage.from(REFERENCES_BUCKET).getPublicUrl(path).data.publicUrl,
  });
}
