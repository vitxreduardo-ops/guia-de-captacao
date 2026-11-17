import "server-only";
import { addDaysKey } from "@/lib/agendaRange";
import { createGoogleEvent, listRangeEvents, listUserCalendars, type WeekEvent } from "@/lib/googleCalendar";
import { getUserCalendarAccount } from "@/lib/userCalendars";
import { PermissionError, canUseSection, clientScope } from "@/lib/agent/permissions";
import { findTasks, todayKey } from "@/lib/agent/tools/tasks";
import { ToolInputError, optDate, optString, reqString } from "@/lib/agent/validate";
import { getReminders } from "@/lib/reminders";
import type { ReadTool, WriteTool } from "@/lib/agent/types";

const MAX_DAYS = 14;
const MAX_EVENTS = 40;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const brDate = (iso: string) => iso.split("-").reverse().join("/");
const hhmm = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
const toMinutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));

const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/** A agenda é pessoal: sempre a conta de quem pediu, nunca a de outra pessoa. */
async function ownAccount(actor: { userId: string }) {
  const account = await getUserCalendarAccount(actor.userId);
  if (!account) {
    throw new ToolInputError("Você ainda não conectou o Google Agenda. Conecte em Minha Agenda no painel.");
  }
  return account;
}

function describe(e: WeekEvent, start: string) {
  return {
    dia: brDate(addDaysKey(start, e.dayIndex)),
    horario: e.allDay ? "dia todo" : `${hhmm(e.startMinutes)}–${hhmm(e.endMinutes)}`,
    titulo: e.title,
    local: e.location,
    agenda: e.calendarName,
  };
}

async function eventsIn(userId: string, start: string, days: number) {
  const account = await ownAccount({ userId });
  const calendars = await listUserCalendars(account);
  return { account, calendars, events: await listRangeEvents(account, start, days, calendars) };
}

export const getAgenda: ReadTool = {
  kind: "read",
  name: "get_agenda",
  topic: "agenda",
  description:
    "Compromissos do Google Agenda de quem está falando, num dia ou intervalo (até 14 dias). " +
    "Serve para 'o que tenho amanhã?', 'tenho horário livre sexta?'. Só a agenda da própria pessoa.",
  parameters: {
    type: "object",
    properties: {
      start: { type: "string", description: "Primeiro dia, AAAA-MM-DD." },
      end: { type: ["string", "null"], description: "Último dia, AAAA-MM-DD. Vazio = só o primeiro dia." },
    },
    required: ["start", "end"],
    additionalProperties: false,
  },
  async run(actor, args) {
    const start = optDate({ d: reqString(args, "start", 10) }, "d")!;
    const end = optDate(args, "end") ?? start;
    const days = daysBetween(start, end) + 1;
    if (days < 1) throw new ToolInputError("O fim vem antes do começo.");
    if (days > MAX_DAYS) throw new ToolInputError(`Peça no máximo ${MAX_DAYS} dias por vez.`);

    const { events } = await eventsIn(actor.userId, start, days);
    const sorted = events.sort((a, b) => a.dayIndex - b.dayIndex || a.startMinutes - b.startMinutes);
    return {
      total: sorted.length,
      itens: sorted.slice(0, MAX_EVENTS).map((e) => describe(e, start)),
      ...(sorted.length > MAX_EVENTS ? { aviso: `Mostrando ${MAX_EVENTS} de ${sorted.length}.` } : {}),
    };
  },
};

type CreateEventParams = {
  calendarId: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  description: string;
};

export const createEvent: WriteTool<CreateEventParams> = {
  kind: "write",
  name: "create_event",
  topic: "agenda",
  description:
    "Cria um compromisso na agenda principal de quem está falando. Pede confirmação. " +
    "Não convida ninguém (convidado recebe e-mail do Google) e não cria card. " +
    "Se faltar dia ou horário de início, pergunte antes de chamar.",
  parameters: {
    type: "object",
    properties: {
      title: { type: "string" },
      date: { type: "string", description: "Dia, AAAA-MM-DD." },
      start_time: { type: "string", description: "Início, HH:MM (24h)." },
      end_time: { type: ["string", "null"], description: "Fim, HH:MM no mesmo dia. Vazio = 1 hora depois." },
      location: { type: ["string", "null"] },
      description: { type: ["string", "null"] },
    },
    required: ["title", "date", "start_time", "end_time", "location", "description"],
    additionalProperties: false,
  },

  async prepare(actor, args) {
    const title = reqString(args, "title", 200);
    const date = optDate({ d: reqString(args, "date", 10) }, "d")!;
    const startTime = reqString(args, "start_time", 5);
    if (!TIME.test(startTime)) throw new ToolInputError('"start_time" precisa ser HH:MM.');
    const endRaw = optString(args, "end_time", 5);
    if (endRaw && !TIME.test(endRaw)) throw new ToolInputError('"end_time" precisa ser HH:MM.');
    const endMinutes = endRaw ? toMinutes(endRaw) : toMinutes(startTime) + 60;
    if (endMinutes <= toMinutes(startTime) || endMinutes >= 24 * 60) {
      throw new ToolInputError("O compromisso precisa terminar no mesmo dia, depois do início.");
    }
    const endTime = hhmm(endMinutes);
    const location = optString(args, "location", 300) ?? "";
    const description = optString(args, "description", 2000) ?? "";

    const { account, calendars, events } = await eventsIn(actor.userId, date, 1);
    // A agenda principal é a que tem o id igual ao e-mail da conta.
    const target = calendars.find((c) => c.canWrite && c.id === account.email) ?? calendars.find((c) => c.canWrite);
    if (!target) throw new ToolInputError("Nenhuma das suas agendas aceita novos compromissos.");

    const start = toMinutes(startTime);
    const clashes = events.filter((e) => !e.allDay && e.startMinutes < endMinutes && e.endMinutes > start);

    const summary = [
      "Criar compromisso",
      `Título: ${title}`,
      `Quando: ${brDate(date)}, ${startTime}–${endTime}`,
      location ? `Local: ${location}` : null,
      `Agenda: ${target.name}`,
      clashes.length
        ? `Atenção, já tem: ${clashes.map((e) => `${e.title} (${hhmm(e.startMinutes)}–${hhmm(e.endMinutes)})`).join("; ")}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    return { summary, params: { calendarId: target.id, title, date, startTime, endTime, location, description } };
  },

  async execute(actor, params) {
    const account = await ownAccount(actor);
    const writable = (await listUserCalendars(account)).some((c) => c.id === params.calendarId && c.canWrite);
    if (!writable) throw new PermissionError("Essa agenda não aceita mais compromissos.");
    await createGoogleEvent(account, params);
    return `Compromisso criado: ${params.title}, ${brDate(params.date)} às ${params.startTime}.`;
  },
};

export const getSummary: ReadTool = {
  kind: "read",
  name: "get_summary",
  topic: "relatorios",
  description:
    "Resumo do que precisa de atenção agora: ordens atrasadas, prazos da semana, follow-ups de prospecção " +
    "e pagamentos vencendo. Use para 'resumo', 'o que está atrasado?', 'como está a semana?'. Mostra só o que a pessoa pode ver.",
  parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
  async run(actor) {
    const today = todayKey();
    const noFilters = { client: null, status: null, unassigned: null, board: null, limit: 10 };
    const [atrasadas, semana, reminders] = await Promise.all([
      findTasks.run(actor, { ...noFilters, overdue: true, open_only: true, due_from: null, due_to: null }),
      findTasks.run(actor, {
        ...noFilters,
        overdue: false,
        open_only: true,
        due_from: today,
        due_to: addDaysKey(today, 7),
      }),
      canUseSection(actor, "prospeccao") || canUseSection(actor, "faturamento")
        ? getReminders(clientScope(actor))
        : null,
    ]);
    return {
      hoje: brDate(today),
      ordens_atrasadas: atrasadas,
      prazos_proximos_7_dias: semana,
      followups_atrasados: reminders && canUseSection(actor, "prospeccao")
        ? reminders.followups.slice(0, 10).map((p) => ({ contato: p.name, desde: brDate(p.next_contact_date!) }))
        : "sem acesso à prospecção",
      pagamentos: reminders && canUseSection(actor, "faturamento")
        ? reminders.payments.slice(0, 10).map((p) => ({
            cliente: p.clientName,
            vence: brDate(p.dueDate),
            valor_reais: p.cents / 100,
          }))
        : "sem acesso ao faturamento",
    };
  },
};
