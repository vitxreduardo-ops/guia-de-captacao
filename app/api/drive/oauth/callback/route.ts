import { NextResponse, type NextRequest } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { connectGoogleAccount } from "@/lib/googleDrive";

export async function GET(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const code = request.nextUrl.searchParams.get("code");
  const oauthError = request.nextUrl.searchParams.get("error");

  if (oauthError || !code) {
    return NextResponse.redirect(
      new URL(
        `/admin/galerias?drive_error=${encodeURIComponent(oauthError ?? "sem_codigo")}`,
        request.url
      )
    );
  }

  try {
    await connectGoogleAccount(code);
  } catch (error) {
    console.error("[drive oauth callback]", error);
    return NextResponse.redirect(
      new URL(
        `/admin/galerias?drive_error=${encodeURIComponent(
          error instanceof Error ? error.message : "erro_desconhecido"
        )}`,
        request.url
      )
    );
  }

  return NextResponse.redirect(new URL("/admin/galerias?drive_connected=1", request.url));
}
