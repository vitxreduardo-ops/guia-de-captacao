import { NextResponse } from "next/server";
import { getContract } from "@/lib/contracts";
import { renderContractBody } from "@/lib/contractBody";
import { renderContractPdfBuffer } from "@/components/pdf/ContractPdfDocument";
import { requireTeam } from "@/lib/session";
import { slugify } from "@/lib/slug";

export const dynamic = "force-dynamic";

/**
 * O contrato em PDF, no texto que o cliente lê: variáveis trocadas e o que
 * está desligado fora. Sob `/admin` e com `requireTeam`, como o resto de
 * contratos: o PDF de um rascunho não é para sair daqui.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  await requireTeam("contratos");
  const { id } = await params;
  const contract = await getContract(id);
  if (!contract) {
    return NextResponse.json(
      { error: "Contrato não encontrado" },
      { status: 404 },
    );
  }

  const buffer = await renderContractPdfBuffer({
    title: contract.client_name || contract.title,
    eyebrow:
      contract.kind === "mensal"
        ? "Contrato de prestação de serviços"
        : "Contrato de projeto",
    text: renderContractBody(contract.body, contract),
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="contrato-${
        slugify(contract.client_name || contract.title) || "contrato"
      }.pdf"`,
    },
  });
}
