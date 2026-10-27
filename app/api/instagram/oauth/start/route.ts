import { NextResponse, type NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { buildInstagramAuthUrl } from "@/lib/instagram";

export async function GET(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) redirect("/admin/login");

  const clientId = request.nextUrl.searchParams.get("cliente");
  if (!clientId) {
    return NextResponse.json({ error: "Falta ?cliente=<id>" }, { status: 400 });
  }
  const voltarAoCadastro = request.nextUrl.searchParams.get("voltar") === "cadastro";
  return NextResponse.redirect(buildInstagramAuthUrl(clientId, voltarAoCadastro));
}
