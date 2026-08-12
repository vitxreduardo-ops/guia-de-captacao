import { NextResponse, type NextRequest } from "next/server";
import { fetchDriveThumbnailBytes } from "@/lib/googleDrive";
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

  const sizeParam = request.nextUrl.searchParams.get("size");
  const size = sizeParam ? Number(sizeParam) : undefined;

  const thumbnail = await fetchDriveThumbnailBytes(
    fileId,
    size && Number.isFinite(size) ? size : undefined
  );
  if (!thumbnail) {
    return NextResponse.json({ error: "Sem miniatura" }, { status: 404 });
  }

  return new NextResponse(thumbnail.body, {
    headers: {
      "Content-Type": thumbnail.contentType,
      "Cache-Control": "private, max-age=86400",
    },
  });
}
