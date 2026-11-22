/**
 * Contas puras do Painel: datas da semana e a fila "precisa de atenção".
 * Sem `server-only` e sem `Date` local de propósito — tudo aqui é calendário
 * AAAA-MM-DD, então roda igual no servidor, no cliente e nos testes.
 */
import { daysBetween, dueLabel, dueStatus } from "@/lib/reminderText";

export function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Hoje e os seis dias seguintes. */
export function weekFrom(today: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDays(today, index));
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** "Dom", "Seg"... o `Intl` devolveria "dom." com ponto, que não cabe na coluna. */
export function weekdayShort(iso: string): string {
  return WEEKDAYS[new Date(`${iso}T00:00:00Z`).getUTCDay()];
}

export function dayOfMonth(iso: string): number {
  return Number(iso.slice(8, 10));
}

const LONG_DATE = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

/** "Domingo, 22 de novembro". */
export function longDate(iso: string): string {
  const text = LONG_DATE.format(new Date(`${iso}T00:00:00Z`));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export type AttentionKind = "pagamento" | "follow-up" | "entrega" | "tarefa";

export interface AttentionItem {
  key: string;
  kind: AttentionKind;
  title: string;
  /** Linha de baixo: o que é e há quanto tempo. */
  detail: string;
  /** O dia em que deveria ter acontecido. */
  due: string;
  href: string;
}

export interface AttentionInput {
  today: string;
  payments: { clientId: string; clientName: string; dueDate: string; cents: number }[];
  followups: {
    id: string;
    name: string;
    next_contact_date: string | null;
    next_contact_what: string | null;
  }[];
  lateDeliveries: { id: string; title: string; date: string; clientName: string | null }[];
  todos: { id: string; text: string; done: boolean; due_date: string | null }[];
  /** Formata centavos; chega de fora porque o formato de moeda é do chamador. */
  money: (cents: number) => string;
}

/**
 * Tudo que já passou do dia e ainda pede ação, do mais antigo ao mais novo.
 * Pagamento só entra quando venceu ou vence hoje: a janela de sete dias que
 * o Painel pede ao financeiro serve ao total "a receber", não a esta fila.
 */
export function attentionItems(input: AttentionInput): AttentionItem[] {
  const { today } = input;
  const items: AttentionItem[] = [];

  for (const payment of input.payments) {
    if (dueStatus(payment.dueDate, today) === "proximo") continue;
    items.push({
      key: `pg-${payment.clientId}`,
      kind: "pagamento",
      title: payment.clientName,
      detail: `${input.money(payment.cents)} · venceu ${dueLabel(payment.dueDate, today)}`,
      due: payment.dueDate,
      href: "/admin/financeiro/cobrancas",
    });
  }

  for (const prospect of input.followups) {
    const due = prospect.next_contact_date ?? today;
    items.push({
      key: `fu-${prospect.id}`,
      kind: "follow-up",
      title: prospect.name,
      detail: [prospect.next_contact_what, `follow-up ${dueLabel(due, today)}`]
        .filter(Boolean)
        .join(" · "),
      due,
      href: `/admin/prospeccao/${prospect.id}`,
    });
  }

  for (const delivery of input.lateDeliveries) {
    items.push({
      key: `en-${delivery.id}`,
      kind: "entrega",
      title: delivery.title || "Sem título",
      detail: [delivery.clientName, `entrega ${dueLabel(delivery.date, today)}`]
        .filter(Boolean)
        .join(" · "),
      due: delivery.date,
      href: "/admin/entregas",
    });
  }

  for (const todo of input.todos) {
    if (todo.done || !todo.due_date || dueStatus(todo.due_date, today) === "proximo") {
      continue;
    }
    items.push({
      key: `td-${todo.id}`,
      kind: "tarefa",
      title: todo.text,
      detail: `tarefa com prazo ${dueLabel(todo.due_date, today)}`,
      due: todo.due_date,
      href: "#tarefas-titulo",
    });
  }

  return items.sort(
    (a, b) => daysBetween(b.due, a.due) || a.key.localeCompare(b.key)
  );
}
