"use client";

import { useRef, useState, useTransition } from "react";
import { createProspectAction } from "@/app/admin/prospeccao/actions";
import type {
  ProspectClientOption,
  ProspectStage,
} from "@/lib/prospectTypes";

/** Sem largura: quem usa escolhe. Compor `w-full` com `w-auto` na mesma
 * string não funciona — em Tailwind a ordem do CSS decide, não a da classe. */
const fieldClass =
  "rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none";
const inputClass = `w-full ${fieldClass}`;

/**
 * Cadastro enxuto de propósito: nome, etapa e o próximo passo. O resto
 * (telefone, quem é, origem) se preenche na ficha quando existir — pedir
 * quinze campos na entrada faz a lista não ser escrita.
 */
export function ProspectNew({
  stages,
  clients,
}: {
  stages: ProspectStage[];
  clients: ProspectClientOption[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        Novo contato
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={(formData) =>
        startTransition(async () => {
          await createProspectAction(formData);
          formRef.current?.reset();
          setOpen(false);
        })
      }
      className="w-full space-y-2.5 rounded-lg border border-neutral-200 bg-neutral-50 p-4"
    >
      <div className="flex flex-wrap gap-2">
        <input
          name="name"
          required
          autoFocus
          placeholder="Nome do negócio"
          className={`${fieldClass} flex-1 min-w-48`}
        />
        <select name="stage_id" className={`${fieldClass} w-auto`}>
          {stages.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          name="contact_name"
          placeholder="Com quem falo"
          className={`${fieldClass} flex-1 min-w-40`}
        />
        <input
          name="phone"
          placeholder="Telefone"
          className={`${fieldClass} w-40`}
        />
        <input
          name="origin"
          placeholder="Origem (indicação, direct…)"
          className={`${fieldClass} w-52`}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
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
          name="next_contact_what"
          placeholder="Próximo passo"
          className={`${fieldClass} flex-1 min-w-48`}
        />
      </div>

      {clients.length > 0 ? (
        <select name="client_id" defaultValue="" className={inputClass}>
          <option value="">Ainda não é cliente</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              Já é cliente: {client.name}
            </option>
          ))}
        </select>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Adicionar
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-neutral-500 hover:text-neutral-800"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
