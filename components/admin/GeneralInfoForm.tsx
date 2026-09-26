import { updateGuideInfoAction } from "@/app/admin/guias/[id]/actions";
import type { GuideWithSections, SugestaoCliente } from "@/lib/guides";

export function GeneralInfoForm({
  guide,
  clientes = [],
}: {
  guide: GuideWithSections;
  /** Cadastro de clientes + nomes já usados em guias: cada nome é uma pasta na home. */
  clientes?: SugestaoCliente[];
}) {
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
              list="clientes-dos-guias"
              autoComplete="off"
              placeholder="Escolha um cliente cadastrado ou digite um nome"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            />
            <datalist id="clientes-dos-guias">
              {clientes.map((c) => (
                <option
                  key={c.nome}
                  value={c.nome}
                  label={c.cadastrado ? "Cliente cadastrado" : "Usado em guias"}
                />
              ))}
            </datalist>
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
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">
            Tags (separadas por vírgula)
          </label>
          <input
            name="tags"
            placeholder="ex: institucional, urgente, redes sociais"
            defaultValue={guide.tags.join(", ")}
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
