"use client";

import { useRef } from "react";
import {
  createRadarAction,
  deleteRadarAction,
  updateRadarAction,
} from "@/app/admin/prospeccao/actions";
import {
  PRODUCES_CONTENT,
  PRODUCES_CONTENT_LABELS,
  RADAR_SECTORS,
  instagramHandle,
  type RadarCompany,
} from "@/lib/prospectTypes";

const CELL =
  "w-full rounded border border-transparent bg-transparent px-2 py-1.5 text-[13px] hover:border-neutral-200 focus:border-neutral-900 focus:bg-white focus-visible:outline-none";

/** Salva ao sair do campo (texto) ou ao escolher (select). Sem botão de
 * salvar: a tabela é pra ir anotando enquanto se navega, e um botão por linha
 * vira trabalho de digitação que ninguém faz. */
function save(element: HTMLInputElement | HTMLSelectElement) {
  element.form?.requestSubmit();
}

export function RadarTable({
  companies,
  sectors,
}: {
  companies: RadarCompany[];
  /** Ramos já usados, somados às sugestões fixas. */
  sectors: string[];
}) {
  const newForm = useRef<HTMLFormElement>(null);

  const options = Array.from(
    new Set([...RADAR_SECTORS, ...sectors].filter(Boolean))
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  return (
    <>
      <datalist id="radar-ramos">
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>

      {/* Cadastro em cima: o campo do nome fica sempre no mesmo lugar, dá pra
          anotar várias empresas seguidas sem procurar onde digitar. */}
      <form
        ref={newForm}
        action={async (formData) => {
          await createRadarAction(formData);
          newForm.current?.reset();
          newForm.current?.querySelector("input")?.focus();
        }}
        className="mb-4 grid gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3 sm:grid-cols-3 lg:grid-cols-4"
      >
        <input
          name="company"
          required
          placeholder="Nome da empresa"
          aria-label="Nome da empresa"
          className="rounded border border-neutral-300 bg-white px-2 py-1.5 text-[13px] focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none"
        />
        <input
          name="sector"
          list="radar-ramos"
          placeholder="Ramo"
          aria-label="Ramo"
          className="rounded border border-neutral-300 bg-white px-2 py-1.5 text-[13px] focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none"
        />
        <input
          name="instagram"
          placeholder="@instagram"
          aria-label="Instagram"
          className="rounded border border-neutral-300 bg-white px-2 py-1.5 text-[13px] focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none"
        />
        <select
          name="produces_content"
          aria-label="Produz conteúdo?"
          defaultValue=""
          className="rounded border border-neutral-300 bg-white px-2 py-1.5 text-[13px] focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none"
        >
          {PRODUCES_CONTENT.map((value) => (
            <option key={value} value={value}>
              {value === "" ? "Produz conteúdo?" : PRODUCES_CONTENT_LABELS[value]}
            </option>
          ))}
        </select>
        <input
          name="contact"
          placeholder="Contato"
          aria-label="Contato"
          className="rounded border border-neutral-300 bg-white px-2 py-1.5 text-[13px] focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none"
        />
        <input
          name="comms_name"
          placeholder="Responsável pela comunicação"
          aria-label="Responsável pela comunicação"
          className="rounded border border-neutral-300 bg-white px-2 py-1.5 text-[13px] focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none"
        />
        <input
          name="referral"
          placeholder="Ponto de contato / indicação"
          aria-label="Ponto de contato ou indicação"
          className="rounded border border-neutral-300 bg-white px-2 py-1.5 text-[13px] focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none"
        />
        <button
          type="submit"
          className="rounded bg-neutral-900 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-neutral-700 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Adicionar
        </button>
      </form>

      {/* Um <form> por linha, fora da tabela: <form> dentro de <tr> não é HTML
          válido, então os campos se ligam a ele pelo atributo `form`. */}
      {companies.map((row) => (
        <form key={row.id} id={`radar-${row.id}`} action={updateRadarAction} hidden>
          <input type="hidden" name="id" value={row.id} />
          <input type="hidden" name="notes" value={row.notes} />
        </form>
      ))}

      <div className="overflow-x-auto rounded-lg border border-neutral-200">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-neutral-50">
              <Th>Empresa</Th>
              <Th>Ramo</Th>
              <Th>Instagram</Th>
              <Th>Produz conteúdo?</Th>
              <Th>Contato</Th>
              <Th>Responsável pela comunicação</Th>
              <Th>Ponto de contato / indicação</Th>
              <Th> </Th>
            </tr>
          </thead>
          <tbody>
            {companies.map((row) => {
              const form = `radar-${row.id}`;
              const handle = instagramHandle(row.instagram);
              return (
                <tr key={row.id} className="border-t border-neutral-100">
                  <td className="px-1 py-1">
                    <input
                      form={form}
                      name="company"
                      defaultValue={row.company}
                      aria-label="Nome da empresa"
                      onBlur={(event) => save(event.currentTarget)}
                      className={`${CELL} font-semibold`}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <input
                      form={form}
                      name="sector"
                      list="radar-ramos"
                      defaultValue={row.sector}
                      aria-label="Ramo"
                      onBlur={(event) => save(event.currentTarget)}
                      className={CELL}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <input
                      form={form}
                      name="instagram"
                      defaultValue={row.instagram}
                      aria-label="Instagram"
                      onBlur={(event) => save(event.currentTarget)}
                      className={CELL}
                    />
                    {handle ? (
                      <a
                        href={`https://instagram.com/${handle}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 text-[11px] text-neutral-400 hover:text-neutral-900 hover:underline focus-visible:outline-none"
                      >
                        abrir @{handle}
                      </a>
                    ) : null}
                  </td>
                  <td className="px-1 py-1">
                    <select
                      form={form}
                      name="produces_content"
                      defaultValue={row.produces_content}
                      aria-label="Produz conteúdo?"
                      onChange={(event) => save(event.currentTarget)}
                      className={CELL}
                    >
                      {PRODUCES_CONTENT.map((value) => (
                        <option key={value} value={value}>
                          {PRODUCES_CONTENT_LABELS[value]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-1 py-1">
                    <input
                      form={form}
                      name="contact"
                      defaultValue={row.contact}
                      aria-label="Contato"
                      onBlur={(event) => save(event.currentTarget)}
                      className={CELL}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <input
                      form={form}
                      name="comms_name"
                      defaultValue={row.comms_name}
                      aria-label="Responsável pela comunicação"
                      onBlur={(event) => save(event.currentTarget)}
                      className={CELL}
                    />
                  </td>
                  <td className="px-1 py-1">
                    <input
                      form={form}
                      name="referral"
                      defaultValue={row.referral}
                      aria-label="Ponto de contato ou indicação"
                      onBlur={(event) => save(event.currentTarget)}
                      className={CELL}
                    />
                  </td>
                  <td className="px-1 py-1 text-right">
                    <button
                      form={form}
                      formAction={deleteRadarAction}
                      aria-label={`Apagar ${row.company || "empresa"}`}
                      onClick={(event) => {
                        if (!confirm(`Apagar ${row.company || "esta empresa"} do radar?`))
                          event.preventDefault();
                      }}
                      className="rounded px-2 py-1 text-[12px] text-neutral-400 hover:bg-red-50 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none"
                    >
                      Apagar
                    </button>
                  </td>
                </tr>
              );
            })}
            {companies.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-neutral-500">
                  Nenhuma empresa no radar ainda.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2.5 text-left text-[11px] font-semibold tracking-wide whitespace-nowrap text-neutral-400 uppercase">
      {children}
    </th>
  );
}
