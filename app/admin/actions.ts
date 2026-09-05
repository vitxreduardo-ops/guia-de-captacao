"use server";

import { revalidatePath } from "next/cache";
import {
  createDailyTodo,
  createDailyTodoChecklistItem,
  deleteDailyTodo,
  deleteDailyTodoChecklistItem,
  renameDailyTodoChecklistItem,
  reorderDailyTodos,
  setDailyTodoAssignees,
  setDailyTodoChecklistItemDone,
  setDailyTodoDone,
  updateDailyTodoDetails,
} from "@/lib/dailyTodos";
import type { TodoPriority } from "@/lib/dailyTodoTypes";
import { notifyUser } from "@/lib/notifications";
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

export async function setDailyTodoAssigneesAction(
  id: string,
  userIds: string[]
) {
  const { text, added } = await setDailyTodoAssignees(id, userIds);
  const session = await getCurrentSession();
  // Só quem entrou agora recebe aviso — quem já era responsável não é
  // notificado de novo a cada mexida na lista — e nunca quem fez a ação, que
  // seria avisar a pessoa do que ela mesma acabou de clicar.
  const toNotify = added.filter((userId) => userId !== session?.userId);
  await Promise.all(
    toNotify.map((userId) =>
      notifyUser({
        userId,
        actorId: session?.userId ?? null,
        kind: "todo_assigned",
        title: "Tarefa atribuída a você",
        body: text,
        link: "/admin",
        entityId: id,
      })
    )
  );
  revalidatePath("/admin");
}

export async function deleteDailyTodoAction(id: string) {
  await deleteDailyTodo(id);
  revalidatePath("/admin");
}

export async function updateDailyTodoDetailsAction(
  id: string,
  fields: {
    text: string;
    notes: string;
    dueDate: string | null;
    priority: TodoPriority;
  }
) {
  await updateDailyTodoDetails(id, fields);
  revalidatePath("/admin");
}

export async function reorderDailyTodosAction(orderedIds: string[]) {
  await reorderDailyTodos(orderedIds);
  revalidatePath("/admin");
}

export async function createDailyTodoChecklistItemAction(
  todoId: string,
  label: string
) {
  await createDailyTodoChecklistItem(todoId, label);
  revalidatePath("/admin");
}

export async function setDailyTodoChecklistItemDoneAction(
  id: string,
  done: boolean
) {
  await setDailyTodoChecklistItemDone(id, done);
  revalidatePath("/admin");
}

export async function renameDailyTodoChecklistItemAction(
  id: string,
  label: string
) {
  await renameDailyTodoChecklistItem(id, label);
  revalidatePath("/admin");
}

export async function deleteDailyTodoChecklistItemAction(id: string) {
  await deleteDailyTodoChecklistItem(id);
  revalidatePath("/admin");
}
