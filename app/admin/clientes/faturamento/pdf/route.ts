import { NextResponse } from "next/server";
import { getInvoice } from "@/lib/billing";
import { renderInvoicePdfBuffer } from "@/components/pdf/InvoicePdfDocument";

export const dynamic = "force-dynamic";

/**
 * Relatório de entregas do mês fechado, pra mandar junto com a nota fiscal.
 * Fica sob `/admin` de propósito: o proxy já barra quem não tem sessão, e
 * essa lista é dinheiro de cliente.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const clientId = url.searchParams.get("cliente");
  const month = url.searchParams.get("mes");

  if (!clientId || !month) {
    return NextResponse.json({ error: "Informe cliente e mês" }, { status: 400 });
  }

  const invoice = await getInvoice(clientId, month);
  if (!invoice) {
    return NextResponse.json({ error: "Mês não fechado" }, { status: 404 });
  }

  const buffer = await renderInvoicePdfBuffer(invoice);
  const slug = invoice.client_name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="entregas-${slug}-${invoice.month.slice(
        0,
        7
      )}.pdf"`,
    },
  });
}
