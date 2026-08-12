import { NextResponse, type NextRequest } from "next/server";
import { fetchDriveFileBytes } from "@/lib/googleDrive";
import { getKnownDriveFileByFileId } from "@/lib/galleries";

type Params = Promise<{ fileId: string }>;

export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  const { fileId } = await params;

  const known = await getKnownDriveFileByFileId(fileId);
  if (!known) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  const range = request.headers.get("range");
  const file = await fetchDriveFileBytes(fileId, range);
  if (!file) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  const headers = new Headers({
    "Content-Type": file.contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
  });
  if (file.contentRange) headers.set("Content-Range", file.contentRange);
  if (file.contentLength) headers.set("Content-Length", file.contentLength);

  const isDownload = request.nextUrl.searchParams.get("download") === "1";
  if (isDownload) {
    headers.set(
      "Content-Disposition",
      `attachment; filename="${known.caption.replace(/"/g, "")}"`
    );
  }

  return new NextResponse(file.body, { status: file.status, headers });
}
