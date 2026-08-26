import { MonthCalendar } from "@/components/admin/MonthCalendar";
import { WeekCalendar } from "@/components/admin/WeekCalendar";
import type { AgendaView } from "@/components/admin/ViewPicker";
import {
  listRangeEvents,
  type CalendarSource,
  type WeekEvent,
} from "@/lib/googleCalendar";
import type { UserCalendarAccount } from "@/lib/userCalendars";

/**
 * A grade, separada da página para poder chegar depois dela.
 *
 * Ler os compromissos custa uma ida ao Google por agenda; enquanto isso a
 * moldura já está na tela, com a grade vazia no lugar. Antes a tela inteira
 * esperava — e cada clique de semana parecia travado.
 */
export async function AgendaGrid({
  account,
  calendars,
  days,
  rangeStart,
  todayKey,
  view,
  monthKey,
}: {
  account: UserCalendarAccount;
  calendars: CalendarSource[];
  days: { key: string; day: number }[];
  rangeStart: string;
  todayKey: string;
  view: AgendaView;
  monthKey: string;
}) {
  let events: WeekEvent[] = [];
  try {
    events = await listRangeEvents(account, rangeStart, days.length, calendars);
  } catch (error) {
    // A agenda pode falhar por conta revogada ou instabilidade do Google;
    // isso não pode derrubar a tela, que também serve pra reconectar.
    return (
      <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        {error instanceof Error
          ? error.message
          : "Não foi possível ler sua agenda."}
      </p>
    );
  }

  if (view === "mes") {
    return (
      <MonthCalendar
        events={events}
        days={days}
        todayKey={todayKey}
        monthKey={monthKey}
      />
    );
  }

  return (
    <WeekCalendar
      events={events}
      days={days}
      todayKey={todayKey}
      writableCalendars={calendars.filter((calendar) => calendar.canWrite)}
    />
  );
}

/** Mesma grade, sem compromissos: é o que aparece enquanto eles chegam. */
export function AgendaGridSkeleton({
  days,
  todayKey,
  view,
  monthKey,
}: {
  days: { key: string; day: number }[];
  todayKey: string;
  view: AgendaView;
  monthKey: string;
}) {
  return (
    <div className="animate-pulse">
      {view === "mes" ? (
        <MonthCalendar
          events={[]}
          days={days}
          todayKey={todayKey}
          monthKey={monthKey}
        />
      ) : (
        <WeekCalendar
          events={[]}
          days={days}
          todayKey={todayKey}
          writableCalendars={[]}
        />
      )}
    </div>
  );
}
