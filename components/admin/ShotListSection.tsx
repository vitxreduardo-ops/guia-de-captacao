import {
  addShotListItemAction,
  deleteShotListItemAction,
} from "@/app/admin/guias/[id]/actions";
import { DeleteButton } from "@/components/admin/DeleteButton";
import type { ShotListItem } from "@/lib/guides";

export function ShotListSection({
  guideId,
  items,
}: {
  guideId: string;
  items: ShotListItem[];
}) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-neutral-900">
        Shot list / decupagem
      </h2>

      {items.length === 0 ? (
        <p className="mb-4 text-sm text-neutral-500">
          Nenhum plano adicionado ainda.
        </p>
      ) : (
        <ul className="mb-4 space-y-2">
          {items.map((item, index) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3 rounded-md border border-neutral-200 p-3 text-sm"
            >
              <div>
                <p className="font-medium text-neutral-900">
                  {index + 1}. {item.description}
                </p>
                <p className="text-xs text-neutral-500">
                  {[item.shot_type, item.duration].filter(Boolean).join(" · ")}
                </p>
                {item.notes ? (
                  <p className="mt-1 text-xs text-neutral-500">
                    {item.notes}
                  </p>
                ) : null}
              </div>
              <form action={deleteShotListItemAction}>
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="guide_id" value={guideId} />
                <DeleteButton
                  label="Remover"
                  confirmMessage="Remover este item da shot list?"
                />
              </form>
            </li>
          ))}
        </ul>
      )}

      <form
        action={addShotListItemAction}
        className="rounded-md border border-dashed border-neutral-300 p-3"
      >
        <input type="hidden" name="guide_id" value={guideId} />
        <input
          name="description"
          placeholder="Descrição do plano (ex: Close no produto sobre a mesa)"
          required
          className="mb-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
        <div className="mb-2 grid grid-cols-2 gap-2">
          <input
            name="shot_type"
            placeholder="Tipo de plano/ângulo (ex: Close-up)"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
          <input
            name="duration"
            placeholder="Duração estimada (ex: 5s)"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>
        <input
          name="notes"
          placeholder="Observações (opcional)"
          className="mb-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800"
        >
          Adicionar plano
        </button>
      </form>
    </section>
  );
}
