// Tipos e constantes do backlog que também rodam no cliente. Fica separado de
// `lib/backlog.ts` porque aquele é "server-only" (acessa o Supabase com a
// service role) e não pode ser importado por componentes de cliente.

import type { ServiceOption } from "@/lib/billingTypes";

export type { ServiceOption };

export const BACKLOG_FORMATS = ["reel", "carrossel", "foto", "story"] as const;
export type BacklogFormat = (typeof BACKLOG_FORMATS)[number];

export const BACKLOG_FORMAT_LABELS: Record<BacklogFormat, string> = {
  reel: "Reel",
  carrossel: "Carrossel",
  foto: "Foto",
  story: "Story",
};

/** Cores oferecidas na criação/edição de coluna. */
export const BACKLOG_COLUMN_COLORS = [
  "#6b7280",
  "#0ea5e9",
  "#8b5cf6",
  "#f59e0b",
  "#10b981",
  "#ef4444",
  "#ec4899",
] as const;

/**
 * O mesmo kanban serve dois quadros: os materiais do Instagram da Tatu e as
 * entregas de cliente que viram nota fiscal. Cada coluna pertence a um deles.
 */
export const BACKLOG_BOARDS = ["instagram", "entregas"] as const;
export type BacklogBoardKind = (typeof BACKLOG_BOARDS)[number];

export function normalizeBacklogBoard(value: unknown): BacklogBoardKind {
  return value === "entregas" ? "entregas" : "instagram";
}

export interface BacklogColumn {
  id: string;
  name: string;
  color: string;
  position: number;
  board: BacklogBoardKind;
  /** Coluna que representa entrega concluída — o que entra na nota do mês. */
  billable: boolean;
  /** Entre as faturáveis, a que significa dinheiro já recebido. */
  paid: boolean;
  created_at: string;
}

export interface BacklogCard {
  id: string;
  column_id: string;
  client_id: string | null;
  guide_id: string | null;
  /** Responsáveis vêm da tabela de junção; um card aceita mais de um. */
  assignee_ids: string[];
  position: number;
  title: string;
  description: string;
  format: BacklogFormat;
  drive_url: string | null;
  cover_url: string | null;
  caption: string;
  post_date: string | null;
  post_time: string | null;
  duration_minutes: number | null;
  backup_location: string | null;
  sent_whatsapp: boolean;
  sent_whatsapp_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  /** Cobrança — só usada no quadro de entregas. */
  contract_type: ContractType | null;
  /** Produto escrito à mão: vale só neste card, não entra no catálogo. */
  custom_service: string | null;
  service_id: string | null;
  quantity: number;
  unit_price_cents: number | null;
  paid_at: string | null;
  payment_method: PaymentMethod | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface BacklogChecklistItem {
  id: string;
  card_id: string;
  position: number;
  label: string;
  done: boolean;
  created_at: string;
}

export type BacklogActivityKind = "move" | "answer" | "note";

export interface BacklogActivity {
  id: string;
  card_id: string;
  author_id: string | null;
  kind: BacklogActivityKind;
  message: string;
  created_at: string;
}

/**
 * Automação fixa: ao sair da primeira coluna (onde o material é ideia e
 * captação) pra próxima etapa, pergunta onde o arquivo bruto foi salvo. Vale
 * pra qualquer formato — carrossel também tem projeto pra guardar.
 *
 * As colunas são casadas por nome porque o admin pode recriá-las, o que
 * trocaria os ids. `matchesColumnName` normaliza acento e caixa.
 */
export const BACKUP_QUESTION = "Onde foi feito o backup?";
export const PAYMENT_QUESTION = "O pagamento já foi feito?";

export const CONTRACT_TYPES = ["mensal", "freela"] as const;
export type ContractType = (typeof CONTRACT_TYPES)[number];

export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  mensal: "Mensal",
  freela: "Freela",
};

export function normalizeContractType(value: unknown): ContractType | null {
  const raw = String(value ?? "").trim();
  return (CONTRACT_TYPES as readonly string[]).includes(raw)
    ? (raw as ContractType)
    : null;
}

export const PAYMENT_METHODS = [
  "pix",
  "transferencia",
  "boleto",
  "dinheiro",
  "cartao",
  "outro",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: "Pix",
  transferencia: "Transferência",
  boleto: "Boleto",
  dinheiro: "Dinheiro",
  cartao: "Cartão",
  outro: "Outro",
};

/** Fora da lista vira null: a forma de pagamento é opcional, não um palpite. */
export function normalizePaymentMethod(value: unknown): PaymentMethod | null {
  const raw = String(value ?? "").trim();
  return (PAYMENT_METHODS as readonly string[]).includes(raw)
    ? (raw as PaymentMethod)
    : null;
}

/**
 * O que o quadro pergunta depois de um arraste. O de texto vira uma linha na
 * atividade; o de pagamento decide onde o card pousa, então carrega o id da
 * coluna de espera para o caso de "ainda não".
 */
export type BacklogPrompt =
  | { kind: "text"; question: string }
  | { kind: "payment"; question: string; waitingColumnId: string };

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Duração padrão de um material agendado, quando não foi esticado. */
export const DEFAULT_DURATION_MINUTES = 60;

/** Coluna onde o card pode ser marcado como aprovado. */
export function isApprovalColumn(columnName: string): boolean {
  return normalizeName(columnName).includes("aprova");
}

export function shouldAskBackupQuestion(
  fromColumnName: string,
  toColumnName: string
): boolean {
  const from = normalizeName(fromColumnName);
  const to = normalizeName(toColumnName);
  return from.includes("ideia") && to.includes("captado");
}

export interface BacklogClientOption {
  id: string;
  name: string;
  /** Dia de vencimento, para marcar o que já passou da data no quadro. */
  payment_day: number | null;
}

/**
 * Vencimento de um mês de competência: o combinado é pagar no mês seguinte
 * ao da entrega — entrega de agosto com vencimento 10 é cobrada até 10/09.
 * Dia 31 num mês de 30 cai no último dia, que é como banco e boleto tratam.
 */
export function dueDateOf(month: string, paymentDay: number): Date {
  const year = Number(month.slice(0, 4));
  const index = Number(month.slice(5, 7)); // mês seguinte, já em base 0
  const ultimoDia = new Date(year, index + 1, 0).getDate();
  return new Date(year, index, Math.min(paymentDay, ultimoDia));
}

export interface BacklogGuideOption {
  id: string;
  title: string;
}

/** Quem pode ser responsável por um material: os usuários do admin. */
export interface BacklogUserOption {
  id: string;
  username: string;
}

export interface BacklogBoard {
  board: BacklogBoardKind;
  columns: BacklogColumn[];
  cards: BacklogCard[];
  checklist: BacklogChecklistItem[];
  activity: BacklogActivity[];
  clients: BacklogClientOption[];
  guides: BacklogGuideOption[];
  users: BacklogUserOption[];
  /** Catálogo de preços, pra preencher a cobrança do card. */
  services: ServiceOption[];
}

// ------------------------------------------------------------------ filtro

/** Sem data é uma opção como qualquer outra, por isso `none` na lista. */
export type BacklogDateBucket =
  | "none"
  | "late"
  | "today"
  | "week"
  | "month";

export const BACKLOG_DATE_BUCKET_LABELS: Record<BacklogDateBucket, string> = {
  none: "Sem data",
  late: "Atrasado",
  today: "Hoje",
  week: "Nos próximos 7 dias",
  month: "Nos próximos 30 dias",
};

export type BacklogCardStatus =
  | "whatsapp_sent"
  | "whatsapp_pending"
  | "checklist_done"
  | "checklist_pending";

export const BACKLOG_CARD_STATUS_LABELS: Record<BacklogCardStatus, string> = {
  whatsapp_sent: "Enviado por WhatsApp",
  whatsapp_pending: "Não enviado por WhatsApp",
  checklist_done: "Checklist concluído",
  checklist_pending: "Checklist pendente",
};

/**
 * Seleção do painel de filtro. Dentro de cada bloco as opções somam (OU);
 * entre blocos elas restringem (E) — mesma lógica do Trello. `assignees` e
 * `clients` aceitam a string "none" para "sem responsável"/"sem cliente".
 */
export interface BacklogFilter {
  keyword: string;
  assignees: string[];
  clients: string[];
  formats: BacklogFormat[];
  dates: BacklogDateBucket[];
  statuses: BacklogCardStatus[];
}

export const EMPTY_BACKLOG_FILTER: BacklogFilter = {
  keyword: "",
  assignees: [],
  clients: [],
  formats: [],
  dates: [],
  statuses: [],
};

/** Quantos critérios estão ligados — vira o número na bolinha do botão. */
export function countBacklogFilters(filter: BacklogFilter): number {
  return (
    (filter.keyword.trim() ? 1 : 0) +
    filter.assignees.length +
    filter.clients.length +
    filter.formats.length +
    filter.dates.length +
    filter.statuses.length
  );
}

function todayIso(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function addDaysIso(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
    date.getUTCDate()
  )}`;
}

function matchesDate(card: BacklogCard, buckets: BacklogDateBucket[]): boolean {
  const today = todayIso();
  return buckets.some((bucket) => {
    if (bucket === "none") return !card.post_date;
    if (!card.post_date) return false;
    if (bucket === "late") return card.post_date < today;
    if (bucket === "today") return card.post_date === today;
    if (bucket === "week") {
      return card.post_date >= today && card.post_date <= addDaysIso(today, 7);
    }
    return card.post_date >= today && card.post_date <= addDaysIso(today, 30);
  });
}

function matchesStatus(
  card: BacklogCard,
  statuses: BacklogCardStatus[],
  checklist: BacklogChecklistItem[]
): boolean {
  const progress = checklistProgress(card.id, checklist);
  return statuses.some((status) => {
    if (status === "whatsapp_sent") return card.sent_whatsapp;
    if (status === "whatsapp_pending") return !card.sent_whatsapp;
    if (status === "checklist_done") {
      return progress !== null && progress.done === progress.total;
    }
    return progress !== null && progress.done < progress.total;
  });
}

function matchesKeyword(card: BacklogCard, keyword: string): boolean {
  const needle = keyword.trim().toLowerCase();
  if (!needle) return true;
  return [card.title, card.caption, card.description, card.tags.join(" ")]
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

export function filterBacklogCards(
  cards: BacklogCard[],
  filter: BacklogFilter,
  checklist: BacklogChecklistItem[]
): BacklogCard[] {
  return cards.filter((card) => {
    if (!matchesKeyword(card, filter.keyword)) return false;

    if (filter.assignees.length > 0) {
      // Card sem responsável casa com "sem responsável"; com vários, basta um
      // deles estar no filtro.
      const keys = card.assignee_ids.length > 0 ? card.assignee_ids : ["none"];
      if (!keys.some((key) => filter.assignees.includes(key))) return false;
    }

    if (filter.clients.length > 0) {
      const key = card.client_id ?? "none";
      if (!filter.clients.includes(key)) return false;
    }

    if (filter.formats.length > 0 && !filter.formats.includes(card.format)) {
      return false;
    }

    if (filter.dates.length > 0 && !matchesDate(card, filter.dates)) {
      return false;
    }

    if (
      filter.statuses.length > 0 &&
      !matchesStatus(card, filter.statuses, checklist)
    ) {
      return false;
    }

    return true;
  });
}

/** Progresso do checklist de um card, ou null se ele não tem itens. */
export function checklistProgress(
  cardId: string,
  items: BacklogChecklistItem[]
): { done: number; total: number } | null {
  const own = items.filter((item) => item.card_id === cardId);
  if (own.length === 0) return null;
  return { done: own.filter((item) => item.done).length, total: own.length };
}

export function isBacklogFormat(value: string): value is BacklogFormat {
  return (BACKLOG_FORMATS as readonly string[]).includes(value);
}

export function normalizeBacklogFormat(value: unknown): BacklogFormat {
  const raw = String(value ?? "").trim();
  return isBacklogFormat(raw) ? raw : "reel";
}

/** Aceita "tatu, food, natal" ou uma tag por linha. */
export function parseBacklogTags(value: unknown): string[] {
  return String(value ?? "")
    .split(/[,\n]/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag, index, all) => all.indexOf(tag) === index);
}

/** "2026-08-17" -> "17/08". Formata sem passar por Date pra não pegar fuso. */
export function formatBacklogDateShort(isoDate: string): string {
  const [, month, day] = isoDate.split("-");
  return `${day}/${month}`;
}
