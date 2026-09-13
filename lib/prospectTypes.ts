/**
 * Prospecção: tipos compartilhados entre servidor e cliente.
 *
 * Separado de `lib/prospects.ts` porque aquele é `server-only` (fala com o
 * Supabase) e os componentes de tela precisam dos tipos — mesma divisão que
 * `backlogTypes` / `backlog`.
 */

/**
 * O nome da etapa é livre, o comportamento não. Quem renomeia "Perdido" para
 * "Não rolou" não pode fazer o app esquecer que ali se pergunta o motivo.
 */
export const PROSPECT_STAGE_KINDS = [
  "ativa",
  "ganha",
  "perdida",
  "nutricao",
] as const;
export type ProspectStageKind = (typeof PROSPECT_STAGE_KINDS)[number];

export function normalizeStageKind(value: unknown): ProspectStageKind {
  return PROSPECT_STAGE_KINDS.includes(value as ProspectStageKind)
    ? (value as ProspectStageKind)
    : "ativa";
}

export const STAGE_KIND_LABELS: Record<ProspectStageKind, string> = {
  ativa: "Em andamento",
  ganha: "Fechou",
  perdida: "Perdido — pede o motivo",
  nutricao: "Nutrição — volta numa data",
};

export const PROSPECT_STAGE_COLORS = [
  "#6b7280",
  "#3b82f6",
  "#8b5cf6",
  "#06b6d4",
  "#f59e0b",
  "#ec4899",
  "#10b981",
  "#ef4444",
  "#a855f7",
] as const;

export interface ProspectStage {
  id: string;
  name: string;
  color: string;
  position: number;
  kind: ProspectStageKind;
  playbook: string;
}

export interface Prospect {
  id: string;
  name: string;
  client_id: string | null;
  stage_id: string;
  owner_id: string | null;
  contact_name: string;
  role: string;
  phone: string;
  email: string;
  handle: string;
  origin: string;
  next_contact_date: string | null;
  next_contact_time: string | null;
  next_contact_minutes: number | null;
  next_contact_what: string;
  lost_reason: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export const PROSPECT_TOUCH_KINDS = ["contato", "nota", "etapa"] as const;
export type ProspectTouchKind = (typeof PROSPECT_TOUCH_KINDS)[number];

export interface ProspectTouch {
  id: string;
  prospect_id: string;
  author_id: string | null;
  kind: ProspectTouchKind;
  message: string;
  happened_at: string;
}

export interface ProspectOwnerOption {
  id: string;
  username: string;
}

export interface ProspectClientOption {
  id: string;
  name: string;
}

/** O que a fila, a ficha e a tabela recebem: o contato já com a etapa junto. */
export interface ProspectRow extends Prospect {
  stage: ProspectStage;
  /** Quando foi o último registro no histórico — null se nunca houve. */
  last_touch_at: string | null;
  touch_count: number;
}

// ------------------------------------------------------------------ datas

/** "2026-08-17" -> "17/08". Sem passar por Date, pra não pegar fuso. */
export function formatDateShort(isoDate: string): string {
  const [, month, day] = isoDate.split("-");
  return `${day}/${month}`;
}

/** "2026-08-17" -> "17/08/2026". */
export function formatDateFull(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

/** "14:00:00" -> "14:00". O Postgres devolve `time` com segundos. */
export function formatTime(value: string): string {
  return value.slice(0, 5);
}

/** Hoje em "AAAA-MM-DD" no fuso do estúdio, sem depender do fuso do servidor. */
export function todayISO(timeZone = "America/Sao_Paulo"): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Soma dias a uma data ISO e devolve ISO. Comparação só de calendário. */
export function addDaysISO(isoDate: string, days: number): string {
  const parsed = new Date(`${isoDate}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

/**
 * Em que bloco da fila o contato cai.
 *
 * `sem-data` vem primeiro de propósito: contato sem próximo passo é o
 * vazamento silencioso do funil, e a tela tem que gritar isso em vez de
 * escondê-lo no fim da lista.
 */
export type QueueBucket = "sem-data" | "atrasado" | "hoje" | "semana" | "depois";

export function queueBucket(
  nextDate: string | null,
  today: string
): QueueBucket {
  if (!nextDate) return "sem-data";
  if (nextDate < today) return "atrasado";
  if (nextDate === today) return "hoje";
  return nextDate <= addDaysISO(today, 7) ? "semana" : "depois";
}

export const QUEUE_BUCKET_LABELS: Record<QueueBucket, string> = {
  "sem-data": "Sem próximo passo",
  atrasado: "Atrasado",
  hoje: "Hoje",
  semana: "Próximos 7 dias",
  depois: "Depois",
};

/** Quantos dias de atraso — só para os que já passaram. */
export function daysLate(nextDate: string, today: string): number {
  const a = Date.parse(`${nextDate}T00:00:00Z`);
  const b = Date.parse(`${today}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}
