/** Abas das duas seções que nasceram de "Clientes". Fora do componente de
 *  abas (que é "use client") para o layout, no servidor, poder lê-las. */
export type SecaoTab = {
  href: string;
  label: string;
  /** A aba continua marcada nas páginas dentro dela (ex.: /contas/[cliente]). */
  prefix?: boolean;
  /** Leva o `?mes=` junto ao trocar de aba: quem olha outubro continua em outubro. */
  keepMonth?: boolean;
};

export const ENTREGAS_TABS: SecaoTab[] = [
  { href: "/admin/entregas", label: "Quadro" },
  { href: "/admin/entregas/calendario", label: "Calendário" },
];

export const FINANCEIRO_TABS: SecaoTab[] = [
  { href: "/admin/financeiro", label: "Visão geral" },
  { href: "/admin/financeiro/pagar-e-receber", label: "A pagar e receber" },
  { href: "/admin/financeiro/projecao", label: "Projeção" },
  { href: "/admin/financeiro/analise", label: "Análise", keepMonth: true },
  { href: "/admin/financeiro/extrato", label: "Extrato", keepMonth: true },
  { href: "/admin/financeiro/contas", label: "Por cliente", prefix: true },
  { href: "/admin/financeiro/clientes", label: "Clientes" },
  { href: "/admin/financeiro/os", label: "Buscar OS" },
];

/** Abas que mostram o dinheiro do estúdio todo (caixa, contas a pagar, resultado): quem só vê alguns clientes não as recebe. */
export const FINANCEIRO_SO_ESTUDIO = [
  "/admin/financeiro/projecao",
  "/admin/financeiro/analise",
  "/admin/financeiro/extrato",
];

/** Aba do Financeiro a partir do nome antigo (`?aba=` de /admin/clientes/dinheiro, hoje no Financeiro). */
export const FINANCEIRO_POR_ABA: Record<string, string> = {
  painel: "/admin/financeiro",
  hoje: "/admin/financeiro/pagar-e-receber",
  contas: "/admin/financeiro/contas",
  resultado: "/admin/financeiro/analise",
  saidas: "/admin/financeiro/extrato",
};
