import { NextResponse, type NextRequest } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { connectGoogleAccount } from "@/lib/googleDrive";
import {
  CALENDAR_OAUTH_STATE,
  connectUserCalendar,
  getUserCalendarAccount,
} from "@/lib/userCalendars";
import { syncAllCardsToAccount } from "@/lib/googleCalendar";

export async function GET(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  const code = request.nextUrl.searchParams.get("code");
  const oauthError = request.nextUrl.searchParams.get("error");
  // Os dois fluxos (Drive do estúdio e agenda pessoal) voltam nesta mesma
  // URL — cadastrar uma segunda no Google Cloud Console seria mais um passo
  // manual pra dar errado. O `state` diz qual deles está voltando.
  const isCalendar =
    request.nextUrl.searchParams.get("state") === CALENDAR_OAUTH_STATE;
  const destination = isCalendar ? "/admin/agenda" : "/admin/galerias";

  if (isCalendar && code) {
    try {
      await connectUserCalendar(session.userId, code);
      const account = await getUserCalendarAccount(session.userId);
      // Agenda recém-conectada começa vazia; carrega de uma vez o que já
      // tem data pra pessoa não achar que não funcionou.
      if (account) await syncAllCardsToAccount(account);
    } catch (error) {
      console.error("[calendar oauth callback]", error);
      return NextResponse.redirect(
        new URL(
          `${destination}?agenda_error=${encodeURIComponent(
            error instanceof Error ? error.message : "erro_desconhecido"
          )}`,
          request.url
        )
      );
    }
    return NextResponse.redirect(
      new URL(`${destination}?agenda_conectada=1`, request.url)
    );
  }

  if (oauthError || !code) {
    return NextResponse.redirect(
      new URL(
        `${destination}?drive_error=${encodeURIComponent(oauthError ?? "sem_codigo")}`,
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
