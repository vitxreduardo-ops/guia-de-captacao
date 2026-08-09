import { NextResponse } from "next/server";
import { getBudgetBySlugWithSections } from "@/lib/budgets";
import { renderBudgetPdfBuffer } from "@/components/pdf/BudgetPdfDocument";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export async function GET(
  _request: Request,
  { params }: { params: Params }
) {
  const { slug } = await params;
  const budget = await getBudgetBySlugWithSections(slug);

  if (!budget) {
    return NextResponse.json(
      { error: "Orçamento não encontrado" },
      { status: 404 }
    );
  }

  const buffer = await renderBudgetPdfBuffer(budget);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${budget.slug}.pdf"`,
    },
  });
}
