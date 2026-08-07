import {
  addChecklistItemAction,
  deleteChecklistItemAction,
  toggleChecklistItemAction,
} from "@/app/admin/guias/[id]/actions";
import { DeleteButton } from "@/components/admin/DeleteButton";
import type { ChecklistCategory, ChecklistItem } from "@/lib/guides";

const CATEGORY_LABELS: Record<ChecklistCategory, string> = {
  equipamento: "Equipamento",
  locacao: "Locação",
};

function CategoryList({
  guideId,
  category,
  items,
}: {
  guideId: string;
  category: ChecklistCategory;
  items: ChecklistItem[];
}) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {CATEGORY_LABELS[category]}
      </h3>

      {items.length === 0 ? (
        <p className="mb-3 text-sm text-neutral-500">Nenhum item ainda.</p>
      ) : (
        <ul className="mb-3 space-y-1">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-md border border-neutral-200 px-3 py-2 text-sm"
            >
              <form action={toggleChecklistItemAction} className="flex-1">
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="guide_id" value={guideId} />
                <input
                  type="hidden"
                  name="done"
                  value={(!item.done).toString()}
                />
                <button
                  type="submit"
                  className={`flex items-center gap-2 text-left ${
                    item.done ? "text-neutral-400 line-through" : "text-neutral-800"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded border ${
                      item.done
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-neutral-300"
                    }`}
                  >
                    {item.done ? "✓" : ""}
                  </span>
                  {item.label}
                </button>
              </form>
              <form action={deleteChecklistItemAction}>
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="guide_id" value={guideId} />
                <DeleteButton
                  label="Remover"
                  confirmMessage="Remover este item?"
                />
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={addChecklistItemAction} className="flex gap-2">
        <input type="hidden" name="guide_id" value={guideId} />
        <input type="hidden" name="category" value={category} />
        <input
          name="label"
          placeholder={`Adicionar item de ${CATEGORY_LABELS[category].toLowerCase()}`}
          required
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Adicionar
        </button>
      </form>
    </div>
  );
}

export function ChecklistSection({
  guideId,
  items,
}: {
  guideId: string;
  items: ChecklistItem[];
}) {
  const equipamento = items.filter((item) => item.category === "equipamento");
  const locacao = items.filter((item) => item.category === "locacao");

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-neutral-900">
        Checklist de equipamento e locação
      </h2>
      <div className="grid gap-6 sm:grid-cols-2">
        <CategoryList
          guideId={guideId}
          category="equipamento"
          items={equipamento}
        />
        <CategoryList guideId={guideId} category="locacao" items={locacao} />
      </div>
    </section>
  );
}
