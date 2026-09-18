import { updateBudgetInfoAction } from "@/app/admin/orcamentos/[id]/actions";
import type { BudgetWithSections } from "@/lib/budgets";

/**
 * O que não é conteúdo da proposta: nome interno, cliente e WhatsApp.
 *
 * Tudo que o cliente lê — capa, sobre, pacotes — mora nas seções e se edita no
 * painel, com o resultado à vista. Repetir esses campos aqui daria dois lugares
 * para a mesma coisa e um deles ia ficar velho.
 */
export function BudgetGeneralInfoForm({
  budget,
}: {
  budget: BudgetWithSections;
}) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4">
      <form action={updateBudgetInfoAction} className="space-y-6">
        <input type="hidden" name="id" value={budget.id} />

        <div>
          <h2 className="mb-3 text-sm font-semibold text-neutral-900">
            Projeto
          </h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">
                Nome interno (não aparece na proposta)
              </label>
              <input
                name="title"
                defaultValue={budget.title}
                required
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">
                  Cliente
                </label>
                <input
                  name="client_name"
                  defaultValue={budget.client_name}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">
                  WhatsApp (com DDI+DDD, só números)
                </label>
                <input
                  name="client_whatsapp"
                  defaultValue={budget.client_whatsapp}
                  placeholder="5511999998888"
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Salvar dados gerais
        </button>
      </form>
    </section>
  );
}
