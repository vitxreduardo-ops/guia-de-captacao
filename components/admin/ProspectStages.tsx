"use client";

import { useState, useTransition } from "react";
import {
  createStageAction,
  deleteStageAction,
  updateStageAction,
} from "@/app/admin/prospeccao/actions";
import {
  PROSPECT_STAGE_COLORS,
  PROSPECT_STAGE_KINDS,
  STAGE_KIND_LABELS,
  type ProspectStage,
} from "@/lib/prospectTypes";

const fieldClass =
  "rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none";
const inputClass = `w-full ${fieldClass}`;

export function ProspectStages({
  stages,
  counts,
}: {
  stages: ProspectStage[];
  counts: Record<string, number>;
}) {
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {error ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <ul className="space-y-2">
        {stages.map((stage) => (
          <li key={stage.id}>
            <StageRow
              stage={stage}
              count={counts[stage.id] ?? 0}
              onError={setError}
            />
          </li>
        ))}
      </ul>

      <NewStage />
    </div>
  );
}

function StageRow({
  stage,
  count,
  onError,
}: {
  stage: ProspectStage;
  count: number;
  onError: (message: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!editing) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-neutral-200 px-3 py-2.5">
        <span
          aria-hidden
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: stage.color }}
        />
        <span className="font-medium">{stage.name}</span>
        <span className="text-xs text-neutral-400">
          {count === 1 ? "1 contato" : `${count} contatos`}
        </span>
        {stage.kind !== "ativa" ? (
          <span className="rounded bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600">
            {STAGE_KIND_LABELS[stage.kind]}
          </span>
        ) : null}
        {stage.playbook ? (
          <span className="text-[11px] text-neutral-400">roteiro escrito</span>
        ) : (
          <span className="text-[11px] text-amber-700">sem roteiro</span>
        )}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="ml-auto text-xs text-neutral-500 hover:text-neutral-800 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none"
        >
          Editar
        </button>
      </div>
    );
  }

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          await updateStageAction(formData);
          setEditing(false);
        })
      }
      className="space-y-2 rounded-lg border border-neutral-300 bg-neutral-50 p-3"
    >
      <input type="hidden" name="id" value={stage.id} />
      <div className="flex flex-wrap gap-2">
        <input
          name="name"
          defaultValue={stage.name}
          autoFocus
          className={`${fieldClass} flex-1 min-w-40`}
          aria-label="Nome da etapa"
        />
        <select
          name="color"
          defaultValue={stage.color}
          className={`${fieldClass} w-32`}
          aria-label="Cor"
        >
          {PROSPECT_STAGE_COLORS.map((color) => (
            <option key={color} value={color}>
              {color}
            </option>
          ))}
        </select>
        <select
          name="kind"
          defaultValue={stage.kind}
          className={`${fieldClass} w-56`}
          aria-label="Tipo da etapa"
        >
          {PROSPECT_STAGE_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {STAGE_KIND_LABELS[kind]}
            </option>
          ))}
        </select>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-neutral-600">
          Roteiro — aparece na fila e na ficha de quem está nesta etapa
        </span>
        <textarea
          name="playbook"
          defaultValue={stage.playbook}
          rows={8}
          placeholder={
            "Objetivo desta conversa (uma frase só).\n\nPerguntas, na ordem.\n\nO que escutar: sinal de que avança / sinal de que não é cliente.\n\nSaída combinada: nunca encerrar sem próxima data."
          }
          className={inputClass}
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          Salvar
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-xs text-neutral-500 hover:text-neutral-800"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => {
            if (!window.confirm(`Apagar a etapa "${stage.name}"?`)) return;
            const formData = new FormData();
            formData.set("id", stage.id);
            startTransition(async () => {
              const result = await deleteStageAction(formData);
              onError(result.ok ? null : result.message);
              if (result.ok) setEditing(false);
            });
          }}
          className="ml-auto text-xs text-red-500 hover:text-red-700"
        >
          Apagar etapa
        </button>
      </div>
    </form>
  );
}

function NewStage() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        Nova etapa
      </button>
    );
  }

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          await createStageAction(formData);
          setOpen(false);
        })
      }
      className="flex flex-wrap gap-2 rounded-lg border border-neutral-300 bg-neutral-50 p-3"
    >
      <input
        name="name"
        required
        autoFocus
        placeholder="Nome da etapa"
        className={`${fieldClass} flex-1 min-w-40`}
      />
      <select name="color" className={`${fieldClass} w-32`} aria-label="Cor">
        {PROSPECT_STAGE_COLORS.map((color) => (
          <option key={color} value={color}>
            {color}
          </option>
        ))}
      </select>
      <select name="kind" className={`${fieldClass} w-56`} aria-label="Tipo">
        {PROSPECT_STAGE_KINDS.map((kind) => (
          <option key={kind} value={kind}>
            {STAGE_KIND_LABELS[kind]}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        Criar
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-xs text-neutral-500 hover:text-neutral-800"
      >
        Cancelar
      </button>
    </form>
  );
}
