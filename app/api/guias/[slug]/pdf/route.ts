import { NextResponse } from "next/server";
import { getGuideBySlugWithSections } from "@/lib/guides";
import { renderGuidePdfBuffer } from "@/components/pdf/GuidePdfDocument";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function GET(
  _request: Request,
  { params }: { params: Params }
) {
  const { slug } = await params;
  const guide = await getGuideBySlugWithSections(slug);

  if (!guide) {
    return NextResponse.json({ error: "Guia não encontrado" }, { status: 404 });
  }

  const buffer = await renderGuidePdfBuffer(guide);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${guide.slug}.pdf"`,
    },
  });
}
