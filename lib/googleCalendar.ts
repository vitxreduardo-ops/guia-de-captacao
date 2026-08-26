import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  getUserAccessToken,
  listConnectedCalendarAccounts,
  type UserCalendarAccount,
} from "@/lib/userCalendars";
import {
  BACKLOG_FORMAT_LABELS,
  type BacklogFormat,
} from "@/lib/backlogTypes";

const TOKEN_ROW_ID = "default";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

/** O backlog é de um time só, todo no mesmo fuso — sem isso o Google
 * interpreta os horários no fuso do calendário de destino e os posts
 * aparecem deslocados. */
const TIME_ZONE = process.env.BACKLOG_TIME_ZONE || "America/Sao_Paulo";

/** Cards com data mas sem hora viram evento de dia inteiro; com hora e sem
 * duração informada, usa esta janela padrão. */
const DEFAULT_DURATION_MINUTES = 30;

interface SyncableCard {
  id: string;
  title: string;
  description: string;
  caption: string;
  format: BacklogFormat;
  post_date: string | null;
  post_time: string | null;
  duration_minutes: number | null;
  google_event_id: string | null;
}

async function fetchCard(cardId: string): Promise<SyncableCard | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("backlog_cards")
    .select(
      "id, title, description, caption, format, post_date, post_time, duration_minutes, google_event_id"
    )
    .eq("id", cardId)
    .maybeSingle();
  if (error) throw error;
  return (data as SyncableCard | null) ?? null;
}

/** Soma minutos a um "HH:MM" e devolve o horário final junto com quantos
 * dias virou (post às 23:40 com 40min cai no dia seguinte). */
function addMinutes(time: string, minutes: number) {
  const [hours, mins] = time.split(":").map(Number);
  const total = hours * 60 + mins + minutes;
  const dayOffset = Math.floor(total / (24 * 60));
  const rest = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  return {
    time: `${String(Math.floor(rest / 60)).padStart(2, "0")}:${String(
      rest % 60
    ).padStart(2, "0")}`,
    dayOffset,
  };
}

function addDays(date: string, days: number): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function buildEventBody(card: SyncableCard) {
  const postDate = card.post_date!;
  const format = BACKLOG_FORMAT_LABELS[card.format] ?? card.format;

  // A legenda é o que interessa na hora de postar; a descrição interna vem
  // depois só como contexto.
  const description = [card.caption, card.description]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join("\n\n");

  const timing = card.post_time
    ? (() => {
        const start = card.post_time!.slice(0, 5);
        const end = addMinutes(
          start,
          card.duration_minutes ?? DEFAULT_DURATION_MINUTES
        );
        return {
          start: {
            dateTime: `${postDate}T${start}:00`,
            timeZone: TIME_ZONE,
          },
          end: {
            dateTime: `${addDays(postDate, end.dayOffset)}T${end.time}:00`,
            timeZone: TIME_ZONE,
          },
        };
      })()
    : {
        // Evento de dia inteiro: no Google o `end.date` é exclusivo, então
        // um dia só termina no dia seguinte.
        start: { date: postDate },
        end: { date: addDays(postDate, 1) },
      };

  return {
    summary: `${format}: ${card.title}`.trim(),
    description,
    ...timing,
  };
}


/** Ids dos eventos que o backlog criou na agenda desta pessoa — usado só
 * pra marcar quais blocos da grade vieram de um material. Mesma validade
 * curta dos eventos: é consultado em toda navegação e muda junto com eles. */
const backlogIdsCache = new Map<
  string,
  { value: Set<string>; expiresAt: number }
>();

async function fetchBacklogEventIds(userId: string): Promise<Set<string>> {
  const cached = backlogIdsCache.get(userId);
  if (cached && Date.now() < cached.expiresAt) return cached.value;

  const ids = await requestBacklogEventIds(userId);
  backlogIdsCache.set(userId, {
    value: ids,
    expiresAt: Date.now() + EVENTS_TTL_MS,
  });
  return ids;
}

async function requestBacklogEventIds(userId: string): Promise<Set<string>> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("backlog_card_events")
    .select("google_event_id")
    .eq("user_id", userId);
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.google_event_id as string));
}

/** Ids de evento já criados pra este card, por usuário. */
async function fetchCardEvents(cardId: string): Promise<Map<string, string>> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("backlog_card_events")
    .select("user_id, google_event_id")
    .eq("card_id", cardId);
  if (error) throw error;
  return new Map(
    (data ?? []).map((row) => [
      row.user_id as string,
      row.google_event_id as string,
    ])
  );
}

async function saveCardEvent(
  cardId: string,
  userId: string,
  eventId: string
) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("backlog_card_events")
    .upsert({ card_id: cardId, user_id: userId, google_event_id: eventId });
  if (error) throw error;
}

async function forgetCardEvent(cardId: string, userId: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("backlog_card_events")
    .delete()
    .eq("card_id", cardId)
    .eq("user_id", userId);
  if (error) throw error;
}

async function upsertEvent(
  account: UserCalendarAccount,
  card: SyncableCard,
  existingEventId: string | undefined
) {
  const accessToken = await getUserAccessToken(account.userId);
  const body = buildEventBody(card);
  const calendar = encodeURIComponent(account.calendarId);

  if (existingEventId) {
    const response = await fetch(
      `${CALENDAR_API}/calendars/${calendar}/events/${encodeURIComponent(
        existingEventId
      )}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );
    if (response.ok) return;

    // 404/410 = o evento foi apagado direto no Google. Recria em vez de
    // estourar erro pra quem só mexeu num card.
    if (response.status !== 404 && response.status !== 410) {
      throw new Error(
        `Falha ao atualizar evento no Google Agenda: ${await response.text()}`
      );
    }
  }

  const created = await fetch(
    `${CALENDAR_API}/calendars/${calendar}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );
  if (!created.ok) {
    throw new Error(
      `Falha ao criar evento no Google Agenda: ${await created.text()}`
    );
  }
  const event = await created.json();
  await saveCardEvent(card.id, account.userId, event.id as string);
}

async function deleteEvent(
  account: UserCalendarAccount,
  eventId: string
) {
  const accessToken = await getUserAccessToken(account.userId);
  const response = await fetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(
      account.calendarId
    )}/events/${encodeURIComponent(eventId)}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }
  );
  // 404/410 significa que já não existe — o resultado desejado.
  if (!response.ok && response.status !== 404 && response.status !== 410) {
    throw new Error(
      `Falha ao apagar evento do Google Agenda: ${await response.text()}`
    );
  }
}

/**
 * Roda a mesma operação em todas as agendas conectadas.
 *
 * Em série isso ficaria lento rápido — o custo é cards × pessoas, e cada
 * chamada ao Google leva mais de um segundo. Uma agenda que falha (token
 * revogado, por exemplo) não pode impedir as outras de sincronizar, então o
 * erro é registrado e a execução continua.
 */
async function forEachAccount(
  accounts: UserCalendarAccount[],
  operation: (account: UserCalendarAccount) => Promise<void>
) {
  const results = await Promise.allSettled(accounts.map(operation));
  for (const [index, result] of results.entries()) {
    if (result.status === "rejected") {
      console.error(
        `[calendario] falha na agenda de ${accounts[index].email}`,
        result.reason
      );
    }
  }
}

/**
 * Espelha um card em todas as agendas conectadas: cria na primeira vez,
 * atualiza nas seguintes e apaga quando o card perde a data de publicação.
 * Não faz nada se ninguém conectou — a integração é opcional.
 */
export async function syncBacklogCardToCalendar(cardId: string) {
  const accounts = await listConnectedCalendarAccounts();
  if (accounts.length === 0) return;

  const card = await fetchCard(cardId);
  if (!card) return;

  const events = await fetchCardEvents(cardId);

  // Card sem data não tem lugar no calendário: se já teve evento, some com
  // ele em vez de deixar um fantasma numa data antiga.
  if (!card.post_date) {
    await forEachAccount(accounts, async (account) => {
      const eventId = events.get(account.userId);
      if (!eventId) return;
      await deleteEvent(account, eventId);
      await forgetCardEvent(cardId, account.userId);
    });
    return;
  }

  await forEachAccount(accounts, (account) =>
    upsertEvent(account, card, events.get(account.userId))
  );
}

/**
 * Apaga o evento de um card em todas as agendas. Precisa ser chamado ANTES
 * de remover a linha do banco, senão os ids se vão junto (cascade) e os
 * eventos ficam órfãos no Google.
 */
export async function removeBacklogCardFromCalendar(cardId: string) {
  const accounts = await listConnectedCalendarAccounts();
  if (accounts.length === 0) return;

  const events = await fetchCardEvents(cardId);
  if (events.size === 0) return;

  await forEachAccount(accounts, async (account) => {
    const eventId = events.get(account.userId);
    if (!eventId) return;
    await deleteEvent(account, eventId);
  });
}

/**
 * Manda pra uma agenda recém-conectada todos os cards que já têm data, pra
 * ela não começar vazia. Devolve quantos cards foram sincronizados.
 */
export async function syncAllCardsToAccount(
  account: UserCalendarAccount
): Promise<number> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("backlog_cards")
    .select(
      "id, title, description, caption, format, post_date, post_time, duration_minutes"
    )
    .not("post_date", "is", null);
  if (error) throw error;

  const cards = (data ?? []) as SyncableCard[];
  if (cards.length === 0) return 0;

  const { data: existing, error: eventsError } = await supabase
    .from("backlog_card_events")
    .select("card_id, google_event_id")
    .eq("user_id", account.userId);
  if (eventsError) throw eventsError;
  const byCard = new Map(
    (existing ?? []).map((row) => [
      row.card_id as string,
      row.google_event_id as string,
    ])
  );

  // Em lotes pra não disparar dezenas de chamadas simultâneas ao Google e
  // levar rate limit logo na primeira conexão.
  const BATCH = 5;
  for (let i = 0; i < cards.length; i += BATCH) {
    const batch = cards.slice(i, i + BATCH);
    await Promise.all(
      batch.map((card) => upsertEvent(account, card, byCard.get(card.id)))
    );
  }
  return cards.length;
}

/**
 * Apaga do Google tudo que o app criou na agenda desta pessoa. Chamado ao
 * desconectar, pra conta não ficar com uma cópia congelada do backlog.
 */
export async function removeAllCardsFromAccount(account: UserCalendarAccount) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("backlog_card_events")
    .select("card_id, google_event_id")
    .eq("user_id", account.userId);
  if (error) throw error;

  for (const row of data ?? []) {
    try {
      await deleteEvent(account, row.google_event_id as string);
    } catch (deleteError) {
      // Desconectar não pode falhar por causa de um evento perdido.
      console.error("[calendario] falha ao apagar evento", deleteError);
    }
  }

  const { error: cleanupError } = await supabase
    .from("backlog_card_events")
    .delete()
    .eq("user_id", account.userId);
  if (cleanupError) throw cleanupError;
}

export interface UpcomingEvent {
  id: string;
  title: string;
  /** ISO do início — data pura em evento de dia inteiro, data e hora nos
   * demais. */
  start: string;
  allDay: boolean;
  htmlLink: string | null;
  /** Se este evento foi criado pelo backlog (e não um compromisso qualquer
   * da agenda da pessoa). */
  fromBacklog: boolean;
}

/**
 * Próximos compromissos da agenda conectada.
 *
 * Lê a agenda inteira, não só o que o app criou: a ideia é a pessoa abrir a
 * tela e ver o que tem pela frente, com os materiais do backlog no meio do
 * resto. `singleEvents` expande séries repetidas em ocorrências, senão um
 * evento semanal apareceria uma vez só, na data em que foi criado.
 */
export async function listUpcomingEvents(
  account: UserCalendarAccount,
  { days = 30, limit = 25 }: { days?: number; limit?: number } = {}
): Promise<UpcomingEvent[]> {
  const accessToken = await getUserAccessToken(account.userId);

  const now = new Date();
  const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const params = new URLSearchParams({
    timeMin: now.toISOString(),
    timeMax: until.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: String(limit),
  });

  const response = await fetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(
      account.calendarId
    )}/events?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!response.ok) {
    throw new Error(`Falha ao listar eventos: ${await response.text()}`);
  }
  const data = await response.json();

  // Quais desses eventos são materiais do backlog — usado só pra marcar na
  // lista, então uma consulta só pra todos os ids da pessoa basta.
  const supabase = getSupabaseServerClient();
  const { data: mine, error } = await supabase
    .from("backlog_card_events")
    .select("google_event_id")
    .eq("user_id", account.userId);
  if (error) throw error;
  const backlogIds = new Set(
    (mine ?? []).map((row) => row.google_event_id as string)
  );

  interface RawEvent {
    id: string;
    summary?: string;
    htmlLink?: string;
    start?: { date?: string; dateTime?: string };
  }

  return ((data.items ?? []) as RawEvent[]).map((item) => ({
    id: item.id,
    title: item.summary?.trim() || "(sem título)",
    start: item.start?.dateTime ?? item.start?.date ?? "",
    allDay: Boolean(item.start?.date && !item.start?.dateTime),
    htmlLink: item.htmlLink ?? null,
    fromBacklog: backlogIds.has(item.id),
  }));
}

export interface WeekEvent {
  /** Único na grade: um evento de vários dias vira uma faixa por dia. */
  id: string;
  /** Id do evento no Google, sem os sufixos que a grade acrescenta — é por
   * ele que se acha o material correspondente. */
  rawId: string;
  title: string;
  allDay: boolean;
  /** Minutos desde a meia-noite do dia, no fuso do backlog. Evento que
   * atravessa a meia-noite é cortado no dia — a grade é por dia. */
  startMinutes: number;
  endMinutes: number;
  /** Índice da coluna dentro do intervalo mostrado (0 = primeiro dia). */
  dayIndex: number;
  color: string;
  htmlLink: string | null;
  fromBacklog: boolean;
  calendarName: string;
  /** Campos mostrados no painel de detalhes, dentro do app. */
  description: string | null;
  location: string | null;
  meetLink: string | null;
  attendees: string[];
  /** Onde o evento mora — necessário pra salvar de volta. */
  calendarId: string;
  canEdit: boolean;
  /** Preenchido quando é uma ocorrência de evento repetido: é o id do evento
   * "mestre", usado quando a edição vale pra série toda. */
  recurringEventId: string | null;
}

export interface CalendarSource {
  id: string;
  name: string;
  color: string;
  selected: boolean;
  /** Se a conta pode escrever nessa agenda. Feriados e agendas que alguém
   * compartilhou como leitura entram aqui como false — tentar salvar nelas
   * só produziria um 403 depois da pessoa ter digitado tudo. */
  canWrite: boolean;
}

/**
 * Trocar de semana refazia, a cada clique, a lista de agendas e a paleta de
 * cores — duas idas ao Google que respondem sempre a mesma coisa e somavam a
 * maior parte dos ~3s de espera. As duas mudam raramente, então ficam em
 * memória: a lista por pessoa e por poucos minutos (ela ainda reflete
 * caixinhas ligadas e desligadas no Google), a paleta por um dia, já que é
 * fixa e igual pra todo mundo.
 */
const CALENDAR_LIST_TTL_MS = 5 * 60_000;
const PALETTE_TTL_MS = 24 * 60 * 60_000;

const calendarListCache = new Map<
  string,
  { value: CalendarSource[]; expiresAt: number }
>();
let paletteCache: { value: Map<string, string>; expiresAt: number } | null =
  null;

/** Chamado quando a conta muda (conectar/desconectar), pra não servir a
 * lista de agendas de uma conta que já não é aquela. */
export function clearCalendarCache(userId: string) {
  calendarListCache.delete(userId);
}

/**
 * Paleta de cores de evento do Google.
 *
 * No Google a cor de um bloco pode vir de dois lugares: a cor da agenda ou
 * uma cor escolhida naquele evento específico (`colorId`). Sem consultar
 * esta paleta, uma semana inteira sai com a cor da agenda e a tela perde
 * justamente a leitura rápida que as cores dão.
 */
async function fetchEventPalette(
  accessToken: string
): Promise<Map<string, string>> {
  const cached = paletteCache;
  if (cached && Date.now() < cached.expiresAt) return cached.value;
  const value = await requestEventPalette(accessToken);
  // Resposta vazia é sinal de falha; não vale cravar isso por um dia.
  if (value.size > 0) {
    paletteCache = { value, expiresAt: Date.now() + PALETTE_TTL_MS };
  }
  return value;
}

async function requestEventPalette(
  accessToken: string
): Promise<Map<string, string>> {
  const response = await fetch(`${CALENDAR_API}/colors`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return new Map();
  const data = await response.json();
  const entries = Object.entries(
    (data.event ?? {}) as Record<string, { background?: string }>
  );
  return new Map(
    entries.map(([id, value]) => [id, value.background ?? "#4285f4"])
  );
}

/** Agendas que a pessoa tem, com a cor que o Google usa em cada uma. */
export async function listUserCalendars(
  account: UserCalendarAccount
): Promise<CalendarSource[]> {
  const cached = calendarListCache.get(account.userId);
  if (cached && Date.now() < cached.expiresAt) return cached.value;

  const calendars = await requestUserCalendars(account);
  calendarListCache.set(account.userId, {
    value: calendars,
    expiresAt: Date.now() + CALENDAR_LIST_TTL_MS,
  });
  return calendars;
}

async function requestUserCalendars(
  account: UserCalendarAccount
): Promise<CalendarSource[]> {
  const accessToken = await getUserAccessToken(account.userId);
  const response = await fetch(
    `${CALENDAR_API}/users/me/calendarList?maxResults=250`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!response.ok) {
    throw new Error(`Falha ao listar agendas: ${await response.text()}`);
  }
  const data = await response.json();

  interface RawCalendar {
    id: string;
    summary?: string;
    backgroundColor?: string;
    selected?: boolean;
    primary?: boolean;
    accessRole?: string;
  }

  return ((data.items ?? []) as RawCalendar[]).map((item) => ({
    id: item.id,
    name: item.summary ?? item.id,
    color: item.backgroundColor ?? "#4285f4",
    // "selected" é a caixinha marcada no Google. Respeitar isso faz a tela
    // abrir mostrando o mesmo conjunto que a pessoa já escolheu ver lá.
    selected: item.selected !== false || item.primary === true,
    canWrite: item.accessRole === "owner" || item.accessRole === "writer",
  }));
}

/**
 * Liga ou desliga uma agenda na conta da pessoa.
 *
 * Grava no próprio Google (o mesmo `selected` das caixinhas de lá) em vez de
 * guardar a escolha só aqui: a tela é espelho da agenda, e uma preferência
 * local sairia de sincronia com o que a pessoa vê no Google.
 */
export async function setCalendarSelected(
  account: UserCalendarAccount,
  calendarId: string,
  selected: boolean
): Promise<void> {
  const accessToken = await getUserAccessToken(account.userId);
  const response = await fetch(
    `${CALENDAR_API}/users/me/calendarList/${encodeURIComponent(calendarId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ selected }),
    }
  );
  if (!response.ok) {
    throw new Error(`Falha ao mudar a agenda: ${await response.text()}`);
  }
  // A lista em memória ainda diz o contrário; sem limpar, a caixinha voltaria
  // sozinha no próximo carregamento.
  clearCalendarCache(account.userId);
}

const TIME_PARTS = new Intl.DateTimeFormat("pt-BR", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const DAY_KEY = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Minutos desde a meia-noite, lidos no fuso do backlog em vez do fuso de
 * quem roda o servidor — senão a mesma semana renderiza deslocada em
 * produção. */
function minutesOfDay(iso: string): number {
  const parts = TIME_PARTS.format(new Date(iso)).split(":").map(Number);
  return parts[0] * 60 + parts[1];
}

function dayKey(iso: string): string {
  return DAY_KEY.format(new Date(iso));
}

function addDaysKey(key: string, days: number): string {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

/**
 * Eventos crus de uma agenda numa janela de tempo, com cache curto.
 *
 * Ir e voltar entre semanas é o gesto mais comum da tela, e sem isso cada
 * passo refaz uma ida ao Google por agenda. Meio minuto de validade deixa a
 * navegação instantânea sem servir uma agenda visivelmente desatualizada; o
 * que é editado por aqui limpa o cache na hora (`clearEventsCache`).
 */
const EVENTS_TTL_MS = 30_000;
const eventsCache = new Map<
  string,
  { value: unknown[]; expiresAt: number }
>();

/** Chamado depois de criar, mover ou editar: o que está guardado ainda
 * mostra o compromisso no lugar antigo. */
export function clearEventsCache(userId: string) {
  backlogIdsCache.delete(userId);
  const prefix = `${userId}|`;
  for (const key of eventsCache.keys()) {
    if (key.startsWith(prefix)) eventsCache.delete(key);
  }
}

async function fetchCalendarItems(
  userId: string,
  accessToken: string,
  calendar: CalendarSource,
  timeMin: string,
  timeMax: string
): Promise<unknown[]> {
  const cacheKey = `${userId}|${calendar.id}|${timeMin}|${timeMax}`;
  const cached = eventsCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) return cached.value;

  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
    // Só o que a grade usa: a resposta cheia do Google traz dezenas de
    // campos por evento que nada aqui lê.
    fields:
      "items(id,summary,htmlLink,start,end,colorId,recurringEventId,description,location,hangoutLink,attendees(email,displayName))",
  });

  const response = await fetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(
      calendar.id
    )}/events?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  // Uma agenda inacessível (compartilhada e revogada, por exemplo) não pode
  // derrubar a grade inteira — mas some da tela sem avisar, então pelo menos
  // deixa rastro no log.
  if (!response.ok) {
    console.error(
      `[calendario] não deu pra ler a agenda "${calendar.name}": ${response.status} ${await response.text()}`
    );
    return [];
  }

  const data = await response.json();
  const items = (data.items ?? []) as unknown[];
  eventsCache.set(cacheKey, {
    value: items,
    expiresAt: Date.now() + EVENTS_TTL_MS,
  });
  return items;
}

/**
 * Eventos de um intervalo de dias, de todas as agendas visíveis, já
 * posicionados para a grade.
 *
 * O intervalo é aberto de propósito: a mesma função serve para o dia, os
 * quatro dias, a semana e as seis linhas do mês — muda só quantas colunas
 * existem.
 *
 * As agendas são buscadas em paralelo: em série, uma pessoa com cinco
 * agendas esperaria cinco idas ao Google só pra abrir a tela.
 */
export async function listRangeEvents(
  account: UserCalendarAccount,
  rangeStartKey: string,
  dayCount: number,
  calendars: CalendarSource[]
): Promise<WeekEvent[]> {
  const accessToken = await getUserAccessToken(account.userId);
  const visible = calendars.filter((calendar) => calendar.selected);

  // Janela com um dia de folga de cada lado e em UTC puro: assim o intervalo
  // não depende do fuso estar cravado aqui — o que decide em qual coluna o
  // evento cai é o `dayIndexOf`, que já lê tudo no fuso do backlog.
  const timeMin = `${addDaysKey(rangeStartKey, -1)}T00:00:00Z`;
  const timeMax = `${addDaysKey(rangeStartKey, dayCount + 1)}T00:00:00Z`;

  // Paleta e "quais eventos vieram do backlog" não dependem das agendas:
  // pedir tudo junto tira duas esperas em série de abrir a semana.
  const palettePromise = fetchEventPalette(accessToken);
  const backlogIdsPromise = fetchBacklogEventIds(account.userId);
  // Ninguém espera essas duas quando não há agenda visível; sem isso a falha
  // viraria "unhandled rejection" e derrubaria o processo.
  palettePromise.catch(() => {});
  backlogIdsPromise.catch(() => {});

  interface RawEvent {
    id: string;
    summary?: string;
    htmlLink?: string;
    start?: { date?: string; dateTime?: string };
    end?: { date?: string; dateTime?: string };
    colorId?: string;
    recurringEventId?: string;
    description?: string;
    location?: string;
    hangoutLink?: string;
    attendees?: { email?: string; displayName?: string }[];
  }

  const perCalendar = await Promise.all(
    visible.map(async (calendar) => {
      const [items, palette, backlogIds] = await Promise.all([
        fetchCalendarItems(
          account.userId,
          accessToken,
          calendar,
          timeMin,
          timeMax
        ),
        palettePromise,
        backlogIdsPromise,
      ]);
      const data = { items };

      const events: WeekEvent[] = [];
      for (const item of (data.items ?? []) as RawEvent[]) {
        const startIso = item.start?.dateTime ?? item.start?.date;
        if (!startIso) continue;

        const base = {
          id: `${calendar.id}:${item.id}`,
          rawId: item.id,
          title: item.summary?.trim() || "(sem título)",
          // Cor do evento quando ele tem uma; senão a da agenda, que é o
          // que o Google mostra por padrão.
          color:
            (item.colorId ? palette.get(item.colorId) : undefined) ??
            calendar.color,
          htmlLink: item.htmlLink ?? null,
          fromBacklog: backlogIds.has(item.id),
          calendarName: calendar.name,
          description: item.description?.trim() || null,
          location: item.location?.trim() || null,
          meetLink: item.hangoutLink ?? null,
          attendees: (item.attendees ?? [])
            .map((person) => person.displayName || person.email || "")
            .filter(Boolean),
          calendarId: calendar.id,
          canEdit: calendar.canWrite,
          recurringEventId: item.recurringEventId ?? null,
        };

        if (item.start?.date) {
          // Dia inteiro: o `end.date` do Google é exclusivo, então um evento
          // de vários dias vira uma faixa por dia.
          const endExclusive = item.end?.date ?? addDaysKey(item.start.date, 1);
          for (
            let key = item.start.date;
            key < endExclusive;
            key = addDaysKey(key, 1)
          ) {
            const index = dayIndexOf(rangeStartKey, key);
            if (index < 0 || index >= dayCount) continue;
            events.push({
              ...base,
              id: `${base.id}:${key}`,
              allDay: true,
              startMinutes: 0,
              endMinutes: 0,
              dayIndex: index,
            });
          }
          continue;
        }

        const startKey = dayKey(startIso);
        const index = dayIndexOf(rangeStartKey, startKey);
        const startMinutes = minutesOfDay(startIso);
        const endIso = item.end?.dateTime;
        const endKey = endIso ? dayKey(endIso) : startKey;

        // Compromisso "de momento" (começa e termina na mesma hora, como um
        // lembrete) não tem altura nenhuma. Dar 30 minutos deixa o bloco
        // clicável — antes esses caíam na regra de virada de dia e viravam
        // uma faixa até a meia-noite.
        const MINIMUM_MINUTES = 30;

        if (endKey === startKey) {
          const rawEnd = endIso ? minutesOfDay(endIso) : startMinutes;
          if (index >= 0 && index < dayCount) {
            events.push({
              ...base,
              allDay: false,
              startMinutes,
              endMinutes: Math.max(rawEnd, startMinutes + MINIMUM_MINUTES),
              dayIndex: index,
            });
          }
          continue;
        }

        // Atravessa a meia-noite: uma faixa por dia, cada uma no seu pedaço,
        // que é como a grade do Google mostra.
        for (let key = startKey; key <= endKey; key = addDaysKey(key, 1)) {
          const dayIndex = dayIndexOf(rangeStartKey, key);
          if (dayIndex < 0 || dayIndex >= dayCount) continue;
          const isFirst = key === startKey;
          const isLast = key === endKey;
          const from = isFirst ? startMinutes : 0;
          const to = isLast && endIso ? minutesOfDay(endIso) : 24 * 60;
          // O último dia pode terminar à meia-noite em ponto: aí o evento
          // acabou no dia anterior e não há nada pra desenhar.
          if (to <= from) continue;
          events.push({
            ...base,
            id: `${base.id}:${key}`,
            allDay: false,
            startMinutes: from,
            endMinutes: to,
            dayIndex,
          });
        }
      }
      return events;
    })
  );

  return perCalendar.flat();
}

function dayIndexOf(rangeStartKey: string, key: string): number {
  const [ys, ms, ds] = rangeStartKey.split("-").map(Number);
  const [y, m, d] = key.split("-").map(Number);
  const start = Date.UTC(ys, ms - 1, ds);
  const target = Date.UTC(y, m - 1, d);
  return Math.round((target - start) / (24 * 60 * 60 * 1000));
}

export interface EventDraft {
  calendarId: string;
  title: string;
  location: string;
  description: string;
  /** YYYY-MM-DD e HH:MM, no fuso do backlog. */
  date: string;
  startTime: string;
  endTime: string;
}

/**
 * Cria um compromisso na agenda da pessoa, a partir de um horário vazio da
 * grade. Não passa pelo backlog de propósito: "Minha Agenda" é espelho do
 * Google, e material do Instagram continua nascendo só no backlog.
 */
export async function createGoogleEvent(
  account: UserCalendarAccount,
  draft: EventDraft
): Promise<void> {
  const accessToken = await getUserAccessToken(account.userId);

  const body = {
    summary: draft.title.trim() || "(sem título)",
    location: draft.location.trim(),
    description: draft.description.trim(),
    start: {
      dateTime: `${draft.date}T${draft.startTime}:00`,
      timeZone: TIME_ZONE,
    },
    end: {
      // Hora final menor ou igual à inicial = o compromisso passa da
      // meia-noite; sem isso o Google recusa o intervalo.
      dateTime:
        draft.endTime <= draft.startTime
          ? `${addDaysKey(draft.date, 1)}T${draft.endTime}:00`
          : `${draft.date}T${draft.endTime}:00`,
      timeZone: TIME_ZONE,
    },
  };

  const response = await fetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(
      draft.calendarId
    )}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const detail = await response.text();
    if (response.status === 403) {
      throw new Error("Sua conta não pode criar eventos nesta agenda.");
    }
    throw new Error(`Falha ao criar o compromisso: ${detail}`);
  }
}

export interface EventEdit {
  calendarId: string;
  eventId: string;
  /** Id do evento mestre, quando o que se está editando é uma ocorrência. */
  recurringEventId: string | null;
  /** "single" muda só aquele dia; "series" muda o evento repetido inteiro. */
  scope: "single" | "series";
  title: string;
  location: string;
  description: string;
  /** YYYY-MM-DD e HH:MM. Ausentes em evento de dia todo, que só muda texto. */
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;
}

/**
 * Salva a edição de um compromisso na agenda da pessoa.
 *
 * O caso delicado é o evento repetido. Editar uma ocorrência é PATCH nela
 * mesma, e o Google cria a exceção sozinho. Editar a série é PATCH no evento
 * mestre — e aí o horário precisa ser aplicado na DATA do mestre, não na
 * data da ocorrência que estava aberta na tela, senão a série inteira se
 * muda de dia.
 */
export async function updateGoogleEvent(
  account: UserCalendarAccount,
  edit: EventEdit
): Promise<void> {
  const accessToken = await getUserAccessToken(account.userId);
  const editingSeries = edit.scope === "series" && edit.recurringEventId;
  const targetId = editingSeries ? edit.recurringEventId! : edit.eventId;

  const body: Record<string, unknown> = {
    summary: edit.title.trim() || "(sem título)",
    location: edit.location.trim(),
    description: edit.description.trim(),
  };

  if (edit.date && edit.startTime && edit.endTime) {
    let day = edit.date;

    if (editingSeries) {
      const master = await fetch(
        `${CALENDAR_API}/calendars/${encodeURIComponent(
          edit.calendarId
        )}/events/${encodeURIComponent(targetId)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (master.ok) {
        const data = await master.json();
        const masterStart: string | undefined =
          data.start?.dateTime ?? data.start?.date;
        // Mantém o dia em que a série começa; só o horário muda.
        if (masterStart) day = masterStart.slice(0, 10);
      }
    }

    body.start = {
      dateTime: `${day}T${edit.startTime}:00`,
      timeZone: TIME_ZONE,
    };
    body.end = {
      // Hora final menor que a inicial = passou da meia-noite.
      dateTime:
        edit.endTime <= edit.startTime
          ? `${addDaysKey(day, 1)}T${edit.endTime}:00`
          : `${day}T${edit.endTime}:00`,
      timeZone: TIME_ZONE,
    };
  }

  const response = await fetch(
    `${CALENDAR_API}/calendars/${encodeURIComponent(
      edit.calendarId
    )}/events/${encodeURIComponent(targetId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const detail = await response.text();
    if (response.status === 403) {
      throw new Error(
        "Sua conta não tem permissão pra editar este compromisso."
      );
    }
    throw new Error(`Falha ao salvar o compromisso: ${detail}`);
  }
}
