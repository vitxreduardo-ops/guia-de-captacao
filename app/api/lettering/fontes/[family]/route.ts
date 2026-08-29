import { NextResponse } from "next/server";
import { baixarFonte } from "@/lib/letteringLibrary";
import { getCurrentSession } from "@/lib/session";

/**
 * Serve o arquivo da fonte pro navegador registrar com FontFace.
 *
 * O bucket é privado de propósito — fonte de cliente é arquivo licenciado, não
 * conteúdo público. O proxy só protege /admin, então a sessão é conferida aqui
 * dentro: sem isso a fonte de todo cliente ficaria aberta na internet.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ family: string }> },
) {
  if (!(await getCurrentSession())) {
    return NextResponse.json({ erro: "sem sessão" }, { status: 401 });
  }

  const { family } = await params;
  const arquivo = await baixarFonte(decodeURIComponent(family));

  if (!arquivo) {
    return NextResponse.json({ erro: "fonte não encontrada" }, { status: 404 });
  }

  return new NextResponse(arquivo, {
    headers: {
      "content-type": "font/ttf",
      // A família é única por arquivo: trocar a fonte cria outra família.
      "cache-control": "private, max-age=31536000, immutable",
    },
  });
}
