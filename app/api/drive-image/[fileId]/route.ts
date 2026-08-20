import { NextResponse, type NextRequest } from "next/server";
import { fetchDriveFileBytes } from "@/lib/googleDrive";
import { getKnownDriveFileByFileId } from "@/lib/galleries";

type Params = Promise<{ fileId: string }>;

const RANGE_CHUNK_BYTES = 2 * 1024 * 1024;

function capOpenEndedRange(range: string | null): string | null {
  if (!range) return null;
  const match = /^bytes=(\d+)-(\d*)$/.exec(range.trim());
  if (!match) return range;
  const start = Number(match[1]);
  if (match[2]) return range;
  return `bytes=${start}-${start + RANGE_CHUNK_BYTES - 1}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  const { fileId } = await params;

  const known = await getKnownDriveFileByFileId(fileId);
  if (!known) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  // O player abre o vídeo pedindo "bytes=0-", ou seja, o arquivo inteiro a
  // partir do começo. Como a resposta só sai daqui depois que o trecho todo
  // chega do Drive, atender esse pedido ao pé da letra significa esperar
  // dezenas de MB antes do primeiro byte — o vídeo fica parado vários
  // segundos. Recortamos pedidos sem fim declarado num bloco de tamanho fixo
  // e devolvemos 206: o player recebe o começo rápido e vai pedindo o resto
  // conforme toca, que é como ele já espera funcionar.
  const range = capOpenEndedRange(request.headers.get("range"));
  let file: Awaited<ReturnType<typeof fetchDriveFileBytes>>;
  try {
    file = await fetchDriveFileBytes(fileId, range, request.signal);
  } catch (error) {
    // Cliente desistiu no meio (fechou o player, pulou de trecho). Não é
    // falha do servidor — virar 500 só polui o log de erro de verdade.
    if (request.signal.aborted) return new NextResponse(null, { status: 499 });
    throw error;
  }
  if (!file) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  // Resposta parcial (206, quando o player pede um trecho do vídeo) fica
  // fora do cache compartilhado: é um pedaço do arquivo atrelado ao Range
  // que aquele cliente pediu, não a resposta inteira.
  const cacheable = known.published && file.status === 200;

  const headers = new Headers({
    "Content-Type": file.contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": cacheable
      ? "public, max-age=3600, s-maxage=3600"
      : "private, max-age=3600",
  });
  if (file.contentRange) headers.set("Content-Range", file.contentRange);
  if (file.contentLength) headers.set("Content-Length", file.contentLength);

  const isDownload = request.nextUrl.searchParams.get("download") === "1";
  if (isDownload) {
    // Cabeçalho HTTP só aceita ASCII, e nome de arquivo com acento ("Rádio
    // _1.mp4") estourava aqui — o download inteiro virava 500. Mandamos uma
    // versão sem acento como filename comum e o nome real em filename*
    // (RFC 5987), que todo navegador atual prefere.
    const rawName = known.caption.replace(/"/g, "");
    const asciiName =
      rawName
        .normalize("NFKD")
        .replace(/[^\x20-\x7E]/g, "")
        .trim() || "arquivo";
    headers.set(
      "Content-Disposition",
      `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(rawName)}`
    );
  }

  return new NextResponse(file.body, { status: file.status, headers });
}
