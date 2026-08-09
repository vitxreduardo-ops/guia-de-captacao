import { updateBudgetInfoAction } from "@/app/admin/orcamentos/[id]/actions";
import type { BudgetWithSections } from "@/lib/budgets";

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

        <div className="border-t border-neutral-200 pt-4">
          <h2 className="mb-3 text-sm font-semibold text-neutral-900">
            Hero
          </h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">
                Etiqueta (eyebrow)
              </label>
              <input
                name="hero_eyebrow"
                defaultValue={budget.hero_eyebrow}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">
                  Título — linha 1
                </label>
                <input
                  name="hero_title1"
                  defaultValue={budget.hero_title1}
                  placeholder="CLIENTE"
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">
                  Título — linha 2
                </label>
                <input
                  name="hero_title2"
                  defaultValue={budget.hero_title2}
                  placeholder="COMUNICAÇÃO"
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">
                Subtítulo
              </label>
              <textarea
                name="hero_subtitle"
                defaultValue={budget.hero_subtitle}
                rows={2}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">
                Texto do botão
              </label>
              <input
                name="hero_cta"
                defaultValue={budget.hero_cta}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">
                Vídeo de fundo (link direto .mp4 ou YouTube/Vimeo — opcional)
              </label>
              <input
                name="hero_bg_video_url"
                defaultValue={budget.hero_bg_video_url}
                placeholder="Cole aqui o melhor recorte do seu portfólio"
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
              />
              <p className="mt-1 text-xs text-neutral-500">
                Deixe em branco pra usar só a cor de fundo. Não esqueça de
                trocar isso antes de publicar — não deixe vídeo de teste.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-neutral-200 pt-4">
          <h2 className="mb-3 text-sm font-semibold text-neutral-900">
            Sobre
          </h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">
                Título
              </label>
              <input
                name="about_title"
                defaultValue={budget.about_title}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">
                Texto
              </label>
              <textarea
                name="about_text"
                defaultValue={budget.about_text}
                rows={3}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-neutral-200 pt-4">
          <label className="mb-1 block text-xs font-medium text-neutral-600">
            Título da seção de destaques
          </label>
          <input
            name="highlights_title"
            defaultValue={budget.highlights_title}
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
