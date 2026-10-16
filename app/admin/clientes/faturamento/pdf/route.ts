import { NextResponse } from "next/server";
import { getLiveInvoice } from "@/lib/dinheiro";
import { renderInvoicePdfBuffer } from "@/components/pdf/InvoicePdfDocument";
import {
  DEFAULT_INVOICE_CLOSING,
  DEFAULT_INVOICE_PAYMENT,
} from "@/lib/billingTypes";
import { assertClientAllowed, getCurrentClientScope } from "@/lib/clientAccess";

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

  const scope = await getCurrentClientScope();
  try {
    assertClientAllowed(scope, clientId);
  } catch {
    return NextResponse.json({ error: "Cliente fora do seu acesso" }, { status: 403 });
  }

  // Montado na hora com o que está no quadro: não precisa "fechar o mês".
  const invoice = await getLiveInvoice(clientId, month, scope);
  if (!invoice) {
    return NextResponse.json({ error: "Sem entregas neste mês" }, { status: 404 });
  }

  // Sem `texto` na URL vale o fecho padrão; com o campo vazio, o relatório sai
  // sem fecho nenhum — tem cliente que não precisa de recado.
  const closing = url.searchParams.get("texto");
  const buffer = await renderInvoicePdfBuffer(
    invoice,
    closing === null ? DEFAULT_INVOICE_CLOSING : closing,
    url.searchParams.get("pagamento") ?? DEFAULT_INVOICE_PAYMENT
  );
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
