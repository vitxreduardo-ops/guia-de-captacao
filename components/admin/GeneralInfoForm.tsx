import { updateGuideInfoAction } from "@/app/admin/guias/[id]/actions";
import type { GuideWithSections } from "@/lib/guides";

export function GeneralInfoForm({ guide }: { guide: GuideWithSections }) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-neutral-900">
        Dados gerais
      </h2>
      <form action={updateGuideInfoAction} className="space-y-3">
        <input type="hidden" name="id" value={guide.id} />
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">
            Título do projeto
          </label>
          <input
            name="title"
            defaultValue={guide.title}
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
              defaultValue={guide.client_name}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">
              Data da gravação
            </label>
            <input
              type="date"
              name="shoot_date"
              defaultValue={guide.shoot_date ?? ""}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">
            Local
          </label>
          <input
            name="location"
            defaultValue={guide.location}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
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
