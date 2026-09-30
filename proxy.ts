import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAME, getSession } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const isLoginPage = request.nextUrl.pathname === "/admin/login";
  const secret = process.env.ADMIN_PASSWORD;
  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  const session = secret ? await getSession(cookie, secret) : null;

  const isPortal = request.nextUrl.pathname.startsWith("/cliente");
  const home = session?.role === "client" ? "/cliente" : "/admin";

  if (isLoginPage) {
    if (session) {
      return NextResponse.redirect(new URL(home, request.url));
    }
    return NextResponse.next();
  }

  if (!session) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Cliente só existe no portal; o resto do sistema é interno.
  if (session.role === "client" && !isPortal) {
    return NextResponse.redirect(new URL("/cliente", request.url));
  }
  if (isPortal) return NextResponse.next();

  // Admin sempre passa; `allowedSections` nula é "sem restrição" (o padrão).
  // `/admin/usuarios` é sempre admin-only, checado à parte em requireAdmin().
  if (session.role !== "admin" && session.allowedSections !== null) {
    const section = request.nextUrl.pathname.split("/")[2];
    if (section && !session.allowedSections.includes(section)) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/cliente/:path*"],
};
