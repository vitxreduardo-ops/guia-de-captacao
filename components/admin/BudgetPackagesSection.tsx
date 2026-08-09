import {
  addBudgetPackageAction,
  deleteBudgetPackageAction,
  updateBudgetPackageAction,
} from "@/app/admin/orcamentos/[id]/actions";
import { DeleteButton } from "@/components/admin/DeleteButton";
import type { BudgetPackage } from "@/lib/budgets";

function PackageCard({
  budgetId,
  pkg,
}: {
  budgetId: string;
  pkg: BudgetPackage;
}) {
  return (
    <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
      <div className="mb-2 flex justify-end">
        <form action={deleteBudgetPackageAction}>
          <input type="hidden" name="id" value={pkg.id} />
          <input type="hidden" name="budget_id" value={budgetId} />
          <DeleteButton
            label="Remover pacote"
            confirmMessage={`Remover o pacote "${pkg.name}"?`}
          />
        </form>
      </div>
      <form action={updateBudgetPackageAction} className="space-y-2">
        <input type="hidden" name="id" value={pkg.id} />
        <input type="hidden" name="budget_id" value={budgetId} />
        <input
          name="name"
          defaultValue={pkg.name}
          placeholder="Nome do pacote"
          className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm font-medium focus:border-neutral-500 focus:outline-none"
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">
              Etiqueta (opcional, ex: MAIS ESCOLHIDO)
            </label>
            <input
              name="tag"
              defaultValue={pkg.tag}
              className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">
              Preço/mês
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              name="price"
              defaultValue={pkg.price}
              className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">
            Itens (um por linha)
          </label>
          <textarea
            name="features"
            defaultValue={pkg.features}
            rows={3}
            className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Salvar pacote
        </button>
      </form>
    </div>
  );
}

export function BudgetPackagesSection({
  budgetId,
  items,
}: {
  budgetId: string;
  items: BudgetPackage[];
}) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-neutral-900">
        Pacotes (fixos)
      </h2>

      <div className="space-y-3">
        {items.map((pkg) => (
          <PackageCard key={pkg.id} budgetId={budgetId} pkg={pkg} />
        ))}

        {items.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Nenhum pacote adicionado ainda.
          </p>
        ) : null}
      </div>

      <form
        action={addBudgetPackageAction}
        className="mt-3 rounded-md border border-dashed border-neutral-300 p-3"
      >
        <input type="hidden" name="budget_id" value={budgetId} />
        <div className="mb-2 grid grid-cols-2 gap-2">
          <input
            name="name"
            placeholder="Nome do pacote (ex: Ideal)"
            required
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
          <input
            type="number"
            step="0.01"
            min="0"
            name="price"
            placeholder="Preço/mês"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>
        <input
          name="tag"
          placeholder="Etiqueta (opcional, ex: MAIS ESCOLHIDO)"
          className="mb-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
        <textarea
          name="features"
          placeholder="Itens (um por linha)"
          rows={3}
          className="mb-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800"
        >
          + Adicionar pacote
        </button>
      </form>
    </section>
  );
}
