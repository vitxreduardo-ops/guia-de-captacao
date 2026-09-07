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
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none";
const PRESS =
  "transition-transform focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.97] pointer-coarse:min-h-11";

/** Rótulo em cima, dica embaixo: o formulário do cliente tem campo demais. */
function Campo({
  label,
  hint,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-neutral-600">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="mt-0.5 block text-[11px] text-neutral-400">{hint}</span>
      ) : null}
    </label>
  );
}

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
          className="grid gap-3 sm:grid-cols-2"
        >
          <input type="hidden" name="id" value={client.id} />

          <Campo label="Nome curto" hint="O que aparece nos cards e na galeria">
            <input
              name="name"
              defaultValue={client.name}
              required
              autoFocus
              className={inputClass}
            />
          </Campo>

          <Campo label="Empresa" hint="Razão social, como sai na nota">
            <input
              name="company_name"
              defaultValue={client.company_name ?? ""}
              className={inputClass}
            />
          </Campo>

          <Campo label="Responsável">
            <input
              name="contact_name"
              defaultValue={client.contact_name ?? ""}
              placeholder="Quem aprova e recebe a cobrança"
              className={inputClass}
            />
          </Campo>

          <Campo label="Telefone">
            <input
              name="phone"
              type="tel"
              inputMode="tel"
              defaultValue={client.phone ?? ""}
              placeholder="(00) 00000-0000"
              className={inputClass}
            />
          </Campo>

          <Campo label="E-mail" hint="Para onde a nota é enviada">
            <input
              name="email"
              type="email"
              defaultValue={client.email ?? ""}
              className={inputClass}
            />
          </Campo>

          <Campo label="CNPJ ou CPF">
            <input
              name="document"
              inputMode="numeric"
              defaultValue={client.document ?? ""}
              className={inputClass}
            />
          </Campo>

          <Campo label="Dia de vencimento" hint="Do mês seguinte ao da entrega">
            <input
              name="payment_day"
              type="number"
              min={1}
              max={31}
              defaultValue={client.payment_day ?? ""}
              placeholder="10"
              className={inputClass}
            />
          </Campo>

          <Campo label="Endereço" className="sm:col-span-2">
            <input
              name="address"
              defaultValue={client.address ?? ""}
              className={inputClass}
            />
          </Campo>

          <Campo label="Observações" className="sm:col-span-2">
            <textarea
              name="notes"
              defaultValue={client.notes ?? ""}
              rows={2}
              placeholder="Combinados de pagamento, particularidades do cliente"
              className={inputClass}
            />
          </Campo>

          <label className="flex items-center gap-1.5 text-xs text-neutral-600 sm:col-span-2">
            <input
              type="checkbox"
              name="published"
              defaultChecked={client.status === "published"}
              className="size-3.5"
            />
            Galeria publicada
          </label>

          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <button
              type="submit"
              disabled={pending}
              className={`rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50 ${PRESS}`}
            >
              {pending ? "Salvando..." : "Salvar"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-xs text-neutral-500 hover:text-neutral-800"
            >
              Cancelar
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    // O nome ocupa a linha inteira no celular: dividindo espaço com as
    // métricas, "LoopFilmes - Rede Câmara" virava "L…" — o dado principal
    // reduzido a uma letra. No desktop os dois voltam para a mesma linha.
    <li className="group flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm">
      <span className="w-full truncate font-medium text-neutral-900 sm:w-auto sm:min-w-0 sm:flex-1">
        {client.name}
        {client.contact_name ? (
          <span className="ml-2 text-xs font-normal text-neutral-500">
            {client.contact_name}
          </span>
        ) : null}
      </span>

      {client.payment_day ? (
        <span className="rounded bg-amber-50 px-1.5 py-0.5 text-xs text-amber-700 tabular-nums">
          vence dia {client.payment_day}
        </span>
      ) : null}

      {/* Entregas vêm do quadro, faturado vem das notas fechadas. Quando há
          trabalho e nenhum mês fechado, "R$ 0,00 faturado" lê como erro — o
          texto precisa dizer que falta fechar, não que não houve receita. */}
      <span className="text-xs text-neutral-500 tabular-nums">
        {summary.entregasNoAno === 0 && summary.faturadoNoAnoCents === 0
          ? "sem entregas no ano"
          : summary.faturadoNoAnoCents === 0
            ? `${summary.entregasNoAno} ${
                summary.entregasNoAno === 1 ? "entrega" : "entregas"
              } · nenhum mês fechado`
            : `${summary.entregasNoAno} ${
                summary.entregasNoAno === 1 ? "entrega" : "entregas"
              } · ${formatBRL(summary.faturadoNoAnoCents)} faturado`}
      </span>

      {client.status === "published" ? (
        <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-700">
          galeria no ar
        </span>
      ) : (
        <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-600">
          rascunho
        </span>
      )}

      <Link
        href={`/admin/galerias/${client.id}`}
        className="rounded-md text-xs text-neutral-500 underline hover:text-neutral-800 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none pointer-coarse:inline-flex pointer-coarse:min-h-11 pointer-coarse:items-center pointer-coarse:px-2"
      >
        Galeria
      </Link>
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
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-transform focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.97] pointer-coarse:min-h-11"
          >
            Adicionar cliente
          </button>
        </form>
      </div>
    </section>
  );
}
