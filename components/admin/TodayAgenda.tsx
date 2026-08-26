import Link from "next/link";
import {
  listRangeEvents,
  listUserCalendars,
  type WeekEvent,
} from "@/lib/googleCalendar";
import type { UserCalendarAccount } from "@/lib/userCalendars";

const TIME_ZONE = process.env.BACKLOG_TIME_ZONE || "America/Sao_Paulo";

const DAY_KEY = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const CLOCK = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Minutos desde a meia-noite de hoje, no fuso do backlog. */
function nowMinutes(): number {
  const [hour, minute] = CLOCK.format(new Date()).split(":").map(Number);
  return hour * 60 + minute;
}

function hhmm(minutes: number) {
  const hour = String(Math.floor(minutes / 60)).padStart(2, "0");
  const minute = String(minutes % 60).padStart(2, "0");
  return `${hour}:${minute}`;
}

/**
 * Resumo do dia de hoje, para o Painel.
 *
 * Não é uma agenda: não tem grade, nem navegação de período, nem arrasto.
 * É a lista do que já está marcado para hoje, na ordem do relógio, para
 * quem abre o Painel saber se pode pegar mais coisa — a grade inteira mora
 * em /admin/agenda, a um clique daqui.
 *
 * No celular vira uma coluna só, ainda no topo: é a primeira pergunta de
 * quem abre o Painel de manhã, e empurrar tarefas e postagens algumas
 * linhas para baixo custa menos que esconder a resposta.
 */
export async function TodayAgenda({
  account,
}: {
  account: UserCalendarAccount;
}) {
  const todayKey = DAY_KEY.format(new Date());

  let events: WeekEvent[] = [];
  try {
    const calendars = await listUserCalendars(account);
    events = await listRangeEvents(account, todayKey, 1, calendars);
  } catch {
    // Conta revogada ou Google instável: o Painel não é a tela de
    // reconectar, então o bloco some em vez de virar um aviso no meio dos
    // atalhos. Quem precisa reconectar vai por Minha Agenda, que diz isso
    // com todo o contexto.
    return null;
  }

  // Dia inteiro primeiro (não têm hora), depois na ordem do relógio.
  const ordered = [...events].sort((a, b) => {
    if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
    return a.startMinutes - b.startMinutes;
  });

  const minutes = nowMinutes();
  // O próximo é o primeiro que ainda não acabou — inclui o que está
  // acontecendo agora, que é justamente o mais útil de ver destacado.
  const next = ordered.find((event) => !event.allDay && event.endMinutes > minutes);

  return (
    <TodayAgendaFrame count={ordered.length}>
      {ordered.length === 0 ? (
        <p className="py-4 text-center text-sm text-neutral-500">
          Nenhum compromisso hoje.
        </p>
      ) : (
        // Colunas em vez de uma lista comprida: o card é uma faixa larga, e
        // em uma coluna só um dia cheio empurraria o resto do Painel.
        // Colunas de CSS, não grade: a grade preenche por linha, e o dia
        // aparecia fora de ordem — 08:00 à esquerda, 09:00 do lado, 14:00
        // de volta na linha de baixo. Aqui cada coluna desce no relógio.
        <ul className="gap-x-6 sm:columns-2 xl:columns-3">
          {ordered.map((event) => {
            const current = event.id === next?.id;
            const past = !event.allDay && event.endMinutes <= minutes;
            return (
              <li key={event.id} className="break-inside-avoid">
                <Link
                  href="/admin/agenda"
                  className={`flex items-baseline gap-2 rounded-md px-2 py-1.5 text-sm transition-transform hover:bg-neutral-100 active:scale-[0.99] pointer-coarse:min-h-11 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none ${
                    past ? "text-neutral-400" : "text-neutral-800"
                  }`}
                >
                  <span
                    aria-hidden
                    className="mt-1 h-2 w-2 shrink-0 self-start rounded-full"
                    style={{ backgroundColor: event.color }}
                  />
                  {/* Largura fixa no horário: sem ela os títulos começavam
                      em pontos diferentes e a coluna perdia a linha. */}
                  <span
                    className={`w-20 shrink-0 tabular-nums text-xs ${
                      current ? "font-semibold text-neutral-900" : "text-neutral-500"
                    }`}
                  >
                    {event.allDay
                      ? "dia inteiro"
                      : `${hhmm(event.startMinutes)}–${hhmm(event.endMinutes)}`}
                  </span>
                  <span
                    className={`min-w-0 break-words ${current ? "font-semibold text-neutral-900" : ""}`}
                  >
                    {event.title}
                    {current ? (
                      <span className="ml-1.5 rounded bg-neutral-900 px-1.5 py-0.5 align-middle text-[10px] font-medium text-white">
                        agora
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </TodayAgendaFrame>
  );
}

/** Moldura comum ao conteúdo e ao esqueleto, pra grade não pular quando os
 * compromissos chegam. */
function TodayAgendaFrame({
  count,
  children,
}: {
  count: number | null;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby="hoje-titulo"
      className="mb-6 rounded-lg border border-neutral-200 bg-white p-4"
    >
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 id="hoje-titulo" className="text-sm font-semibold text-neutral-900">
          Hoje na agenda
          {count ? (
            <span className="font-normal text-neutral-500">{` · ${count}`}</span>
          ) : null}
        </h2>
        <Link
          href="/admin/agenda"
          className="shrink-0 rounded text-xs text-neutral-500 hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Minha Agenda
        </Link>
      </div>
      {children}
    </section>
  );
}

/** O que fica na tela enquanto o Google responde. */
export function TodayAgendaSkeleton() {
  return (
    <TodayAgendaFrame count={null}>
      <ul className="animate-pulse gap-x-6 sm:columns-2 xl:columns-3">
        {[0, 1, 2].map((row) => (
          <li key={row} className="flex break-inside-avoid items-center gap-2 px-2 py-1.5">
            <span className="h-2 w-2 shrink-0 rounded-full bg-neutral-200" />
            <span className="h-3 w-16 shrink-0 rounded bg-neutral-200" />
            <span className="h-3 w-full rounded bg-neutral-100" />
          </li>
        ))}
      </ul>
    </TodayAgendaFrame>
  );
}
