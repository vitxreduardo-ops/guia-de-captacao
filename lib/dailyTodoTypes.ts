// Tipos e constantes da lista de tarefas, sem "server-only": a lista roda no
// cliente e precisa deles. O acesso ao banco fica em lib/dailyTodos.ts.

/** Dias que uma tarefa concluída fica na lista antes de sumir sozinha. */
export const TODO_RETENTION_DAYS = 15;

export interface DailyTodo {
  id: string;
  text: string;
  done: boolean;
  completed_at: string | null;
  created_by: string | null;
  completed_by: string | null;
  created_at: string;
}

export interface TodoUser {
  id: string;
  username: string;
}

/** Tarefa já com os nomes resolvidos, do jeito que a tela usa. */
export interface DailyTodoView extends DailyTodo {
  created_by_username: string | null;
  /** Uma tarefa aceita mais de um responsável. Vazio = sem responsável. */
  assignees: TodoUser[];
}
