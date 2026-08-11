import Link from "next/link";
import { listBudgets } from "@/lib/budgets";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { createBudgetAction, deleteBudgetAction } from "./actions";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

export default async function BudgetsDashboard() {
  const budgets = await listBudgets();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminHeader title="Orçamentos" backHref="/admin" />

      <form
        action={createBudgetAction}
        className="mb-8 flex gap-2 rounded-lg border border-neutral-200 bg-white p-4"
      >
        <input
          name="title"
          placeholder="Nome interno do novo orçamento (ex: Proposta — Cliente X)"
          required
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Novo orçamento
        </button>
      </form>

      {budgets.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Nenhum orçamento criado ainda. Use o formulário acima para começar.
        </p>
      ) : (
        <ul className="space-y-3">
          {budgets.map((budget) => (
            <li
              key={budget.id}
              className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4"
            >
              <div>
                <Link
                  href={`/admin/orcamentos/${budget.id}`}
                  className="font-medium text-neutral-900 hover:underline"
                >
                  {budget.title}
                </Link>
                <p className="mt-0.5 text-sm text-neutral-500">
                  {budget.client_name || "Sem cliente definido"} ·{" "}
                  {formatDate(budget.created_at)} ·{" "}
                  <span
                    className={
                      budget.status === "published"
                        ? "text-emerald-600"
                        : "text-amber-600"
                    }
                  >
                    {budget.status === "published" ? "Publicado" : "Rascunho"}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/admin/orcamentos/${budget.id}`}
                  className="text-sm text-neutral-600 hover:text-neutral-900"
                >
                  Editar
                </Link>
                <form action={deleteBudgetAction}>
                  <input type="hidden" name="id" value={budget.id} />
                  <DeleteButton
                    confirmMessage={`Excluir o orçamento "${budget.title}"? Essa ação não pode ser desfeita.`}
                  />
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
