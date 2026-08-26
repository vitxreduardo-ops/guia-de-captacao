import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AgendaFrame } from "@/components/admin/AgendaFrame";
import { CalendarConnection } from "@/components/admin/CalendarConnection";
import { CalendarSidebar } from "@/components/admin/CalendarSidebar";
import { MonthCalendar } from "@/components/admin/MonthCalendar";
import { ViewPicker, type AgendaView } from "@/components/admin/ViewPicker";
import { WeekCalendar } from "@/components/admin/WeekCalendar";
import { getCurrentSession, getCurrentUsername } from "@/lib/session";
import { getUserCalendarAccount } from "@/lib/userCalendars";
import { countBacklogCardsWithDate } from "@/lib/backlog";
import {
  listRangeEvents,
  listUserCalendars,
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

const DAY_TITLE = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
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

function isView(value: string | undefined): value is AgendaView {
  return (
    value === "dia" || value === "4dias" || value === "semana" || value === "mes"
  );
}

/**
 * Onde a grade começa e quantos dias mostra, por visão.
 *
 * A data que vem no endereço é sempre a "âncora" — o dia em que a pessoa
 * clicou ou para onde navegou. Cada visão a arredonda do seu jeito: semana e
 * mês recuam até o domingo que abre o bloco, dia e 4 dias começam nela
 * mesma, como no Google.
 */
function rangeOf(view: AgendaView, anchor: string) {
  if (view === "dia") return { start: anchor, count: 1 };
  if (view === "4dias") return { start: anchor, count: 4 };
  if (view === "semana") return { start: weekStartOf(anchor), count: 7 };
  return { start: weekStartOf(`${anchor.slice(0, 7)}-01`), count: 42 };
}

function addMonthsKey(monthKey: string, amount: number): string {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 + amount, 1))
    .toISOString()
    .slice(0, 7);
}

/** Quantos dias as setas ‹ › andam em cada visão. */
function stepOf(view: AgendaView, anchor: string): { back: string; next: string } {
  if (view === "mes") {
    const [year, month] = anchor.split("-").map(Number);
    const shift = (amount: number) =>
      new Date(Date.UTC(year, month - 1 + amount, 1)).toISOString().slice(0, 10);
    return { back: shift(-1), next: shift(1) };
  }
  const days = view === "dia" ? 1 : view === "4dias" ? 4 : 7;
  return {
    back: addDaysKey(anchor, -days),
    next: addDaysKey(anchor, days),
  };
}

export default async function MinhaAgendaPage({
  searchParams,
}: {
  searchParams: Promise<{
    agenda_error?: string;
    agenda_conectada?: string;
    semana?: string;
    vis?: string;
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
  const view: AgendaView = isView(params.vis) ? params.vis : "semana";
  const anchor = /^\d{4}-\d{2}-\d{2}$/.test(params.semana ?? "")
    ? params.semana!
    : todayKey;

  const { start, count } = rangeOf(view, anchor);
  const days = Array.from({ length: count }, (_, index) => {
    const key = addDaysKey(start, index);
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
      events = await listRangeEvents(account, start, count, calendars);
    } catch (error) {
      eventsError =
        error instanceof Error
          ? error.message
          : "Não foi possível ler sua agenda.";
    }
  }

  // O título acompanha a visão: um dia mostra a data inteira; as demais, o
  // mês em que a maior parte do intervalo cai.
  const middle = days[Math.floor(days.length / 2)] ?? days[0];
  const title =
    view === "dia"
      ? DAY_TITLE.format(new Date(`${days[0].key}T12:00:00Z`))
      : MONTH_TITLE.format(new Date(`${middle.key}T12:00:00Z`));

  // O que o mini-calendário marca. Na visão de mês são os dias do mês, não
  // as seis linhas inteiras — senão as pontas dos meses vizinhos entrariam
  // no destaque.
  const highlight =
    view === "mes"
      ? {
          start: `${anchor.slice(0, 7)}-01`,
          end: addDaysKey(`${addMonthsKey(anchor.slice(0, 7), 1)}-01`, -1),
        }
      : { start: days[0].key, end: days[days.length - 1].key };

  const step = stepOf(view, anchor);
  const linkTo = (day: string, target: AgendaView = view) =>
    `/admin/agenda?vis=${target}&semana=${day}`;
  const viewHrefs = {
    dia: linkTo(anchor, "dia"),
    "4dias": linkTo(anchor, "4dias"),
    semana: linkTo(anchor, "semana"),
    mes: linkTo(anchor, "mes"),
  };

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

      {account ? null : (
        <CalendarConnection
          connected={false}
          email={null}
          cardCount={cardCount}
        />
      )}

      {account ? (
        <section className="mt-6">
          <AgendaFrame
            sidebar={
              <CalendarSidebar
                calendars={calendars}
                rangeStart={highlight.start}
                rangeEnd={highlight.end}
                todayKey={todayKey}
                view={view}
              />
            }
            toolbar={
              <>
                <Link
                  href={linkTo(todayKey)}
                  className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
                >
                  Hoje
                </Link>

                <ViewPicker current={view} hrefs={viewHrefs} />

                <div className="flex items-center gap-1">
                  <Link
                    href={linkTo(step.back)}
                    aria-label="Período anterior"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100"
                  >
                    ‹
                  </Link>
                  <Link
                    href={linkTo(step.next)}
                    aria-label="Próximo período"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100"
                  >
                    ›
                  </Link>
                </div>

                <h2 className="text-lg text-neutral-800 first-letter:uppercase">
                  {title}
                </h2>

                <div className="ml-auto flex flex-wrap items-center gap-3">
                  {/* A lateral já lista as agendas com as cores; aqui basta o
                      resumo, que continua à mão mesmo com ela escondida. */}
                  <span className="text-xs text-neutral-400">
                    {calendars.filter((calendar) => calendar.selected).length} de{" "}
                    {calendars.length} agendas
                  </span>

                  {/* Conexão já resolvida: os ajustes ficam aqui, fora do
                      caminho, e a grade fica com a tela inteira. */}
                  <CalendarConnection
                    connected
                    email={account.email || null}
                    cardCount={cardCount}
                  />
                </div>
              </>
            }
          >
            {eventsError ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                {eventsError}
              </p>
            ) : view === "mes" ? (
              <MonthCalendar
                events={events}
                days={days}
                todayKey={todayKey}
                monthKey={anchor.slice(0, 7)}
              />
            ) : (
              <WeekCalendar
                events={events}
                days={days}
                todayKey={todayKey}
                writableCalendars={calendars.filter(
                  (calendar) => calendar.canWrite
                )}
              />
            )}
          </AgendaFrame>
        </section>
      ) : null}

      <p className="mt-4 text-xs text-neutral-400">
        Cada pessoa conecta a própria conta: sua agenda não interfere na de
        ninguém, e desconectar aqui não afeta as galerias dos clientes.
      </p>
    </div>
  );
}
