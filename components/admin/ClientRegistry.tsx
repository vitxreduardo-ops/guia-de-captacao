"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { formatBRL } from "@/lib/billingTypes";
import type { GalleryClient } from "@/lib/galleries";
import {
  createClientAction,
  updateClientAction,
} from "@/app/admin/clientes/cadastro/actions";

const inputClass =
  "rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none";

export interface ClientSummary {
  entregasNoAno: number;
  faturadoNoAnoCents: number;
}

function ClientRow({
  client,
  summary,
}: {
  client: GalleryClient;
  summary: ClientSummary;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  if (editing) {
    return (
      <li className="px-4 py-3">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            startTransition(async () => {
              await updateClientAction(formData);
              setEditing(false);
            });
          }}
          className="flex flex-wrap items-center gap-2"
        >
          <input type="hidden" name="id" value={client.id} />
          <input
            name="name"
            defaultValue={client.name}
            autoFocus
            className={`${inputClass} min-w-0 flex-1`}
          />
          <label className="flex items-center gap-1.5 text-xs text-neutral-600">
            <input
              type="checkbox"
              name="published"
              defaultChecked={client.status === "published"}
              className="size-3.5"
            />
            Galeria publicada
          </label>
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
        </form>
      </li>
    );
  }

  return (
    <li className="group flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm">
      <span className="min-w-0 flex-1 truncate font-medium text-neutral-900">
        {client.name}
      </span>

      <span className="text-xs text-neutral-500">
        {summary.entregasNoAno} entregas no ano ·{" "}
        {formatBRL(summary.faturadoNoAnoCents)} faturado
      </span>

      {client.status === "published" ? (
        <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] text-emerald-700">
          galeria no ar
        </span>
      ) : (
        <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] text-neutral-500">
          rascunho
        </span>
      )}

      <Link
        href={`/admin/galerias/${client.id}`}
        className="text-xs text-neutral-500 underline hover:text-neutral-800"
      >
        Galeria
      </Link>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-xs text-neutral-400 opacity-0 transition-opacity hover:text-neutral-800 focus-visible:opacity-100 group-hover:opacity-100"
      >
        Editar
      </button>
    </li>
  );
}

/**
 * Cadastro de clientes. Só nome e visibilidade da galeria — excluir continua
 * sendo feito em Galerias, onde dá pra ver o que vai junto.
 */
export function ClientRegistry({
  clients,
  summaries,
  year,
}: {
  clients: GalleryClient[];
  summaries: Record<string, ClientSummary>;
  year: number;
}) {
  const vazio: ClientSummary = { entregasNoAno: 0, faturadoNoAnoCents: 0 };

  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-neutral-900">
          Clientes cadastrados
        </h2>
        <span className="text-xs text-neutral-500">números de {year}</span>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white">
        {clients.length > 0 ? (
          <ul className="divide-y divide-neutral-100">
            {clients.map((client) => (
              <ClientRow
                key={client.id}
                client={client}
                summary={summaries[client.id] ?? vazio}
              />
            ))}
          </ul>
        ) : null}

        <form
          action={createClientAction}
          className="flex flex-wrap items-center gap-2 border-t border-neutral-100 p-3 first:border-t-0"
        >
          <input
            name="name"
            placeholder="Nome do cliente"
            required
            className={`${inputClass} min-w-0 flex-1`}
          />
          <button
            type="submit"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            Adicionar cliente
          </button>
        </form>
      </div>
    </section>
  );
}
