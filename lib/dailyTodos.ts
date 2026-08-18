import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/** Dias que uma tarefa concluída fica na lista antes de sumir sozinha. */
export const TODO_RETENTION_DAYS = 15;

export interface DailyTodo {
  id: string;
  text: string;
  done: boolean;
  completed_at: string | null;
  created_by: string | null;
  completed_by: string | null;
  assignee_id: string | null;
  created_at: string;
}

export interface TodoUser {
  id: string;
  username: string;
}

/** Tarefa já com os nomes resolvidos, do jeito que a tela usa. */
export interface DailyTodoView extends DailyTodo {
  created_by_username: string | null;
  assignee_username: string | null;
}

/**
 * Apaga o que já passou da retenção. Não tem cron no projeto, então a limpeza
 * roda na leitura — o hub é aberto direto, e uma tarefa sobrar um dia a mais
 * porque ninguém abriu a tela não é problema.
 */
async function purgeExpired() {
  const supabase = getSupabaseServerClient();
  const cutoff = new Date(
    Date.now() - TODO_RETENTION_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { error } = await supabase
    .from("daily_todos")
    .delete()
    .eq("done", true)
    .lt("completed_at", cutoff);
  if (error) throw error;
}

export async function listDailyTodos(): Promise<{
  todos: DailyTodoView[];
  users: TodoUser[];
}> {
  await purgeExpired();

  const supabase = getSupabaseServerClient();
  const [todosResult, usersResult] = await Promise.all([
    supabase
      .from("daily_todos")
      // Pendente primeiro; dentro de cada grupo, mais antiga em cima.
      .select("*")
      .order("done")
      .order("created_at"),
    supabase.from("users").select("id, username").order("username"),
  ]);

  if (todosResult.error) throw todosResult.error;
  if (usersResult.error) throw usersResult.error;

  const users = (usersResult.data ?? []) as TodoUser[];
  const usernameById = new Map(users.map((user) => [user.id, user.username]));

  const todos = ((todosResult.data ?? []) as DailyTodo[]).map((todo) => ({
    ...todo,
    created_by_username: todo.created_by
      ? usernameById.get(todo.created_by) ?? null
      : null,
    assignee_username: todo.assignee_id
      ? usernameById.get(todo.assignee_id) ?? null
      : null,
  }));

  return { todos, users };
}

export async function createDailyTodo(text: string, userId: string | null) {
  const trimmed = text.trim();
  if (!trimmed) return;

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("daily_todos").insert({
    text: trimmed,
    created_by: userId,
    // Quem cria fica responsável até alguém trocar na bolinha.
    assignee_id: userId,
  });
  if (error) throw error;
}

/**
 * Marca/desmarca a tarefa. O completed_at é o que decide a expiração, então
 * desmarcar precisa limpá-lo — senão a tarefa volta a pendente e some 15 dias
 * depois da conclusão antiga.
 */
export async function setDailyTodoDone(
  id: string,
  done: boolean,
  userId: string | null
) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("daily_todos")
    .update({
      done,
      completed_at: done ? new Date().toISOString() : null,
      completed_by: done ? userId : null,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function renameDailyTodo(id: string, text: string) {
  const trimmed = text.trim();
  // Nome vazio apagaria a tarefa da vista sem apagar do banco.
  if (!trimmed) return;

  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("daily_todos")
    .update({ text: trimmed })
    .eq("id", id);
  if (error) throw error;
}

/** `assigneeId` nulo deixa a tarefa sem responsável. */
export async function setDailyTodoAssignee(
  id: string,
  assigneeId: string | null
) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("daily_todos")
    .update({ assignee_id: assigneeId })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteDailyTodo(id: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("daily_todos").delete().eq("id", id);
  if (error) throw error;
}
