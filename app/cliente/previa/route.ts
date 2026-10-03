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
    const was = request.headers.get("cookie")?.match(/portal_preview=([^;]+)/)?.[1];
    const response = NextResponse.redirect(
      new URL(was ? `/admin/area-do-cliente/${was}` : "/admin/area-do-cliente", url)
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
    // 30 dias: reabrir o app instalado volta pro mesmo cliente, sem escolher de novo.
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
