import {
  addBudgetFaqAction,
  deleteBudgetFaqAction,
  updateBudgetFaqAction,
} from "@/app/admin/orcamentos/[id]/actions";
import { DeleteButton } from "@/components/admin/DeleteButton";
import type { BudgetFaq } from "@/lib/budgets";

function FaqCard({ budgetId, item }: { budgetId: string; item: BudgetFaq }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
      <div className="mb-2 flex justify-end">
        <form action={deleteBudgetFaqAction}>
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="budget_id" value={budgetId} />
          <DeleteButton label="Remover" confirmMessage="Remover esta pergunta?" />
        </form>
      </div>
      <form action={updateBudgetFaqAction} className="space-y-2">
        <input type="hidden" name="id" value={item.id} />
        <input type="hidden" name="budget_id" value={budgetId} />
        <input
          name="question"
          defaultValue={item.question}
          placeholder="Pergunta"
          className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm font-medium focus:border-neutral-500 focus:outline-none"
        />
        <textarea
          name="answer"
          defaultValue={item.answer}
          placeholder="Resposta"
          rows={2}
          className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Salvar pergunta
        </button>
      </form>
    </div>
  );
}

export function BudgetFaqSection({
  budgetId,
  items,
}: {
  budgetId: string;
  items: BudgetFaq[];
}) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-neutral-900">
        Perguntas frequentes
      </h2>

      <div className="space-y-3">
        {items.map((item) => (
          <FaqCard key={item.id} budgetId={budgetId} item={item} />
        ))}

        {items.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Nenhuma pergunta adicionada ainda.
          </p>
        ) : null}
      </div>

      <form
        action={addBudgetFaqAction}
        className="mt-3 rounded-md border border-dashed border-neutral-300 p-3"
      >
        <input type="hidden" name="budget_id" value={budgetId} />
        <input
          name="question"
          placeholder="Pergunta"
          required
          className="mb-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
        <textarea
          name="answer"
          placeholder="Resposta"
          rows={2}
          className="mb-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800"
        >
          + Adicionar pergunta
        </button>
      </form>
    </section>
  );
}
