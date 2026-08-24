// Tipos e constantes da lista de tarefas, sem "server-only": a lista roda no
// cliente e precisa deles. O acesso ao banco fica em lib/dailyTodos.ts.

/** Dias que uma tarefa concluída fica na lista antes de sumir sozinha. */
export const TODO_RETENTION_DAYS = 15;

/** 1 é a mais urgente, pra ordenação crescente já valer como "urgente antes". */
export const TODO_PRIORITIES = [1, 2, 3] as const;
export type TodoPriority = (typeof TODO_PRIORITIES)[number];

export const TODO_PRIORITY_LABELS: Record<TodoPriority, string> = {
  1: "Alta",
  2: "Média",
  3: "Baixa",
};

/** Cores da etiqueta de prioridade na linha e no painel. */
export const TODO_PRIORITY_CLASSES: Record<TodoPriority, string> = {
  1: "border-red-200 bg-red-50 text-red-700",
  2: "border-amber-200 bg-amber-50 text-amber-700",
  3: "border-neutral-200 bg-neutral-50 text-neutral-600",
};

export function toTodoPriority(value: unknown): TodoPriority {
  const number = Number(value);
  return number === 1 || number === 3 ? number : 2;
}

export interface DailyTodo {
  id: string;
  text: string;
  /** Observações longas — o texto continua sendo o título de uma linha. */
  notes: string;
  done: boolean;
  due_date: string | null;
  priority: TodoPriority;
  position: number;
  completed_at: string | null;
  created_by: string | null;
  completed_by: string | null;
  created_at: string;
}

export interface TodoUser {
  id: string;
  username: string;
}

export interface DailyTodoChecklistItem {
  id: string;
  todo_id: string;
  position: number;
  label: string;
  done: boolean;
}

/** Tarefa já com os nomes resolvidos, do jeito que a tela usa. */
export interface DailyTodoView extends DailyTodo {
  created_by_username: string | null;
  /** Uma tarefa aceita mais de um responsável. Vazio = sem responsável. */
  assignees: TodoUser[];
  checklist: DailyTodoChecklistItem[];
}
