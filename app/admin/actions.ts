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

export async function createDailyTodoAction(formData: FormData) {
  const session = await getCurrentSession();
  await createDailyTodo(
    String(formData.get("text") ?? ""),
    session?.userId ?? null
  );
  revalidatePath("/admin");
}

export async function setDailyTodoDoneAction(formData: FormData) {
  const session = await getCurrentSession();
  await setDailyTodoDone(
    String(formData.get("id")),
    formData.get("done") === "true",
    session?.userId ?? null
  );
  revalidatePath("/admin");
}

export async function setDailyTodoAssigneeAction(formData: FormData) {
  const assigneeId = String(formData.get("assignee_id") ?? "");
  await setDailyTodoAssignee(
    String(formData.get("id")),
    assigneeId === "none" ? null : assigneeId
  );
  revalidatePath("/admin");
}

export async function renameDailyTodoAction(id: string, text: string) {
  await renameDailyTodo(id, text);
  revalidatePath("/admin");
}

export async function deleteDailyTodoAction(formData: FormData) {
  await deleteDailyTodo(String(formData.get("id")));
  revalidatePath("/admin");
}
