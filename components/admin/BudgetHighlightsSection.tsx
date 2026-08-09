import {
  addBudgetHighlightAction,
  deleteBudgetHighlightAction,
  updateBudgetHighlightAction,
} from "@/app/admin/orcamentos/[id]/actions";
import { DeleteButton } from "@/components/admin/DeleteButton";
import type { BudgetHighlight } from "@/lib/budgets";

export function BudgetHighlightsSection({
  budgetId,
  items,
}: {
  budgetId: string;
  items: BudgetHighlight[];
}) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-neutral-900">
        Destaques (grid numerado)
      </h2>

      {items.length === 0 ? (
        <p className="mb-4 text-sm text-neutral-500">
          Nenhum destaque adicionado ainda.
        </p>
      ) : (
        <ul className="mb-4 space-y-2">
          {items.map((item, index) => (
            <li
              key={item.id}
              className="flex items-center gap-2 rounded-md border border-neutral-200 p-2"
            >
              <span className="w-6 shrink-0 text-xs font-medium text-neutral-400">
                {String(index + 1).padStart(2, "0")}
              </span>
              <form
                action={updateBudgetHighlightAction}
                className="flex flex-1 items-center gap-2"
              >
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="budget_id" value={budgetId} />
                <input
                  name="title"
                  defaultValue={item.title}
                  className="flex-1 rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Salvar
                </button>
              </form>
              <form action={deleteBudgetHighlightAction}>
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="budget_id" value={budgetId} />
                <DeleteButton
                  label="Remover"
                  confirmMessage="Remover este destaque?"
                />
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={addBudgetHighlightAction} className="flex gap-2">
        <input type="hidden" name="budget_id" value={budgetId} />
        <input
          name="title"
          placeholder="Novo destaque"
          required
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
        >
          + Adicionar destaque
        </button>
      </form>
    </section>
  );
}
