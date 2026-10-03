import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/lib/auth";

/**
 * Sessão cujo usuário não existe mais (acesso apagado): o cookie ainda tem
 * assinatura válida, então o proxy manda o login de volta pro portal e o
 * portal de volta pro login. Aqui o cookie é limpo e o ciclo acaba.
 */
export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/admin/login", request.url));
  response.cookies.delete(COOKIE_NAME);
  return response;
}
