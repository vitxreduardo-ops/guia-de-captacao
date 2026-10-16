// Tipos da tela Dinheiro. Sem "server-only" pra os componentes de cliente
// poderem importar, mesma divisão de `billingTypes.ts`.

export interface MoneyItem {
  cardId: string;
  title: string;
  serviceName: string | null;
  date: string | null;
  quantity: number;
  unitCents: number;
  totalCents: number;
  /** Quanto já entrou. Igual ao total quando está pago; parte dele no pagamento parcial. */
  receivedCents: number;
  /** Quanto falta (total menos o recebido). */
  openCents: number;
  paid: boolean;
  paidAt: string | null;
  method: string | null;
  /** Vencimento desta entrega: o escolhido à mão ou o do dia combinado com o cliente. */
  dueOn: string | null;
  /** true quando o vencimento foi escolhido à mão (e não calculado). */
  dueCustom: boolean;
}

/** pago = tudo recebido; atrasado = passou do dia combinado; aberto = ainda no prazo. */
export type MoneyStatus = "pago" | "atrasado" | "aberto";

export interface MoneyClient {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  paymentDay: number | null;
  /** Dia combinado de pagamento deste mês, AAAA-MM-DD. Null sem dia cadastrado. */
  dueDate: string | null;
  items: MoneyItem[];
  paidCents: number;
  openCents: number;
  status: MoneyStatus;
}

/** Dinheiro que ficou pra trás em outro mês. */
export interface MoneyOpenElsewhere {
  clientId: string;
  clientName: string;
  month: string;
  cents: number;
  dueDate: string | null;
  overdue: boolean;
  /** Quanto desse mês já passou do vencimento. */
  overdueCents?: number;
}

export interface MoneyMonth {
  month: string;
  clients: MoneyClient[];
  paidCents: number;
  openCents: number;
  /** Atrasado em qualquer mês, não só no aberto na tela. */
  overdueCents: number;
  elsewhere: MoneyOpenElsewhere[];
}

export interface MoneyYearMonth {
  paidCents: number;
  openCents: number;
}
