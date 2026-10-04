"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createBudget, deleteBudget } from "@/lib/budgets";
import { requireTeam } from "@/lib/session";

export async function createBudgetAction(formData: FormData) {
  await requireTeam("orcamentos");
  const title = String(formData.get("title") ?? "").trim();
  const budget = await createBudget(title || "Novo orçamento");
  revalidatePath("/admin/orcamentos");
  redirect(`/admin/orcamentos/${budget.id}`);
}

export async function deleteBudgetAction(formData: FormData) {
  await requireTeam("orcamentos");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await deleteBudget(id);
  revalidatePath("/admin/orcamentos");
}
