"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { logTouchAction } from "@/app/admin/prospeccao/actions";
import {
  QUEUE_BUCKET_LABELS,
  daysLate,
  formatDateShort,
  formatTime,
  queueBucket,
  type ProspectRow,
  type ProspectStage,
  type QueueBucket,
} from "@/lib/prospectTypes";

/** A ordem em que os blocos aparecem. "Sem próximo passo" vem primeiro: é o
 * vazamento silencioso do funil, e esconder no fim é como perder contato. */
const BUCKET_ORDER: QueueBucket[] = [
  "sem-data",
  "atrasado",
  "hoje",
  "semana",
  "depois",
];

export function ProspectQueue({
  prospects,
  stages,
  today,
}: {
  prospects: ProspectRow[];
  stages: ProspectStage[];
  today: string;
}) {
  const groups = new Map<QueueBucket, ProspectRow[]>();
  for (const prospect of prospects) {
    const bucket = queueBucket(prospect.next_contact_date, today);
    const list = groups.get(bucket);
    if (list) list.push(prospect);
    else groups.set(bucket, [prospect]);
  }

  const visible = BUCKET_ORDER.filter((bucket) => groups.get(bucket)?.length);

  if (visible.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-500">
        Nenhum contato ainda. O primeiro passo é a lista, não a ferramenta:
        escreva 30 negócios que já pagaram por conteúdo e traga pra cá.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {visible.map((bucket) => (
        <section key={bucket}>
          <h2
            className={`mb-2 text-xs font-semibold tracking-wide uppercase ${
              bucket === "atrasado" || bucket === "sem-data"
                ? "text-red-700"
                : "text-neutral-400"
            }`}
          >
            {QUEUE_BUCKET_LABELS[bucket]}
            <span className="ml-2 font-normal normal-case tracking-normal">
              · {groups.get(bucket)!.length}
            </span>
          </h2>
          <ul className="space-y-2">
            {groups.get(bucket)!.map((prospect) => (
              <li key={prospect.id}>
                <QueueItem
                  prospect={prospect}
                  stages={stages}
                  today={today}
                  bucket={bucket}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function QueueItem({
  prospect,
  stages,
  today,
  bucket,
}: {
  prospect: ProspectRow;
  stages: ProspectStage[];
  today: string;
  bucket: QueueBucket;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <Link
          href={`/admin/prospeccao/${prospect.id}`}
          className="text-[15px] font-semibold text-neutral-900 hover:underline focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none"
        >
          {prospect.name}
        </Link>
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-medium"
          style={{
            backgroundColor: `${prospect.stage.color}1a`,
            color: prospect.stage.color,
          }}
        >
          {prospect.stage.name}
        </span>
        <span className="ml-auto text-[13px] tabular-nums text-neutral-500">
          <When prospect={prospect} today={today} bucket={bucket} />
        </span>
      </div>

      {prospect.next_contact_what ? (
        <p className="mt-0.5 text-[13px] text-neutral-600">
          {prospect.next_contact_what}
        </p>
      ) : null}

      {prospect.contact_name || prospect.phone ? (
        <p className="mt-1 text-xs text-neutral-400">
          {[prospect.contact_name, prospect.role, prospect.phone]
            .filter(Boolean)
            .join(" · ")}
        </p>
      ) : null}

      {prospect.stage.playbook ? (
        <details className="mt-2 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1.5">
          <summary className="cursor-pointer text-xs font-medium text-neutral-600">
            Roteiro — {prospect.stage.name}
          </summary>
          <p className="mt-1.5 text-xs leading-relaxed whitespace-pre-wrap text-neutral-700">
            {prospect.stage.playbook}
          </p>
        </details>
      ) : null}

      <div className="mt-2.5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          {open ? "Fechar" : "Falei"}
        </button>
        <Link
          href={`/admin/prospeccao/${prospect.id}`}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Abrir ficha
        </Link>
      </div>

      {open ? (
        <TouchForm
          prospect={prospect}
          stages={stages}
          onDone={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}

function When({
  prospect,
  today,
  bucket,
}: {
  prospect: ProspectRow;
  today: string;
  bucket: QueueBucket;
}) {
  if (!prospect.next_contact_date) {
    return <span className="font-medium text-red-700">sem data</span>;
  }

  const time = prospect.next_contact_time
    ? formatTime(prospect.next_contact_time)
    : null;

  if (bucket === "atrasado") {
    const late = daysLate(prospect.next_contact_date, today);
    return (
      <span className="font-semibold text-red-700">
        {formatDateShort(prospect.next_contact_date)} · {late}
        {late === 1 ? " dia" : " dias"} atrás
      </span>
    );
  }
  if (bucket === "hoje") {
    return <span className="font-medium">{time ?? "Hoje"}</span>;
  }
  return (
    <span>
      {formatDateShort(prospect.next_contact_date)}
      {time ? ` · ${time}` : ""}
    </span>
  );
}

/** Sem largura: quem usa escolhe. Compor `w-full` com `w-auto` na mesma
 * string não funciona — em Tailwind a ordem do CSS decide, não a da classe. */
const fieldClass =
  "rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none";
const inputClass = `w-full ${fieldClass}`;

/**
 * Registrar a conversa e marcar a próxima é um gesto só. Separar em dois
 * botões abriria a porta pra anotar o que foi dito e sair sem próxima data —
 * exatamente o buraco que este funil existe pra tapar.
 */
function TouchForm({
  prospect,
  stages,
  onDone,
}: {
  prospect: ProspectRow;
  stages: ProspectStage[];
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [noNext, setNoNext] = useState(false);

  const closing = stages.filter(
    (stage) => stage.kind === "ganha" || stage.kind === "perdida"
  );

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
      className="mt-3 space-y-2.5 rounded-md border border-neutral-200 bg-neutral-50 p-3"
    >
      <input type="hidden" name="prospect_id" value={prospect.id} />

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-neutral-600">
          O que aconteceu
        </span>
        <textarea
          name="message"
          rows={3}
          autoFocus
          placeholder="O que ele disse, com as palavras dele."
          className={inputClass}
        />
      </label>

      <fieldset
        disabled={noNext}
        className="space-y-2 disabled:opacity-40"
      >
        <legend className="mb-1 text-xs font-medium text-neutral-600">
          Próximo contato
        </legend>
        <div className="flex flex-wrap gap-2">
          <input
            type="date"
            name="next_contact_date"
            className={`${fieldClass} w-auto`}
            aria-label="Data do próximo contato"
          />
          <input
            type="time"
            name="next_contact_time"
            className={`${fieldClass} w-auto`}
            aria-label="Hora do próximo contato"
          />
          <input
            type="number"
            name="next_contact_minutes"
            min={5}
            step={5}
            placeholder="min"
            className={`${fieldClass} w-20`}
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
          className="size-3.5"
        />
        Este contato encerrou — sem próxima data
      </label>

      {noNext && closing.length > 0 ? (
        <p className="text-xs text-neutral-500">
          Depois de salvar, mova para{" "}
          {closing.map((stage) => stage.name).join(" ou ")} na ficha, pra deixar
          registrado por quê.
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="text-xs font-medium text-red-700">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Salvar
        </button>
        <button
          type="button"
          onClick={onDone}
          className="text-xs text-neutral-500 hover:text-neutral-800"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
