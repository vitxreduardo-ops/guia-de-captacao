import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type {
  DailyTodo,
  DailyTodoView,
  TodoUser,
} from "@/lib/dailyTodoTypes";
import { TODO_RETENTION_DAYS } from "@/lib/dailyTodoTypes";

export {
  TODO_RETENTION_DAYS,
  type DailyTodo,
  type DailyTodoView,
  type TodoUser,
} from "@/lib/dailyTodoTypes";

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
  const [todosResult, usersResult, assigneesResult] = await Promise.all([
    supabase
      .from("daily_todos")
      // Pendente primeiro; dentro de cada grupo, mais antiga em cima.
      .select("*")
      .order("done")
      .order("created_at"),
    supabase.from("users").select("id, username").order("username"),
    supabase.from("daily_todo_assignees").select("todo_id, user_id"),
  ]);

  if (todosResult.error) throw todosResult.error;
  if (usersResult.error) throw usersResult.error;
  if (assigneesResult.error) throw assigneesResult.error;

  const users = (usersResult.data ?? []) as TodoUser[];
  const userById = new Map(users.map((user) => [user.id, user]));

  // Percorre `users` (já ordenado por username) por fora, então cada tarefa
  // recebe os responsáveis nessa mesma ordem. A tela monta a lista igual, e a
  // bolinha não pula de lugar quando o dado do servidor chega.
  const assigneeIdsByTodo = new Map<string, Set<string>>();
  for (const row of assigneesResult.data ?? []) {
    const todoId = row.todo_id as string;
    const set = assigneeIdsByTodo.get(todoId);
    if (set) set.add(row.user_id as string);
    else assigneeIdsByTodo.set(todoId, new Set([row.user_id as string]));
  }

  const assigneesByTodo = new Map<string, TodoUser[]>();
  for (const [todoId, ids] of assigneeIdsByTodo) {
    assigneesByTodo.set(
      todoId,
      users.filter((user) => ids.has(user.id))
    );
  }

  const todos = ((todosResult.data ?? []) as DailyTodo[]).map((todo) => ({
    ...todo,
    created_by_username: todo.created_by
      ? userById.get(todo.created_by)?.username ?? null
      : null,
    assignees: assigneesByTodo.get(todo.id) ?? [],
  }));

  return { todos, users };
}

export async function createDailyTodo(text: string, userId: string | null) {
  const trimmed = text.trim();
  if (!trimmed) return;

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("daily_todos")
    .insert({ text: trimmed, created_by: userId })
    .select("id")
    .single();
  if (error) throw error;

  // Quem cria fica responsável até alguém mexer na bolinha.
  if (userId) {
    const { error: assigneeError } = await supabase
      .from("daily_todo_assignees")
      .insert({ todo_id: data.id as string, user_id: userId });
    if (assigneeError) throw assigneeError;
  }
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

/**
 * Substitui a lista de responsáveis. Devolve quem entrou agora, que é o que a
 * action usa pra avisar só as pessoas novas em vez de todas de novo.
 */
export async function setDailyTodoAssignees(
  id: string,
  userIds: string[]
): Promise<{ text: string; added: string[] }> {
  const supabase = getSupabaseServerClient();

  const [todoResult, currentResult] = await Promise.all([
    supabase.from("daily_todos").select("text").eq("id", id).single(),
    supabase.from("daily_todo_assignees").select("user_id").eq("todo_id", id),
  ]);
  if (todoResult.error) throw todoResult.error;
  if (currentResult.error) throw currentResult.error;

  const current = new Set(
    (currentResult.data ?? []).map((row) => row.user_id as string)
  );
  const next = new Set(userIds);
  const added = userIds.filter((userId) => !current.has(userId));
  const removed = [...current].filter((userId) => !next.has(userId));

  if (removed.length > 0) {
    const { error } = await supabase
      .from("daily_todo_assignees")
      .delete()
      .eq("todo_id", id)
      .in("user_id", removed);
    if (error) throw error;
  }

  if (added.length > 0) {
    const { error } = await supabase
      .from("daily_todo_assignees")
      .insert(added.map((userId) => ({ todo_id: id, user_id: userId })));
    if (error) throw error;
  }

  return { text: todoResult.data.text as string, added };
}

export async function deleteDailyTodo(id: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("daily_todos").delete().eq("id", id);
  if (error) throw error;
}
