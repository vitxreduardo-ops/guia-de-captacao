import { NextResponse, type NextRequest } from "next/server";
import QRCode from "qrcode";
import { requireTeam } from "@/lib/session";
import { slugValido } from "@/lib/shortLinkSlug";

/** QR do link curto, em PNG grande (serve pra imprimir). `?baixar=1` força o download. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  await requireTeam("links");
  const { slug } = await params;
  if (!slugValido(slug)) return new NextResponse("Not found", { status: 404 });
  const png = await QRCode.toBuffer(`https://tatuestudio.com.br/${slug}`, { width: 1024, margin: 2 });
  const headers: Record<string, string> = { "content-type": "image/png", "cache-control": "private, max-age=3600" };
  if (request.nextUrl.searchParams.has("baixar")) headers["content-disposition"] = `attachment; filename="qr-${slug}.png"`;
  return new NextResponse(new Uint8Array(png), { headers });
}
