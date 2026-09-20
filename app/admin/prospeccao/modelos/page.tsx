import { AdminHeader } from "@/components/admin/AdminHeader";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { ProspectTabs } from "@/components/admin/ProspectTabs";
import { listFollowupTemplates } from "@/lib/followups";
import { listOutreachTemplates } from "@/lib/outreach";
import {
  ANGLE_LABELS,
  OUTREACH_ANGLES,
  type OutreachTemplate,
} from "@/lib/outreachText";
import {
  FOLLOWUP_SITUATIONS,
  SITUATION_LABELS,
  type FollowupTemplate,
} from "@/lib/followupText";
import {
  createFollowupAction,
  createOutreachAction,
  deleteFollowupAction,
  deleteOutreachAction,
  updateFollowupAction,
  updateOutreachAction,
} from "../actions";

export const dynamic = "force-dynamic";

const campo =
  "w-full rounded-md border border-neutral-300 px-2.5 py-2 text-base sm:py-1.5 sm:text-sm focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none";

/**
 * Os textos que os dois geradores usam, no mesmo lugar.
 *
 * Abordagem e follow-up são a mesma coisa vista em dois momentos — a primeira
 * mensagem e as seguintes —, e separá-los em duas telas faria procurar em
 * duas abas por "aquele texto que eu escrevi".
 *
 * O gatilho (ângulo, situação) é lista fechada nos dois: é ele que permite ao
 * gerador escolher sozinho. Nome e texto são livres.
 */
export default async function ModelosPage() {
  const [templates, outreach] = await Promise.all([
    listFollowupTemplates(),
    listOutreachTemplates(),
  ]);

  return (
    <div className="mx-auto w-full max-w-4xl pb-10">
      <AdminHeader
        title="Modelos"
        trail={[
          { label: "Admin", href: "/admin" },
          { label: "Prospecção", href: "/admin/prospeccao" },
          { label: "Modelos" },
        ]}
      />

      <div className="mb-6">
        <ProspectTabs active="/admin/prospeccao/modelos" />
      </div>

      <h2 className="mb-2 text-base font-semibold text-neutral-900">
        Abordagem
      </h2>
      <p className="mb-4 text-sm text-neutral-600">
        A primeira mensagem, gerada no Radar a partir do que se sabe da
        empresa. Variáveis: <code>{"{{empresa}}"}</code>{" "}
        <code>{"{{pessoa}}"}</code> <code>{"{{ramo}}"}</code>{" "}
        <code>{"{{indicacao}}"}</code> <code>{"{{perfil}}"}</code>.
      </p>

      <ul className="mb-6 space-y-3">
        {outreach.map((template) => (
          <li key={template.id}>
            <OutreachForm template={template} />
          </li>
        ))}
      </ul>

      <section className="mb-10 rounded-lg border border-neutral-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-neutral-900">
          Nova abordagem
        </h3>
        <form action={createOutreachAction} className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              name="name"
              placeholder="Nome do modelo"
              required
              className={campo}
            />
            <select name="angle" defaultValue="frio" className={campo} aria-label="Ângulo">
              {OUTREACH_ANGLES.map((angle) => (
                <option key={angle} value={angle}>
                  {ANGLE_LABELS[angle]}
                </option>
              ))}
            </select>
          </div>
          <textarea
            name="body"
            rows={5}
            placeholder="Oi, {{pessoa}}, tudo bem?"
            className={campo}
          />
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Criar abordagem
          </button>
        </form>
      </section>

      <h2 className="mb-2 text-base font-semibold text-neutral-900">
        Follow-up
      </h2>
      <p className="mb-5 text-sm text-neutral-600">
        Variáveis: <code>{"{{nome}}"}</code> <code>{"{{empresa}}"}</code>{" "}
        <code>{"{{dias}}"}</code> <code>{"{{combinado}}"}</code>{" "}
        <code>{"{{valor}}"}</code>. A linha inteira some quando a variável não
        tem valor — é melhor um parágrafo a menos do que “Fiquei de .”.
      </p>

      <ul className="mb-8 space-y-3">
        {templates.map((template) => (
          <li key={template.id}>
            <TemplateForm template={template} />
          </li>
        ))}
      </ul>

      <section className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">
          Novo modelo
        </h2>
        <form action={createFollowupAction} className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              name="name"
              placeholder="Nome do modelo"
              required
              className={campo}
            />
            <select name="situation" defaultValue="sem_resposta" className={campo} aria-label="Situação">
              {FOLLOWUP_SITUATIONS.map((situation) => (
                <option key={situation} value={situation}>
                  {SITUATION_LABELS[situation]}
                </option>
              ))}
            </select>
          </div>
          <textarea
            name="body"
            rows={5}
            placeholder="Oi, {{nome}}, tudo bem?"
            className={campo}
          />
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Criar modelo
          </button>
        </form>
      </section>
    </div>
  );
}

function OutreachForm({ template }: { template: OutreachTemplate }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <form action={updateOutreachAction} className="space-y-2">
        <input type="hidden" name="id" value={template.id} />
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            name="name"
            defaultValue={template.name}
            required
            className={campo}
            aria-label="Nome do modelo"
          />
          <select
            name="angle"
            defaultValue={template.angle}
            className={campo}
            aria-label="Ângulo"
          >
            {OUTREACH_ANGLES.map((angle) => (
              <option key={angle} value={angle}>
                {ANGLE_LABELS[angle]}
              </option>
            ))}
          </select>
        </div>
        <textarea
          name="body"
          rows={6}
          defaultValue={template.body}
          className={campo}
          aria-label="Texto do modelo"
        />
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Salvar
        </button>
      </form>

      <form action={deleteOutreachAction} className="mt-2">
        <input type="hidden" name="id" value={template.id} />
        <DeleteButton confirmMessage={`Excluir a abordagem "${template.name}"?`} />
      </form>
    </div>
  );
}

function TemplateForm({ template }: { template: FollowupTemplate }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <form action={updateFollowupAction} className="space-y-2">
        <input type="hidden" name="id" value={template.id} />
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            name="name"
            defaultValue={template.name}
            required
            className={campo}
            aria-label="Nome do modelo"
          />
          <select
            name="situation"
            defaultValue={template.situation}
            className={campo}
            aria-label="Situação"
          >
            {FOLLOWUP_SITUATIONS.map((situation) => (
              <option key={situation} value={situation}>
                {SITUATION_LABELS[situation]}
              </option>
            ))}
          </select>
        </div>
        <textarea
          name="body"
          rows={6}
          defaultValue={template.body}
          className={campo}
          aria-label="Texto do modelo"
        />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Salvar
          </button>
        </div>
      </form>

      {/* Fora do formulário de cima: um `<form>` dentro do outro não é HTML
          válido, e o navegador desmancha o de dentro. */}
      <form action={deleteFollowupAction} className="mt-2">
        <input type="hidden" name="id" value={template.id} />
        <DeleteButton
          confirmMessage={`Excluir o modelo "${template.name}"?`}
        />
      </form>
    </div>
  );
}
