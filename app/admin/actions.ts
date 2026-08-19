"use server";

import { revalidatePath } from "next/cache";
import {
  createDailyTodo,
  deleteDailyTodo,
  renameDailyTodo,
  setDailyTodoAssignees,
  setDailyTodoDone,
} from "@/lib/dailyTodos";
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

export async function renameDailyTodoAction(id: string, text: string) {
  await renameDailyTodo(id, text);
  revalidatePath("/admin");
}

export async function deleteDailyTodoAction(id: string) {
  await deleteDailyTodo(id);
  revalidatePath("/admin");
}
