"use client";

import { useRef } from "react";
import {
  createRadarAction,
  deleteRadarAction,
  updateRadarAction,
} from "@/app/admin/radar/actions";
import {
  PRODUCES_CONTENT,
  PRODUCES_CONTENT_LABELS,
  RADAR_SECTORS,
  instagramHandle,
  type RadarCompany,
} from "@/lib/prospectTypes";
import { MessageBox } from "@/components/admin/MessageBox";
import {
  companyVars,
  suggestForCompany,
  type MessageTemplate,
} from "@/lib/messageText";

/**
 * Uma grade, não uma `<table>`.
 *
 * Tabela de verdade só teria dois destinos no celular: rolar de lado (sete
 * colunas num visor de 375px viram tiras de três letras) ou virar uma
 * segunda marcação só pra telas pequenas — e aí seriam dois campos com o
 * mesmo `name` no mesmo formulário. Com grade, o mesmo campo é cartão
 * rotulado no celular e coluna alinhada no monitor, e cada linha volta a
 * poder ser um `<form>` de verdade (dentro de `<tr>` não é HTML válido).
 */
const COLUMNS =
  "sm:grid sm:grid-cols-[minmax(9rem,1.3fr)_minmax(7rem,1fr)_minmax(8rem,1fr)_7.5rem_minmax(8rem,1fr)_minmax(8rem,1fr)_minmax(8rem,1fr)_4.5rem] sm:items-center sm:gap-1.5";

/** 16px no celular não é estética: abaixo disso o iOS dá zoom ao focar o
 * campo e joga a página pro lado. No monitor volta pro 13px da tabela. */
const CELL =
  "w-full rounded border border-neutral-200 bg-white px-2 py-2.5 text-base sm:border-transparent sm:bg-transparent sm:py-1.5 sm:text-[13px] sm:hover:border-neutral-200 focus:border-neutral-900 focus:bg-white focus-visible:outline-none";

const NEW_FIELD =
  "w-full rounded border border-neutral-300 bg-white px-2 py-2.5 text-base sm:py-1.5 sm:text-[13px] focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none";

/** Salva ao sair do campo (texto) ou ao escolher (lista). Sem botão de
 * salvar: a tabela é pra ir anotando enquanto se navega, e um botão por linha
 * vira trabalho de digitação que ninguém faz. */
function save(element: HTMLInputElement | HTMLSelectElement) {
  element.form?.requestSubmit();
}

/** O rótulo só existe no celular; no monitor quem nomeia é o cabeçalho. */
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-0.5 block text-[11px] font-medium tracking-wide text-neutral-400 uppercase sm:hidden">
        {label}
      </span>
      {children}
    </label>
  );
}

export function RadarTable({
  companies,
  sectors,
  templates,
}: {
  companies: RadarCompany[];
  /** Ramos já usados, somados às sugestões fixas. */
  sectors: string[];
  /** Modelos de mensagem; o gerador aparece na linha aberta. */
  templates: MessageTemplate[];
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
        className="mb-5 grid gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3 sm:grid-cols-3 lg:grid-cols-4"
      >
        <input
          name="company"
          required
          placeholder="Nome da empresa"
          aria-label="Nome da empresa"
          className={NEW_FIELD}
        />
        <input
          name="sector"
          list="radar-ramos"
          placeholder="Ramo"
          aria-label="Ramo"
          className={NEW_FIELD}
        />
        <input
          name="instagram"
          placeholder="@instagram"
          aria-label="Instagram"
          className={NEW_FIELD}
        />
        <select
          name="produces_content"
          aria-label="Produz conteúdo?"
          defaultValue=""
          className={NEW_FIELD}
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
          className={NEW_FIELD}
        />
        <input
          name="comms_name"
          placeholder="Responsável pela comunicação"
          aria-label="Responsável pela comunicação"
          className={NEW_FIELD}
        />
        <input
          name="referral"
          placeholder="Ponto de contato / indicação"
          aria-label="Ponto de contato ou indicação"
          className={NEW_FIELD}
        />
        {/* Alto o bastante pra acertar com o polegar em pé no meio da rua. */}
        <button
          type="submit"
          className="min-h-11 rounded bg-neutral-900 px-3 text-sm font-medium text-white hover:bg-neutral-700 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Adicionar
        </button>
      </form>

      {companies.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-500">
          Nenhuma empresa no radar ainda.
        </p>
      ) : (
        <>
          <p className="mb-2 text-xs text-neutral-400 sm:hidden">
            {companies.length === 1
              ? "1 empresa"
              : `${companies.length} empresas`}{" "}
            · toque para editar, sai do campo e já salva
          </p>

          {/* No monitor a grade rola dentro da própria caixa, pra página nunca
              rolar de lado; no celular cada linha é um cartão e não rola nada. */}
          <div className="sm:overflow-x-auto sm:rounded-lg sm:border sm:border-neutral-200">
            <div className="sm:min-w-[68rem]">
              <div
                className={`hidden bg-neutral-50 px-1.5 py-2 text-[11px] font-semibold tracking-wide text-neutral-400 uppercase ${COLUMNS}`}
              >
                <span>Empresa</span>
                <span>Ramo</span>
                <span>Instagram</span>
                <span>Produz conteúdo?</span>
                <span>Contato</span>
                <span>Responsável</span>
                <span>Indicação</span>
                <span className="text-right">Ações</span>
              </div>

              <ul className="space-y-3 sm:space-y-0">
                {companies.map((row) => {
                  const handle = instagramHandle(row.instagram);
                  return (
                    <li key={row.id}>
                      <form
                        action={updateRadarAction}
                        className={`space-y-2 rounded-lg border border-neutral-200 bg-white p-3 sm:space-y-0 sm:rounded-none sm:border-0 sm:border-t sm:border-neutral-100 sm:p-1.5 ${COLUMNS}`}
                      >
                        <input type="hidden" name="id" value={row.id} />
                        <input type="hidden" name="notes" value={row.notes} />

                        <Field label="Empresa">
                          <input
                            name="company"
                            defaultValue={row.company}
                            onBlur={(event) => save(event.currentTarget)}
                            className={`${CELL} font-semibold`}
                          />
                        </Field>

                        <Field label="Ramo">
                          <input
                            name="sector"
                            list="radar-ramos"
                            defaultValue={row.sector}
                            onBlur={(event) => save(event.currentTarget)}
                            className={CELL}
                          />
                        </Field>

                        <div className="min-w-0">
                          <Field label="Instagram">
                            <input
                              name="instagram"
                              defaultValue={row.instagram}
                              onBlur={(event) => save(event.currentTarget)}
                              className={CELL}
                            />
                          </Field>
                          {handle ? (
                            <a
                              href={`https://instagram.com/${handle}`}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-0.5 inline-block px-1 text-xs text-neutral-400 hover:text-neutral-900 hover:underline focus-visible:outline-none sm:text-[11px]"
                            >
                              abrir @{handle}
                            </a>
                          ) : null}
                        </div>

                        <Field label="Produz conteúdo?">
                          <select
                            name="produces_content"
                            defaultValue={row.produces_content}
                            onChange={(event) => save(event.currentTarget)}
                            className={CELL}
                          >
                            {PRODUCES_CONTENT.map((value) => (
                              <option key={value} value={value}>
                                {PRODUCES_CONTENT_LABELS[value]}
                              </option>
                            ))}
                          </select>
                        </Field>

                        <Field label="Contato">
                          <input
                            name="contact"
                            defaultValue={row.contact}
                            onBlur={(event) => save(event.currentTarget)}
                            className={CELL}
                          />
                        </Field>

                        <Field label="Responsável pela comunicação">
                          <input
                            name="comms_name"
                            defaultValue={row.comms_name}
                            onBlur={(event) => save(event.currentTarget)}
                            className={CELL}
                          />
                        </Field>

                        <Field label="Ponto de contato / indicação">
                          <input
                            name="referral"
                            defaultValue={row.referral}
                            onBlur={(event) => save(event.currentTarget)}
                            className={CELL}
                          />
                        </Field>

                        <div className="pt-1 sm:pt-0 sm:text-right">
                          <button
                            formAction={deleteRadarAction}
                            aria-label={`Apagar ${row.company || "empresa"}`}
                            onClick={(event) => {
                              if (
                                !confirm(
                                  `Apagar ${row.company || "esta empresa"} do radar?`
                                )
                              )
                                event.preventDefault();
                            }}
                            className="min-h-11 rounded px-2 text-sm text-neutral-500 hover:bg-red-50 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none sm:min-h-0 sm:py-1 sm:text-[12px]"
                          >
                            Apagar
                          </button>
                        </div>
                      </form>

                      {/* Fora do <form> de propósito: o textarea da mensagem
                          entraria no salvamento automático da linha e o
                          gerador viraria um campo do cadastro. Fechado por
                          padrão — a tela é uma lista pra varrer, não uma
                          pilha de rascunhos abertos. */}
                      <details className="px-3 pb-2 sm:px-1.5">
                        <summary className="cursor-pointer text-[12px] text-neutral-500 hover:text-neutral-900">
                          Escrever mensagem
                        </summary>
                        <MessageBox
                          templates={templates}
                          suggested={suggestForCompany()}
                          vars={companyVars(row)}
                          phone={row.contact}
                          profileUrl={
                            handle ? `https://instagram.com/${handle}` : undefined
                          }
                          compact
                          storageKey={row.id}
                        />
                      </details>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </>
      )}
    </>
  );
}
