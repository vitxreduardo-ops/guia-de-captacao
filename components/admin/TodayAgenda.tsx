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
  // Recolhido cabe uma linha: o próximo, ou — quando o dia já acabou — o
  // primeiro da lista, pra barra nunca ficar só com o número.
  const highlight = next ?? ordered[0] ?? null;

  return (
    <TodayAgendaFrame
      count={ordered.length}
      preview={
        highlight ? (
          <EventRow event={highlight} current={highlight.id === next?.id} past={false} />
        ) : null
      }
    >
      {ordered.length === 0 ? (
        <p className="py-4 text-center text-sm text-neutral-500">
          Nenhum compromisso hoje.
        </p>
      ) : (
        // Uma coluna só, no relógio: o card mora na coluna estreita do
        // Painel, onde duas colunas deixariam três palavras por linha.
        <ul>
          {ordered.map((event) => (
            <li key={event.id} className="break-inside-avoid">
              <EventRow
                event={event}
                current={event.id === next?.id}
                past={!event.allDay && event.endMinutes <= minutes}
              />
            </li>
          ))}
        </ul>
      )}
    </TodayAgendaFrame>
  );
}

/** Uma linha da lista: bolinha da agenda, horário e título. */
function EventRow({
  event,
  current,
  past,
}: {
  event: WeekEvent;
  /** Acontecendo agora (ou o próximo a começar). */
  current: boolean;
  past: boolean;
}) {
  return (
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
      {/* Largura fixa no horário: sem ela os títulos começavam em pontos
          diferentes e a coluna perdia a linha. */}
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
  );
}

/**
 * Moldura comum ao conteúdo e ao esqueleto, pra grade não pular quando os
 * compromissos chegam.
 *
 * Duas instâncias em vez de uma que se adapta: no celular o bloco é um
 * `<details>` recolhido, no desktop é a lista inteira, sempre aberta. Um
 * `<details>` só, com o corpo revelado por CSS no desktop, não serve — o
 * Chrome esconde o conteúdo de um `details` fechado por
 * `content-visibility`, que nenhuma classe de display alcança. E decidir
 * isso em estado daria divergência de hidratação, porque o servidor não
 * sabe a largura da tela. O mesmo caminho que os Atalhos já seguem.
 */
function TodayAgendaFrame({
  count,
  preview,
  children,
}: {
  count: number | null;
  /** O que se vê recolhido, no lugar da lista: sem isso o celular ficaria
   * com uma barra que só diz um número. */
  preview?: React.ReactNode;
  children: React.ReactNode;
}) {
  const title = (
    <h2 className="text-sm font-semibold text-neutral-900">
      Hoje na agenda
      {count ? (
        <span className="font-normal text-neutral-500">{` · ${count}`}</span>
      ) : null}
    </h2>
  );

  const link = (
    <Link
      href="/admin/agenda"
      className="shrink-0 rounded text-xs text-neutral-500 hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      Minha Agenda
    </Link>
  );

  return (
    <>
      <details className="group rounded-lg border border-neutral-200 bg-white p-4 lg:hidden">
        <summary className="cursor-pointer list-none rounded-md focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
          <div className="flex items-baseline justify-between gap-2">
            {title}
            <div className="flex shrink-0 items-baseline gap-3">
              {link}
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-3.5 w-3.5 self-center text-neutral-400 transition-transform group-open:rotate-180"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
          </div>

          {/* Recolhido, o celular ainda vê o próximo compromisso — é a
              resposta que o bloco existe pra dar. */}
          {preview ? <div className="mt-2 group-open:hidden">{preview}</div> : null}
        </summary>

        <div className="mt-3">{children}</div>
      </details>

      <section
        aria-labelledby="hoje-titulo"
        className="hidden rounded-lg border border-neutral-200 bg-white p-4 lg:block"
      >
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <div id="hoje-titulo">{title}</div>
          {link}
        </div>
        {children}
      </section>
    </>
  );
}

/** Uma linha em cinza, do tamanho de uma de verdade. */
function SkeletonRow() {
  return (
    <span className="flex animate-pulse items-center gap-2 px-2 py-1.5">
      <span className="h-2 w-2 shrink-0 rounded-full bg-neutral-200" />
      <span className="h-3 w-16 shrink-0 rounded bg-neutral-200" />
      <span className="h-3 w-full rounded bg-neutral-100" />
    </span>
  );
}

/** O que fica na tela enquanto o Google responde. */
export function TodayAgendaSkeleton() {
  return (
    <TodayAgendaFrame
      count={null}
      // Recolhido no celular, o esqueleto também precisa de uma linha:
      // sem ela a barra encolhia e depois crescia quando os compromissos
      // chegavam.
      preview={<SkeletonRow />}
    >
      <ul>
        {[0, 1, 2].map((row) => (
          <li key={row} className="break-inside-avoid">
            <SkeletonRow />
          </li>
        ))}
      </ul>
    </TodayAgendaFrame>
  );
}
