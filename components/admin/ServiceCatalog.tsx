"use client";

import { useState, useTransition } from "react";
import { formatBRL, type Service } from "@/lib/billingTypes";
import {
  createServiceAction,
  deleteServiceAction,
  updateServiceAction,
} from "@/app/admin/clientes/faturamento/actions";

const inputClass =
  "rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none";

/** Valor em centavos vira o texto que a pessoa espera editar ("1250,00"). */
function priceInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function ServiceRow({ service }: { service: Service }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  if (editing) {
    return (
      <li className="px-4 py-2.5">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            startTransition(async () => {
              await updateServiceAction(formData);
              setEditing(false);
            });
          }}
          className="flex flex-wrap items-center gap-2"
        >
          <input type="hidden" name="id" value={service.id} />
          <input
            name="name"
            defaultValue={service.name}
            autoFocus
            className={`${inputClass} min-w-0 flex-1`}
          />
          <input
            name="price"
            defaultValue={priceInput(service.price_cents)}
            inputMode="decimal"
            aria-label="Valor"
            className={`${inputClass} w-28`}
          />
          <label className="flex items-center gap-1.5 text-xs text-neutral-600">
            <input
              type="checkbox"
              name="active"
              defaultChecked={service.active}
              className="size-3.5"
            />
            Ativo
          </label>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50 transition-transform focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.97] pointer-coarse:min-h-11"
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
              if (!window.confirm(`Excluir "${service.name}"?`)) return;
              const formData = new FormData();
              formData.set("id", service.id);
              startTransition(() => deleteServiceAction(formData));
            }}
            className="text-xs text-red-500 hover:text-red-700"
          >
            Excluir
          </button>
        </form>
      </li>
    );
  }

  return (
    <li className="group flex items-center gap-3 px-4 py-2.5 text-sm">
      <span
        className={`min-w-0 flex-1 truncate ${
          service.active ? "text-neutral-900" : "text-neutral-400 line-through"
        }`}
      >
        {service.name}
      </span>
      <span className="font-medium text-neutral-900 tabular-nums">
        {formatBRL(service.price_cents)}
      </span>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-xs text-neutral-500 opacity-0 transition-opacity hover:text-neutral-800 focus-visible:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100 pointer-coarse:min-h-11 pointer-coarse:px-2 pointer-coarse:inline-flex pointer-coarse:items-center focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none rounded-md"
      >
        Editar
      </button>
    </li>
  );
}

/**
 * Tabela de preços dos produtos e serviços. Só sugere o valor: o card copia o
 * preço no lançamento, então mudar aqui não mexe no que já foi cobrado.
 */
export function ServiceCatalog({ services }: { services: Service[] }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-neutral-900">
        Produtos e serviços
      </h2>

      <div className="rounded-lg border border-neutral-200 bg-white">
        {services.length > 0 ? (
          <ul className="divide-y divide-neutral-100">
            {services.map((service) => (
              <ServiceRow key={service.id} service={service} />
            ))}
          </ul>
        ) : (
          <p className="border-b border-neutral-100 p-4 text-sm text-neutral-500">
            Nenhum serviço cadastrado. O que você cadastrar aqui vira a lista de
            preços sugeridos ao lançar uma entrega — o valor é copiado para a
            entrega, então mudar o preço depois não mexe no que já foi cobrado.
          </p>
        )}

        <form
          action={createServiceAction}
          className="flex flex-wrap items-center gap-2 border-t border-neutral-100 p-3 first:border-t-0"
        >
          <input
            name="name"
            placeholder="Ex.: Reel gravado e editado"
            required
            className={`${inputClass} min-w-0 flex-1`}
          />
          <input
            name="price"
            placeholder="R$ 0,00"
            inputMode="decimal"
            aria-label="Valor"
            className={`${inputClass} w-28`}
          />
          <button
            type="submit"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-transform focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.97] pointer-coarse:min-h-11"
          >
            Adicionar
          </button>
        </form>
      </div>
    </section>
  );
}
