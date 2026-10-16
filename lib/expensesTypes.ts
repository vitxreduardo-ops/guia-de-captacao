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
}
