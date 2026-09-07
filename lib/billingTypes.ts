// Tipos e cálculo de dinheiro do faturamento. Fica separado de `lib/billing.ts`
// (que é "server-only") pra poder ser importado pelos componentes de cliente,
// mesma divisão de `backlogTypes.ts` e `backlog.ts`.

/**
 * Todo valor trafega em centavos inteiros. Real com casa decimal em `number`
 * acumula erro de ponto flutuante, e nota fiscal não perdoa um centavo.
 */
export interface Service {
  id: string;
  name: string;
  price_cents: number;
  position: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

/** Opção enxuta usada nos selects do kanban. */
export interface ServiceOption {
  id: string;
  name: string;
  price_cents: number;
}

/** Uma entrega do mês, já vinda do card do quadro de entregas. */
export interface MonthDelivery {
  card_id: string;
  title: string;
  service_name: string | null;
  post_date: string | null;
  quantity: number;
  unit_price_cents: number;
  /** Entrega feita e dinheiro recebido são coisas diferentes. */
  paid: boolean;
  paid_at: string | null;
  payment_method: string | null;
}

export interface MonthlyInvoiceItem {
  id: string;
  invoice_id: string;
  card_id: string | null;
  description: string;
  quantity: number;
  unit_price_cents: number;
  position: number;
  paid: boolean;
  paid_at: string | null;
  payment_method: string | null;
}

export interface MonthlyInvoice {
  id: string;
  client_id: string;
  /** Primeiro dia do mês de competência ("2026-08-01"). */
  month: string;
  total_cents: number;
  notes: string;
  closed_at: string;
  closed_by: string | null;
}

export interface MonthlyInvoiceWithItems extends MonthlyInvoice {
  client_name: string;
  items: MonthlyInvoiceItem[];
}

// ------------------------------------------------------------------ dinheiro

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/**
 * Lê o que a pessoa digitou no campo de valor. Aceita os formatos que aparecem
 * na prática: "1.234,56", "1234,56", "1234.56", "R$ 890" e "890".
 *
 * A regra do separador decimal é posicional, não por símbolo: o último ponto ou
 * vírgula só separa centavos se tiver no máximo dois dígitos depois dele —
 * assim "1.234" é mil duzentos e trinta e quatro, e "1.23" é um e vinte e três.
 */
export function parseBRLToCents(value: unknown): number {
  const raw = String(value ?? "").trim();
  if (!raw) return 0;

  const digitsAndSeparators = raw.replace(/[^\d.,]/g, "");
  if (!digitsAndSeparators) return 0;

  const lastSeparator = Math.max(
    digitsAndSeparators.lastIndexOf(","),
    digitsAndSeparators.lastIndexOf(".")
  );
  const decimals =
    lastSeparator === -1
      ? ""
      : digitsAndSeparators.slice(lastSeparator + 1).replace(/\D/g, "");

  // Mais de duas casas depois do separador = separador de milhar, não decimal.
  const hasDecimalPart = lastSeparator !== -1 && decimals.length > 0 && decimals.length <= 2;

  const wholePart = (hasDecimalPart
    ? digitsAndSeparators.slice(0, lastSeparator)
    : digitsAndSeparators
  ).replace(/\D/g, "");

  const cents = hasDecimalPart ? decimals.padEnd(2, "0") : "00";
  const total = Number(`${wholePart || "0"}${cents}`);
  return Number.isFinite(total) ? total : 0;
}

export function lineTotalCents(line: {
  quantity: number;
  unit_price_cents: number | null;
}): number {
  return Math.max(0, line.quantity || 0) * Math.max(0, line.unit_price_cents ?? 0);
}

export function sumCents(
  lines: { quantity: number; unit_price_cents: number | null }[]
): number {
  return lines.reduce((total, line) => total + lineTotalCents(line), 0);
}

/**
 * O mês tem dois números: o que já entrou e o que ainda vai entrar. A nota
 * soma os dois — o que muda é quando o dinheiro chega.
 */
export function splitPaidCents(
  lines: {
    quantity: number;
    unit_price_cents: number | null;
    paid: boolean;
  }[]
): { paidCents: number; unpaidCents: number } {
  return {
    paidCents: sumCents(lines.filter((line) => line.paid)),
    unpaidCents: sumCents(lines.filter((line) => !line.paid)),
  };
}

// ---------------------------------------------------------------------- mês

/** "2026-08-13" (ou um Date) vira "2026-08-01", a competência do mês. */
export function monthKey(value: string | Date): string {
  const text =
    value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
  return `${text.slice(0, 7)}-01`;
}

/** Primeiro dia do mês seguinte — o limite exclusivo das consultas por período. */
export function nextMonthKey(month: string): string {
  const year = Number(month.slice(0, 4));
  const index = Number(month.slice(5, 7));
  return index === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(index + 1).padStart(2, "0")}-01`;
}

const MONTH_NAMES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export function monthLabel(month: string): string {
  const name = MONTH_NAMES[Number(month.slice(5, 7)) - 1] ?? "";
  return `${name} de ${month.slice(0, 4)}`;
}

/** Últimos 12 meses, do atual pro passado — as opções do seletor. */
export function recentMonths(today = new Date(), count = 12): string[] {
  const months: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const date = new Date(today.getFullYear(), today.getMonth() - index, 1);
    months.push(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`
    );
  }
  return months;
}
