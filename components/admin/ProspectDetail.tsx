"use client";

import { useRef, useState, useTransition } from "react";
import {
  addNoteAction,
  deleteProspectAction,
  logTouchAction,
  moveProspectAction,
  updateProspectAction,
} from "@/app/admin/prospeccao/actions";
import {
  formatDateFull,
  formatTime,
  type ProspectClientOption,
  type ProspectDocOption,
  type ProspectOwnerOption,
  type ProspectRow,
  type ProspectStage,
  type ProspectTouch,
} from "@/lib/prospectTypes";
import { formatBRL } from "@/lib/prospectPipeline";
import { MessageBox } from "@/components/admin/MessageBox";
import {
  daysSinceTouch,
  prospectVars,
  SITUATION_LABELS,
  suggestForProspect,
  type MessageTemplate,
} from "@/lib/messageText";

/** Sem largura: quem usa escolhe. Compor `w-full` com `w-auto` na mesma
 * string não funciona — em Tailwind a ordem do CSS decide, não a da classe. */
const fieldClass =
  "rounded-md border border-neutral-300 px-2.5 py-2 text-base sm:py-1.5 sm:text-sm focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none";
const inputClass = `w-full ${fieldClass}`;
const labelClass = "mb-1 block text-xs font-medium text-neutral-600";
const sectionClass =
  "mb-2 text-xs font-semibold tracking-wide text-neutral-400 uppercase";

export function ProspectDetail({
  prospect,
  touches,
  stages,
  owners,
  clients,
  budgets,
  contracts,
  templates,
}: {
  prospect: ProspectRow;
  touches: ProspectTouch[];
  stages: ProspectStage[];
  owners: ProspectOwnerOption[];
  clients: ProspectClientOption[];
  budgets: ProspectDocOption[];
  contracts: ProspectDocOption[];
  templates: MessageTemplate[];
}) {
  const authors = new Map(owners.map((owner) => [owner.id, owner.username]));

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1 space-y-6">
        <NextContact prospect={prospect} />
        {/* Fica antes do histórico: quem abre a ficha de um contato parado
            vem escrever a mensagem, não reler o que já sabe. */}
        <Message prospect={prospect} templates={templates} />
        <section>
          <h2 className={sectionClass}>Histórico</h2>
          <NoteBox prospectId={prospect.id} />
          <Timeline touches={touches} authors={authors} />
        </section>
      </div>

      <aside className="w-full space-y-6 lg:w-80 lg:shrink-0">
        <MoveStage prospect={prospect} stages={stages} />
        <Details
          prospect={prospect}
          owners={owners}
          clients={clients}
          budgets={budgets}
          contracts={contracts}
        />
      </aside>
    </div>
  );
}

// ------------------------------------------------------------ próximo passo

function NextContact({ prospect }: { prospect: ProspectRow }) {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-xl border border-neutral-900 px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
            Próximo contato
          </p>
          {prospect.next_contact_date ? (
            <p className="text-[17px] font-bold">
              {formatDateFull(prospect.next_contact_date)}
              {prospect.next_contact_time
                ? `, ${formatTime(prospect.next_contact_time)}`
                : ""}
            </p>
          ) : (
            <p className="text-[17px] font-bold text-red-700">Sem data</p>
          )}
          {prospect.next_contact_what ? (
            <p className="mt-0.5 text-[13px] text-neutral-600">
              {prospect.next_contact_what}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="ml-auto inline-flex min-h-11 items-center rounded-md bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-800 sm:min-h-0 sm:px-3.5 sm:py-2 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          {open ? "Fechar" : "Falei"}
        </button>
      </div>
      {open ? (
        <TouchForm prospectId={prospect.id} onDone={() => setOpen(false)} />
      ) : null}
    </section>
  );
}

function TouchForm({
  prospectId,
  onDone,
}: {
  prospectId: string;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [noNext, setNoNext] = useState(false);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await logTouchAction(formData);
          if (result.ok) {
            setError(null);
            onDone();
          } else {
            setError(result.message);
          }
        });
      }}
      className="mt-3 space-y-2.5 border-t border-neutral-200 pt-3"
    >
      <input type="hidden" name="prospect_id" value={prospectId} />
      <textarea
        name="message"
        rows={3}
        autoFocus
        placeholder="O que ele disse, com as palavras dele."
        className={inputClass}
        aria-label="O que aconteceu"
      />
      <fieldset disabled={noNext} className="space-y-2 disabled:opacity-40">
        <legend className={labelClass}>Próximo contato</legend>
        <div className="flex flex-wrap gap-2">
          <input
            type="date"
            name="next_contact_date"
            className={`${fieldClass} w-full sm:w-auto`}
            aria-label="Data do próximo contato"
          />
          <input
            type="time"
            name="next_contact_time"
            className={`${fieldClass} w-full sm:w-auto`}
            aria-label="Hora do próximo contato"
          />
          <input
            type="number"
            name="next_contact_minutes"
            min={5}
            step={5}
            placeholder="min"
            className={`${fieldClass} w-full sm:w-20`}
            aria-label="Duração em minutos"
          />
        </div>
        <input
          name="next_contact_what"
          placeholder="O que fazer da próxima vez"
          className={inputClass}
        />
      </fieldset>
      <label className="flex items-center gap-2 text-xs text-neutral-600">
        <input
          type="checkbox"
          name="no_next"
          checked={noNext}
          onChange={(event) => setNoNext(event.target.checked)}
          className="size-4"
        />
        Este contato encerrou — sem próxima data
      </label>
      {error ? (
        <p role="alert" className="text-xs font-medium text-red-700">
          {error}
        </p>
      ) : null}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-10 items-center rounded-md bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 sm:min-h-0 sm:px-3 sm:py-1.5 sm:text-xs"
        >
          Salvar
        </button>
        <button
          type="button"
          onClick={onDone}
          className="min-h-10 px-2 text-sm text-neutral-500 hover:text-neutral-800 sm:min-h-0 sm:px-0 sm:text-xs"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- histórico

function NoteBox({ prospectId }: { prospectId: string }) {
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(formData) =>
        startTransition(async () => {
          await addNoteAction(formData);
          formRef.current?.reset();
        })
      }
      className="mb-4 flex gap-2"
    >
      <input type="hidden" name="prospect_id" value={prospectId} />
      <input
        name="message"
        placeholder="Anotar algo sem mexer na data…"
        className={inputClass}
      />
      <button
        type="submit"
        disabled={pending}
        className="shrink-0 rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
      >
        Anotar
      </button>
    </form>
  );
}

const TOUCH_DOT: Record<string, string> = {
  contato: "bg-neutral-900 border-neutral-900",
  nota: "bg-white border-neutral-300",
  etapa: "bg-white border-neutral-300",
};

function Timeline({
  touches,
  authors,
}: {
  touches: ProspectTouch[];
  authors: Map<string, string>;
}) {
  if (touches.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-neutral-300 px-3 py-5 text-center text-sm text-neutral-500">
        Nada registrado ainda.
      </p>
    );
  }

  return (
    <ol className="relative space-y-4 border-l border-neutral-200 pl-5">
      {touches.map((touch) => (
        <li key={touch.id} className="relative">
          <span
            aria-hidden
            className={`absolute -left-[26px] top-1.5 size-2.5 rounded-full border-2 ${
              TOUCH_DOT[touch.kind] ?? TOUCH_DOT.nota
            }`}
          />
          <p className="text-[11.5px] tabular-nums text-neutral-400">
            {new Date(touch.happened_at).toLocaleString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
            {touch.author_id && authors.get(touch.author_id)
              ? ` · ${authors.get(touch.author_id)}`
              : ""}
          </p>
          <p
            className={`text-[13.5px] whitespace-pre-wrap ${
              touch.kind === "etapa" ? "text-neutral-500" : "text-neutral-800"
            }`}
          >
            {touch.message || "(sem texto)"}
          </p>
        </li>
      ))}
    </ol>
  );
}

// ------------------------------------------------------------------ etapa

function MoveStage({
  prospect,
  stages,
}: {
  prospect: ProspectRow;
  stages: ProspectStage[];
}) {
  const [stageId, setStageId] = useState(prospect.stage_id);
  const [pending, startTransition] = useTransition();

  const target = stages.find((stage) => stage.id === stageId);
  const asksReason = target?.kind === "perdida";
  const changed = stageId !== prospect.stage_id;

  return (
    <form
      action={(formData) => startTransition(() => moveProspectAction(formData))}
      className="space-y-2"
    >
      <h2 className={sectionClass}>Etapa</h2>
      <input type="hidden" name="prospect_id" value={prospect.id} />
      <select
        name="stage_id"
        value={stageId}
        onChange={(event) => setStageId(event.target.value)}
        className={inputClass}
        aria-label="Etapa"
      >
        {stages.map((stage) => (
          <option key={stage.id} value={stage.id}>
            {stage.name}
          </option>
        ))}
      </select>

      {/* O motivo aparece na hora de mover, não depois: escrito frio, uma
          semana depois, vira "não tinha verba" em todos os casos. */}
      {asksReason ? (
        <label className="block">
          <span className={labelClass}>Por que não fechou?</span>
          <textarea
            name="lost_reason"
            rows={2}
            required
            defaultValue={prospect.lost_reason}
            placeholder="Concreto: achou caro comparado a quê? quem vetou?"
            className={inputClass}
          />
        </label>
      ) : null}

      {changed ? (
        <button
          type="submit"
          disabled={pending}
          className="min-h-10 w-full rounded-md bg-neutral-900 px-3 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 sm:min-h-0 sm:py-1.5 sm:text-xs"
        >
          Mover para {target?.name}
        </button>
      ) : null}

      {!changed && prospect.lost_reason ? (
        <p className="rounded-md bg-red-50 px-2.5 py-2 text-xs text-red-800">
          <span className="font-semibold">Motivo:</span> {prospect.lost_reason}
        </p>
      ) : null}
    </form>
  );
}

// ------------------------------------------------------------------ dados

/** A caixa de mensagem com as contas de data já feitas. Separada só pra não
 *  encher o corpo do componente de cima com três `useMemo`. */
function Message({
  prospect,
  templates,
}: {
  prospect: ProspectRow;
  templates: MessageTemplate[];
}) {
  const dias = daysSinceTouch(prospect.last_touch_at);

  return (
    // Fechado por padrão: o bloco é alto e empurrava o histórico pra fora da
    // tela em toda abertura da ficha, inclusive quando se veio só conferir o
    // que foi falado. Quem vem escrever abre; quem vem ler não paga por isso.
    <details className="group">
      <summary className={`${sectionClass} flex cursor-pointer items-center gap-1.5`}>
        <span
          aria-hidden="true"
          className="inline-block transition-transform group-open:rotate-90"
        >
          ›
        </span>
        Mensagem
        <span className="font-normal normal-case tracking-normal text-neutral-400">
          — {SITUATION_LABELS[suggestForProspect(prospect, dias)].toLowerCase()}
        </span>
      </summary>
      <MessageBox
        templates={templates}
        suggested={suggestForProspect(prospect, dias)}
        vars={prospectVars(prospect, dias)}
        phone={prospect.phone}
        hint={
          dias === null
            ? "Nenhum contato registrado ainda."
            : `Último registro faz ${dias} ${dias === 1 ? "dia" : "dias"}.`
        }
        storageKey={prospect.id}
      />
      <p className="mt-1 text-xs text-neutral-500">
        Depois de mandar, registre no “Falei” pra reagendar o próximo passo.
      </p>
    </details>
  );
}

function Details({
  prospect,
  owners,
  clients,
  budgets,
  contracts,
}: {
  prospect: ProspectRow;
  owners: ProspectOwnerOption[];
  clients: ProspectClientOption[];
  budgets: ProspectDocOption[];
  contracts: ProspectDocOption[];
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!editing) {
    return (
      <section>
        <div className="mb-2 flex items-baseline">
          <h2 className={`${sectionClass} mb-0`}>Dados</h2>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="ml-auto min-h-10 px-2 text-sm text-neutral-500 hover:text-neutral-800 sm:min-h-0 sm:px-0 sm:text-xs"
          >
            Editar
          </button>
        </div>
        <dl className="rounded-lg border border-neutral-200 px-3 py-1 text-[13px]">
          <Field k="Contato" v={[prospect.contact_name, prospect.role].filter(Boolean).join(" · ")} />
          <Field k="Telefone" v={prospect.phone} />
          <Field k="E-mail" v={prospect.email} />
          <Field k="Perfil" v={prospect.handle} />
          <Field k="Origem" v={prospect.origin} />
          <Field
            k="Conduz"
            v={owners.find((owner) => owner.id === prospect.owner_id)?.username ?? ""}
          />
          <Field
            k="Cliente"
            v={clients.find((client) => client.id === prospect.client_id)?.name ?? ""}
          />
          <Field
            k="Valor"
            v={prospect.value > 0 ? formatBRL(prospect.value) : ""}
          />
          <Field
            k="Orçamento"
            v={budgets.find((doc) => doc.id === prospect.budget_id)?.title ?? ""}
            href={
              prospect.budget_id
                ? `/orcamento/${budgets.find((doc) => doc.id === prospect.budget_id)?.slug ?? ""}`
                : undefined
            }
          />
          <Field
            k="Contrato"
            v={
              contracts.find((doc) => doc.id === prospect.contract_id)?.title ??
              ""
            }
            href={
              prospect.contract_id
                ? `/contrato/${contracts.find((doc) => doc.id === prospect.contract_id)?.slug ?? ""}`
                : undefined
            }
          />
          <Field k="Toques" v={String(prospect.touch_count)} />
        </dl>
        {prospect.notes ? (
          <p className="mt-2 rounded-lg border border-neutral-200 px-3 py-2 text-[13px] whitespace-pre-wrap text-neutral-700">
            {prospect.notes}
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          await updateProspectAction(formData);
          setEditing(false);
        })
      }
      className="space-y-2"
    >
      <h2 className={sectionClass}>Dados</h2>
      <input type="hidden" name="id" value={prospect.id} />
      <input type="hidden" name="stage_id" value={prospect.stage_id} />
      <input type="hidden" name="lost_reason" value={prospect.lost_reason} />
      <input
        type="hidden"
        name="next_contact_date"
        value={prospect.next_contact_date ?? ""}
      />
      <input
        type="hidden"
        name="next_contact_time"
        value={prospect.next_contact_time ?? ""}
      />
      <input
        type="hidden"
        name="next_contact_minutes"
        value={prospect.next_contact_minutes ?? ""}
      />
      <input
        type="hidden"
        name="next_contact_what"
        value={prospect.next_contact_what}
      />

      <input name="name" defaultValue={prospect.name} className={inputClass} aria-label="Nome" />
      <input name="contact_name" defaultValue={prospect.contact_name} placeholder="Com quem falo" className={inputClass} />
      <input name="role" defaultValue={prospect.role} placeholder="Cargo" className={inputClass} />
      <input name="phone" defaultValue={prospect.phone} placeholder="Telefone" className={inputClass} />
      <input name="email" defaultValue={prospect.email} placeholder="E-mail" className={inputClass} />
      <input name="handle" defaultValue={prospect.handle} placeholder="@perfil" className={inputClass} />
      <input name="origin" defaultValue={prospect.origin} placeholder="Origem" className={inputClass} />

      <select name="owner_id" defaultValue={prospect.owner_id ?? ""} className={inputClass} aria-label="Quem conduz">
        <option value="">Sem responsável</option>
        {owners.map((owner) => (
          <option key={owner.id} value={owner.id}>{owner.username}</option>
        ))}
      </select>

      <select name="client_id" defaultValue={prospect.client_id ?? ""} className={inputClass} aria-label="Cliente">
        <option value="">Ainda não é cliente</option>
        {clients.map((client) => (
          <option key={client.id} value={client.id}>{client.name}</option>
        ))}
      </select>

      {/* O valor é o que faz o painel comercial existir: sem ele o funil
          conta contatos e não sabe dizer quanto há em jogo. */}
      <input
        name="value"
        inputMode="decimal"
        defaultValue={prospect.value > 0 ? String(prospect.value) : ""}
        placeholder="Valor em jogo (R$)"
        className={inputClass}
      />

      <select name="budget_id" defaultValue={prospect.budget_id ?? ""} className={inputClass} aria-label="Orçamento enviado">
        <option value="">Sem orçamento</option>
        {budgets.map((doc) => (
          <option key={doc.id} value={doc.id}>{doc.title}</option>
        ))}
      </select>

      <select name="contract_id" defaultValue={prospect.contract_id ?? ""} className={inputClass} aria-label="Contrato">
        <option value="">Sem contrato</option>
        {contracts.map((doc) => (
          <option key={doc.id} value={doc.id}>{doc.title}</option>
        ))}
      </select>

      <textarea name="notes" rows={3} defaultValue={prospect.notes} placeholder="Notas" className={inputClass} />

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-10 items-center rounded-md bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 sm:min-h-0 sm:px-3 sm:py-1.5 sm:text-xs"
        >
          Salvar
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="min-h-10 px-2 text-sm text-neutral-500 hover:text-neutral-800 sm:min-h-0 sm:px-0 sm:text-xs"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => {
            if (!window.confirm(`Apagar "${prospect.name}" e todo o histórico?`)) return;
            const formData = new FormData();
            formData.set("id", prospect.id);
            startTransition(() => deleteProspectAction(formData));
          }}
          className="ml-auto min-h-10 px-2 text-sm text-red-500 hover:text-red-700 sm:min-h-0 sm:px-0 sm:text-xs"
        >
          Apagar
        </button>
      </div>
    </form>
  );
}

function Field({
  k,
  v,
  href,
}: {
  k: string;
  v: string;
  /** Orçamento e contrato abrem a peça: sem o link, saber que existe obriga a
   *  procurar o mesmo nome na outra tela. */
  href?: string;
}) {
  if (!v) return null;
  return (
    <div className="flex gap-3 border-b border-neutral-100 py-1.5 last:border-b-0">
      <dt className="w-20 shrink-0 text-neutral-400">{k}</dt>
      <dd className="min-w-0 break-words">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="underline decoration-neutral-300 underline-offset-2 hover:decoration-neutral-600"
          >
            {v}
          </a>
        ) : (
          v
        )}
      </dd>
    </div>
  );
}
