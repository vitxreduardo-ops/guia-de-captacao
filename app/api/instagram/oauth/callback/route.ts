import { NextResponse, type NextRequest } from "next/server";
import { getCurrentSession } from "@/lib/session";
import {
  connectInstagramAccount,
  INSTAGRAM_STATE_CADASTRO,
  INSTAGRAM_STATE_CONVITE,
  INSTAGRAM_STATE_PREFIX,
  readInstagramInviteToken,
} from "@/lib/instagram";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const state = params.get("state") ?? "";

  // Volta do convite: quem conectou foi o cliente, sem sessão do painel.
  if (state.startsWith(INSTAGRAM_STATE_CONVITE)) {
    const token = state.slice(INSTAGRAM_STATE_CONVITE.length);
    const clientId = readInstagramInviteToken(token);
    const code = params.get("code");
    const destination = new URL(`/conectar-instagram/${encodeURIComponent(token)}`, request.url);
    if (!clientId || !code || params.get("error")) {
      destination.searchParams.set("instagram", "negado");
      return NextResponse.redirect(destination);
    }
    try {
      await connectInstagramAccount(clientId, code);
      destination.searchParams.set("instagram", "conectado");
    } catch (err) {
      console.error("Falha ao conectar Instagram (convite)", err);
      destination.searchParams.set("instagram", "erro");
    }
    return NextResponse.redirect(destination);
  }

  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const code = params.get("code");
  const voltarAoCadastro = state.endsWith(INSTAGRAM_STATE_CADASTRO);
  const clientId = state.startsWith(INSTAGRAM_STATE_PREFIX)
    ? state
        .slice(INSTAGRAM_STATE_PREFIX.length, voltarAoCadastro ? -INSTAGRAM_STATE_CADASTRO.length : undefined)
    : null;
  const destination = new URL(
    voltarAoCadastro
      ? `/admin/financeiro/clientes?abrir=${clientId ?? ""}`
      : "/admin/entregas",
    request.url
  );

  if (!clientId || !code || params.get("error")) {
    destination.searchParams.set("instagram", "negado");
    return NextResponse.redirect(destination);
  }
  try {
    await connectInstagramAccount(clientId, code);
    destination.searchParams.set("instagram", "conectado");
  } catch (err) {
    console.error("Falha ao conectar Instagram", err);
    destination.searchParams.set("instagram", "erro");
  }
  return NextResponse.redirect(destination);
}
