"use server";

import { revalidatePath } from "next/cache";
import {
  createDailyTodo,
  deleteDailyTodo,
  renameDailyTodo,
  setDailyTodoAssignee,
  setDailyTodoDone,
} from "@/lib/dailyTodos";
import { getCurrentSession } from "@/lib/session";

// Argumentos simples em vez de FormData: é o que permite chamar a action de
// dentro do mesmo startTransition que aplica o estado otimista da lista.

export async function createDailyTodoAction(text: string) {
  const session = await getCurrentSession();
  await createDailyTodo(text, session?.userId ?? null);
  revalidatePath("/admin");
}

export async function setDailyTodoDoneAction(id: string, done: boolean) {
  const session = await getCurrentSession();
  await setDailyTodoDone(id, done, session?.userId ?? null);
  revalidatePath("/admin");
}

export async function setDailyTodoAssigneeAction(
  id: string,
  assigneeId: string | null
) {
  await setDailyTodoAssignee(id, assigneeId);
  revalidatePath("/admin");
}

export async function renameDailyTodoAction(id: string, text: string) {
  await renameDailyTodo(id, text);
  revalidatePath("/admin");
}

export async function deleteDailyTodoAction(id: string) {
  await deleteDailyTodo(id);
  revalidatePath("/admin");
}
