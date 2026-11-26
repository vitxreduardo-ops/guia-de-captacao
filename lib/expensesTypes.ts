export const EXPENSE_CATEGORIES = [
  "equipe",
  "equipamento",
  "software",
  "impostos",
  "transporte",
  "marketing",
  "outros",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  equipe: "Equipe",
  equipamento: "Equipamento",
  software: "Programas e assinaturas",
  impostos: "Impostos e contador",
  transporte: "Transporte",
  marketing: "Divulgação",
  outros: "Outros",
};

export function normalizeExpenseCategory(value: unknown): ExpenseCategory {
  return (EXPENSE_CATEGORIES as readonly string[]).includes(String(value))
    ? (value as ExpenseCategory)
    : "outros";
}

export interface Expense {
  id: string;
  description: string;
  amountCents: number;
  category: ExpenseCategory;
  spentOn: string;
  /** Preenchido quando veio de uma despesa que se repete todo mês. */
  recurringId?: string;
  /** Já saiu do caixa? A fixa conta como paga quando o dia dela passa; a avulsa, quando alguém marca "Paguei". */
  paid: boolean;
  /** Gasto de um cliente específico (entra na margem dele); vazio = custo do estúdio. */
  clientId?: string | null;
  clientName?: string | null;
  /** Pago no cartão pessoal de alguém: só sai do caixa quando o estúdio reembolsa (paid vira true). */
  paidBy?: PagoPor | null;
}

export const PAGO_POR = ["vitor", "rebeca"] as const;
export type PagoPor = (typeof PAGO_POR)[number];
export const PAGO_POR_LABELS: Record<PagoPor, string> = { vitor: "Vitor", rebeca: "Rebeca" };

export function normalizePagoPor(value: unknown): PagoPor | null {
  return (PAGO_POR as readonly string[]).includes(String(value)) ? (value as PagoPor) : null;
}
