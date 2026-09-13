import { NextResponse, type NextRequest } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { getReferencesFolderId, uploadDriveFile } from "@/lib/googleDrive";

/** 200 MB. Acima disso o upload multipart deixa de ser adequado e o caminho
 *  certo passa a ser o resumável, que não existe aqui. */
const MAX_BYTES = 200 * 1024 * 1024;

/**
 * Recebe o arquivo da referência e grava na pasta fixa do Drive, devolvendo o
 * id pra gravação do registro.
 *
 * É rota, e não server action, porque o corpo de uma action tem limite de
 * alguns MB — um webm de ensaio estoura isso e o erro aparece como falha
 * genérica do formulário.
 */
export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Sem sessão" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Arquivo ausente" }, { status: 400 });
  }

  // Tipo vem do navegador e serve só pra recusar o que a tela não sabe
  // mostrar (zip, pdf): quem decide o que vai no mural é o próprio painel.
  if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
    return NextResponse.json(
      { error: "Só imagem ou vídeo" },
      { status: 415 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Arquivo maior que 200 MB" },
      { status: 413 }
    );
  }

  const fileId = await uploadDriveFile(getReferencesFolderId(), file);

  return NextResponse.json({
    fileId,
    kind: file.type.startsWith("video/") ? "video" : "image",
  });
}
