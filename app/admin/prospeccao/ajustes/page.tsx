import { AdminHeader } from "@/components/admin/AdminHeader";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { ProspectStages } from "@/components/admin/ProspectStages";
import { listMessageTemplates } from "@/lib/messages";
import { getProspects } from "@/lib/prospects";
import {
  SITUATIONS,
  SITUATION_LABELS,
  type MessageTemplate,
} from "@/lib/messageText";
import {
  createMessageAction,
  deleteMessageAction,
  updateMessageAction,
} from "../actions";

export const dynamic = "force-dynamic";

const campo =
  "w-full rounded-md border border-neutral-300 px-2.5 py-2 text-base sm:py-1.5 sm:text-sm focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none";

/**
 * O que não é trabalho do dia: etapas e textos.
 *
 * Eram duas abas ao lado da tela que se abre toda manhã, e se mexe nelas uma
 * vez a cada três meses. Juntas aqui, a Prospecção volta a ser uma tela só.
 */
export default async function ProspectSettingsPage() {
  const [board, templates] = await Promise.all([
    getProspects(),
    listMessageTemplates(),
  ]);

  const counts: Record<string, number> = {};
  for (const prospect of board.prospects) {
    counts[prospect.stage_id] = (counts[prospect.stage_id] ?? 0) + 1;
  }

  return (
    <div className="mx-auto flex w-full flex-1 max-w-3xl flex-col pb-10">
      <AdminHeader
        title="Ajustes da prospecção"
        trail={[
          { label: "Admin", href: "/admin" },
          { label: "Prospecção", href: "/admin/prospeccao" },
          { label: "Ajustes" },
        ]}
      />

      <h2 className="mb-2 text-base font-semibold text-neutral-900">
        Mensagens
      </h2>
      <p className="mb-4 text-sm text-neutral-600">
        Os textos que o gerador oferece na ficha do contato e no Radar. A
        situação diz <em>o que você quer que aconteça agora</em> — é por ela
        que o modelo certo aparece sozinho.
      </p>
      <p className="mb-4 text-sm text-neutral-600">
        Variáveis: <code>{"{{nome}}"}</code> <code>{"{{empresa}}"}</code>{" "}
        <code>{"{{ramo}}"}</code> <code>{"{{dias}}"}</code>{" "}
        <code>{"{{combinado}}"}</code> <code>{"{{valor}}"}</code>{" "}
        <code>{"{{indicacao}}"}</code>. A linha inteira some quando a variável
        não tem valor — é melhor um parágrafo a menos do que “Fiquei de .”.
      </p>

      <ul className="mb-6 space-y-3">
        {templates.map((template) => (
          <li key={template.id}>
            <MessageForm template={template} />
          </li>
        ))}
      </ul>

      <section className="mb-10 rounded-lg border border-neutral-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-neutral-900">
          Novo modelo
        </h3>
        <form action={createMessageAction} className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              name="name"
              placeholder="Nome do modelo"
              required
              className={campo}
            />
            <select
              name="situation"
              defaultValue="apresentar"
              className={campo}
              aria-label="Situação"
            >
              {SITUATIONS.map((situation) => (
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

      <h2 className="mb-2 text-base font-semibold text-neutral-900">Etapas</h2>
      <p className="mb-5 text-sm text-neutral-600">
        O nome é seu; o comportamento vem do tipo. Uma etapa marcada como
        &ldquo;perdido&rdquo; pede o motivo na hora de mover, mesmo que você a
        chame de outra coisa.
      </p>

      <ProspectStages stages={board.stages} counts={counts} />
    </div>
  );
}

function MessageForm({ template }: { template: MessageTemplate }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <form action={updateMessageAction} className="space-y-2">
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
            {SITUATIONS.map((situation) => (
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
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Salvar
        </button>
      </form>

      {/* Fora do formulário de cima: um `<form>` dentro do outro não é HTML
          válido, e o navegador desmancha o de dentro. */}
      <form action={deleteMessageAction} className="mt-2">
        <input type="hidden" name="id" value={template.id} />
        <DeleteButton confirmMessage={`Excluir o modelo "${template.name}"?`} />
      </form>
    </div>
  );
}
