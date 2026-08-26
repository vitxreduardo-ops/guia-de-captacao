import { Suspense } from "react";
import { after } from "next/server";
import { NavLink } from "@/components/admin/NavLink";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AgendaFrame } from "@/components/admin/AgendaFrame";
import { AgendaGrid, AgendaGridSkeleton } from "./AgendaGrid";
import { CalendarConnection } from "@/components/admin/CalendarConnection";
import { CalendarSidebar } from "@/components/admin/CalendarSidebar";
import { ViewPicker } from "@/components/admin/ViewPicker";
import {
  daysOf,
  highlightOf,
  isAgendaView,
  isDayKey,
  rangeOf,
  stepOf,
  type AgendaView,
} from "@/lib/agendaRange";
import { getCurrentSession, getCurrentUsername } from "@/lib/session";
import { getUserCalendarAccount } from "@/lib/userCalendars";
import { countBacklogCardsWithDate } from "@/lib/backlog";
import {
  listRangeEvents,
  listUserCalendars,
  type CalendarSource,
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
  // A sessão sai do cookie, sem ida ao banco; tudo que depende dela vai
  // junto num lote só. Em série, o nome do cabeçalho e a contagem de
  // materiais somavam meio segundo antes de a tela começar a existir.
  const [session, params] = await Promise.all([getCurrentSession(), searchParams]);

  const [username, account, cardCount] = await Promise.all([
    getCurrentUsername(),
    session ? getUserCalendarAccount(session.userId) : null,
    countBacklogCardsWithDate(),
  ]);

  const todayKey = DAY_KEY.format(new Date());
  const view: AgendaView = isAgendaView(params.vis) ? params.vis : "semana";
  const anchor = isDayKey(params.semana) ? params.semana : todayKey;

  const { start, count } = rangeOf(view, anchor);
  const days = daysOf(start, count);

  // A lista de agendas fica em cache e é barata; os compromissos, não —
  // eles chegam por streaming, dentro do <Suspense> lá embaixo. Uma conta
  // revogada não pode derrubar a tela, que também serve pra reconectar.
  let calendars: CalendarSource[] = [];
  let calendarsError: string | null = null;
  if (account) {
    try {
      calendars = await listUserCalendars(account);
    } catch (error) {
      calendarsError =
        error instanceof Error
          ? error.message
          : "Não foi possível ler suas agendas.";
    }
  }

  // O título acompanha a visão: um dia mostra a data inteira; as demais, o
  // mês em que a maior parte do intervalo cai.
  const middle = days[Math.floor(days.length / 2)] ?? days[0];
  const title =
    view === "dia"
      ? DAY_TITLE.format(new Date(`${days[0].key}T12:00:00Z`))
      : MONTH_TITLE.format(new Date(`${middle.key}T12:00:00Z`));

  // O trecho que a lateral marca — na visão de mês, o mês em vez das seis
  // linhas inteiras.
  const highlight = highlightOf(view, anchor);

  const step = stepOf(view, anchor);
  const linkTo = (day: string, target: AgendaView = view) =>
    `/admin/agenda?vis=${target}&semana=${day}`;
  // Depois de responder, busca os períodos vizinhos: ‹ › são o próximo
  // clique quase sempre, e assim eles saem do cache em vez da rede. Roda
  // fora do caminho crítico, então não atrasa esta resposta.
  if (account && calendars.length > 0) {
    after(async () => {
      const neighbours = [rangeOf(view, step.back), rangeOf(view, step.next)];
      await Promise.all(
        neighbours.map((range) =>
          listRangeEvents(account, range.start, range.count, calendars).catch(
            () => []
          )
        )
      );
    });
  }

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
                focusMonth={anchor.slice(0, 7)}
                todayKey={todayKey}
                view={view}
              />
            }
            toolbar={
              <>
                <NavLink
                  href={linkTo(todayKey)}
                  className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50 active:scale-[0.97] transition-transform focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none"
                >
                  Hoje
                </NavLink>

                <ViewPicker current={view} hrefs={viewHrefs} />

                <div className="flex items-center gap-1">
                  <NavLink
                    href={linkTo(step.back)}
                    ariaLabel="Período anterior"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 active:scale-90 transition-transform focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none"
                  >
                    ‹
                  </NavLink>
                  <NavLink
                    href={linkTo(step.next)}
                    ariaLabel="Próximo período"
                    className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 active:scale-90 transition-transform focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none"
                  >
                    ›
                  </NavLink>
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
            {calendarsError ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                {calendarsError}
              </p>
            ) : (
              // A chave force o fallback a reaparecer a cada período: sem
              // ela o React reaproveita a grade antiga e a tela fica parada
              // durante a espera.
              <Suspense
                key={`${view}:${start}`}
                fallback={
                  <AgendaGridSkeleton
                    days={days}
                    todayKey={todayKey}
                    view={view}
                    monthKey={anchor.slice(0, 7)}
                  />
                }
              >
                <AgendaGrid
                  account={account}
                  calendars={calendars}
                  days={days}
                  rangeStart={start}
                  todayKey={todayKey}
                  view={view}
                  monthKey={anchor.slice(0, 7)}
                />
              </Suspense>
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
