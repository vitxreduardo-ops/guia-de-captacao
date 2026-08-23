import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { CalendarConnection } from "@/components/admin/CalendarConnection";
import { WeekCalendar } from "@/components/admin/WeekCalendar";
import { getCurrentSession, getCurrentUsername } from "@/lib/session";
import { getUserCalendarAccount } from "@/lib/userCalendars";
import { countBacklogCardsWithDate } from "@/lib/backlog";
import {
  listUserCalendars,
  listWeekEvents,
  type CalendarSource,
  type WeekEvent,
} from "@/lib/googleCalendar";

export const dynamic = "force-dynamic";

const TIME_ZONE = process.env.BACKLOG_TIME_ZONE || "America/Sao_Paulo";

const DAY_KEY = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const MONTH_TITLE = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: TIME_ZONE,
});

function addDaysKey(key: string, days: number): string {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10);
}

/** Domingo da semana daquele dia — a grade do Google começa no domingo. */
function weekStartOf(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return addDaysKey(key, -date.getUTCDay());
}

export default async function MinhaAgendaPage({
  searchParams,
}: {
  searchParams: Promise<{
    agenda_error?: string;
    agenda_conectada?: string;
    semana?: string;
  }>;
}) {
  const [username, session, params] = await Promise.all([
    getCurrentUsername(),
    getCurrentSession(),
    searchParams,
  ]);

  const [account, cardCount] = await Promise.all([
    session ? getUserCalendarAccount(session.userId) : null,
    countBacklogCardsWithDate(),
  ]);

  const todayKey = DAY_KEY.format(new Date());
  const weekStart = /^\d{4}-\d{2}-\d{2}$/.test(params.semana ?? "")
    ? weekStartOf(params.semana!)
    : weekStartOf(todayKey);

  const days = Array.from({ length: 7 }, (_, index) => {
    const key = addDaysKey(weekStart, index);
    return { key, day: Number(key.slice(8, 10)) };
  });

  // A agenda pode falhar por conta revogada ou instabilidade do Google; isso
  // não pode derrubar a tela inteira, que também serve pra reconectar.
  let events: WeekEvent[] = [];
  let calendars: CalendarSource[] = [];
  let eventsError: string | null = null;
  if (account) {
    try {
      calendars = await listUserCalendars(account);
      events = await listWeekEvents(account, weekStart, calendars);
    } catch (error) {
      eventsError =
        error instanceof Error
          ? error.message
          : "Não foi possível ler sua agenda.";
    }
  }

  const title = MONTH_TITLE.format(
    new Date(`${days[3].key}T12:00:00Z`)
  );

  return (
    <div className="mx-auto w-full max-w-[100rem] px-4 py-10 sm:px-6 lg:px-8">
      <AdminHeader
        title="Minha Agenda"
        trail={[{ label: "Admin", href: "/admin" }, { label: "Minha Agenda" }]}
        username={username}
      />

      {params.agenda_error ? (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Não foi possível conectar: {params.agenda_error}
        </p>
      ) : null}

      {params.agenda_conectada ? (
        <p className="mb-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900">
          Agenda conectada. Os materiais com data já foram enviados.
        </p>
      ) : null}

      <CalendarConnection
        connected={account !== null}
        email={account?.email || null}
        cardCount={cardCount}
      />

      {account ? (
        <section className="mt-6">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <Link
              href="/admin/agenda"
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
            >
              Hoje
            </Link>
            <div className="flex items-center gap-1">
              <Link
                href={`/admin/agenda?semana=${addDaysKey(weekStart, -7)}`}
                aria-label="Semana anterior"
                className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100"
              >
                ‹
              </Link>
              <Link
                href={`/admin/agenda?semana=${addDaysKey(weekStart, 7)}`}
                aria-label="Próxima semana"
                className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100"
              >
                ›
              </Link>
            </div>
            <h2 className="text-lg text-neutral-800 first-letter:uppercase">
              {title}
            </h2>

            {calendars.length > 0 ? (
              <div className="ml-auto flex flex-wrap items-center gap-3">
                {calendars
                  .filter((calendar) => calendar.selected)
                  .map((calendar) => (
                    <span
                      key={calendar.id}
                      className="flex items-center gap-1.5 text-xs text-neutral-500"
                    >
                      <span
                        aria-hidden
                        className="h-2.5 w-2.5 rounded-sm"
                        style={{ backgroundColor: calendar.color }}
                      />
                      {calendar.name}
                    </span>
                  ))}
              </div>
            ) : null}
          </div>

          {eventsError ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              {eventsError}
            </p>
          ) : (
            <WeekCalendar events={events} days={days} todayKey={todayKey} />
          )}

        </section>
      ) : null}

      <p className="mt-4 text-xs text-neutral-400">
        Cada pessoa conecta a própria conta: sua agenda não interfere na de
        ninguém, e desconectar aqui não afeta as galerias dos clientes.
      </p>
    </div>
  );
}
