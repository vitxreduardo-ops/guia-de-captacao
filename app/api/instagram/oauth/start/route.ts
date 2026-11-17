import { NextResponse, type NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import {
  buildInstagramAuthUrl,
  buildInstagramInviteAuthUrl,
  readInstagramInviteToken,
} from "@/lib/instagram";

export async function GET(request: NextRequest) {
  // Link de convite: o cliente chega sem login, a assinatura do token é a prova.
  const convite = request.nextUrl.searchParams.get("convite");
  if (convite) {
    if (!readInstagramInviteToken(convite)) {
      return NextResponse.json({ error: "Convite inválido" }, { status: 400 });
    }
    return NextResponse.redirect(buildInstagramInviteAuthUrl(convite));
  }

  const session = await getCurrentSession();
  if (!session) redirect("/admin/login");

  const clientId = request.nextUrl.searchParams.get("cliente");
  if (!clientId) {
    return NextResponse.json({ error: "Falta ?cliente=<id>" }, { status: 400 });
  }
  const voltarAoCadastro = request.nextUrl.searchParams.get("voltar") === "cadastro";
  return NextResponse.redirect(buildInstagramAuthUrl(clientId, voltarAoCadastro));
}
