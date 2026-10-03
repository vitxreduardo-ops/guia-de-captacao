import { NextResponse } from "next/server";
import { assertClientAllowed, getCurrentClientScope } from "@/lib/clientAccess";
import { PREVIEW_COOKIE } from "@/lib/clientPortal";
import { getCurrentSession } from "@/lib/session";

/**
 * "Ver como o cliente": o admin escolhe um cliente e passa a ver o portal
 * dele, só leitura, sem trocar de login. `?sair=1` volta pro calendário.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const session = await getCurrentSession();
  if (session?.role !== "admin") {
    return NextResponse.redirect(new URL("/admin/login", url));
  }

  if (url.searchParams.get("sair")) {
    const response = NextResponse.redirect(
      new URL("/admin/clientes/calendario", url)
    );
    response.cookies.delete(PREVIEW_COOKIE);
    return response;
  }

  const clientId = url.searchParams.get("cliente") ?? "";
  assertClientAllowed(await getCurrentClientScope(), clientId);
  const response = NextResponse.redirect(new URL("/cliente", url));
  response.cookies.set(PREVIEW_COOKIE, clientId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
  return response;
}
