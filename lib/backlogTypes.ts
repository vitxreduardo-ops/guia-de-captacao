// Tipos e constantes do backlog que também rodam no cliente. Fica separado de
// `lib/backlog.ts` porque aquele é "server-only" (acessa o Supabase com a
// service role) e não pode ser importado por componentes de cliente.

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

export interface BacklogColumn {
  id: string;
  name: string;
  color: string;
  position: number;
  created_at: string;
}

export interface BacklogCard {
  id: string;
  column_id: string;
  client_id: string | null;
  guide_id: string | null;
  position: number;
  title: string;
  description: string;
  format: BacklogFormat;
  drive_url: string | null;
  cover_url: string | null;
  caption: string;
  post_date: string | null;
  sent_whatsapp: boolean;
  sent_whatsapp_at: string | null;
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

export interface BacklogClientOption {
  id: string;
  name: string;
}

export interface BacklogGuideOption {
  id: string;
  title: string;
}

export interface BacklogBoard {
  columns: BacklogColumn[];
  cards: BacklogCard[];
  checklist: BacklogChecklistItem[];
  clients: BacklogClientOption[];
  guides: BacklogGuideOption[];
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
