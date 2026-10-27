import { NextResponse, type NextRequest } from "next/server";
import { getCurrentSession } from "@/lib/session";
import {
  connectInstagramAccount,
  INSTAGRAM_STATE_CADASTRO,
  INSTAGRAM_STATE_PREFIX,
} from "@/lib/instagram";

export async function GET(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const params = request.nextUrl.searchParams;
  const state = params.get("state") ?? "";
  const code = params.get("code");
  const voltarAoCadastro = state.endsWith(INSTAGRAM_STATE_CADASTRO);
  const clientId = state.startsWith(INSTAGRAM_STATE_PREFIX)
    ? state
        .slice(INSTAGRAM_STATE_PREFIX.length, voltarAoCadastro ? -INSTAGRAM_STATE_CADASTRO.length : undefined)
    : null;
  const destination = new URL(
    voltarAoCadastro
      ? `/admin/clientes/cadastro?abrir=${clientId ?? ""}`
      : "/admin/clientes/entregas",
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
