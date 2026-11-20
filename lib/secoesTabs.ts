/** Abas das duas seções que nasceram de "Clientes". Fora do componente de
 *  abas (que é "use client") para o layout, no servidor, poder lê-las. */
export type SecaoTab = {
  href: string;
  label: string;
  /** Leva o `?mes=` junto ao trocar de aba: quem olha outubro continua em outubro. */
  keepMonth?: boolean;
};

export const ENTREGAS_TABS: SecaoTab[] = [
  { href: "/admin/entregas", label: "Quadro" },
  { href: "/admin/entregas/calendario", label: "Calendário" },
];

export const FINANCEIRO_TABS: SecaoTab[] = [
  { href: "/admin/financeiro", label: "Painel", keepMonth: true },
  { href: "/admin/financeiro/cobrancas", label: "Cobranças" },
  { href: "/admin/financeiro/contas", label: "Contas", keepMonth: true },
  { href: "/admin/financeiro/entradas", label: "Entradas", keepMonth: true },
  { href: "/admin/financeiro/saidas", label: "Saídas", keepMonth: true },
  { href: "/admin/financeiro/clientes", label: "Clientes" },
  { href: "/admin/financeiro/os", label: "Buscar OS" },
];

/** Aba do Financeiro a partir do nome antigo (`?aba=` de /admin/clientes/dinheiro, hoje no Financeiro). */
export const FINANCEIRO_POR_ABA: Record<string, string> = {
  painel: "/admin/financeiro",
  hoje: "/admin/financeiro/cobrancas",
  contas: "/admin/financeiro/contas",
  resultado: "/admin/financeiro/entradas",
  saidas: "/admin/financeiro/saidas",
};
