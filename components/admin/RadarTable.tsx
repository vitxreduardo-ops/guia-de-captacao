"use client";

import { useMemo, useRef, useState } from "react";
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
  matchesSearch,
  type RadarCompany,
} from "@/lib/prospectTypes";

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

type Coluna =
  | "company"
  | "sector"
  | "instagram"
  | "produces_content"
  | "contact"
  | "comms_name"
  | "referral";

type Ordem = { coluna: Coluna; desc: boolean };

const COLUNAS: { chave: Coluna; rotulo: string }[] = [
  { chave: "company", rotulo: "Empresa" },
  { chave: "sector", rotulo: "Ramo" },
  { chave: "instagram", rotulo: "Instagram" },
  { chave: "produces_content", rotulo: "Produz conteúdo?" },
  { chave: "contact", rotulo: "Contato" },
  { chave: "comms_name", rotulo: "Responsável" },
  { chave: "referral", rotulo: "Indicação" },
];

/**
 * A busca varre a linha inteira, inclusive as notas.
 *
 * Quem procura no radar lembra de um pedaço solto — "aquela de Barreiras", "a
 * que a Keila indicou" —, e não da coluna onde ele está. Campo a campo, a
 * busca só acharia o que já se sabia onde estava.
 */
function filtrar(companies: RadarCompany[], busca: string): RadarCompany[] {
  if (!busca.trim()) return companies;

  return companies.filter((row) =>
    matchesSearch(
      [
        row.company,
        row.sector,
        row.instagram,
        row.contact,
        row.comms_name,
        row.referral,
        row.notes,
        PRODUCES_CONTENT_LABELS[row.produces_content],
      ].join(" "),
      busca
    )
  );
}

/** Campo vazio vai sempre pro fim, nos dois sentidos: ordenar por "quem
 *  indicou" existe pra ver quem tem indicação, e meia tela de traços no topo
 *  não é resposta nenhuma. */
function ordenar(companies: RadarCompany[], ordem: Ordem): RadarCompany[] {
  const lidos = companies.map((row) => ({
    row,
    valor:
      ordem.coluna === "produces_content"
        ? PRODUCES_CONTENT_LABELS[row.produces_content].trim()
        : String(row[ordem.coluna] ?? "").trim(),
  }));

  lidos.sort((a, b) => {
    if (!a.valor && !b.valor) return 0;
    if (!a.valor) return 1;
    if (!b.valor) return -1;
    const comparado = a.valor.localeCompare(b.valor, "pt-BR", {
      sensitivity: "base",
    });
    return ordem.desc ? -comparado : comparado;
  });

  return lidos.map((item) => item.row);
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
}: {
  companies: RadarCompany[];
  /** Ramos já usados, somados às sugestões fixas. */
  sectors: string[];
}) {
  const newForm = useRef<HTMLFormElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState<Ordem>({ coluna: "company", desc: false });

  const visiveis = useMemo(
    () => ordenar(filtrar(companies, busca), ordem),
    [companies, busca, ordem]
  );

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

      {/* Busca e cadastro na mesma linha: procurar é o que mais se faz aqui,
          anotar empresa nova é o que menos. O formulário inteiro no topo
          empurrava a lista pra baixo em toda visita. */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
          placeholder="Buscar empresa, ramo, indicação…"
          aria-label="Buscar no radar"
          className="min-w-0 flex-1 rounded-md border border-neutral-300 px-3 py-2 text-base sm:py-1.5 sm:text-sm focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none"
        />
        <button
          type="button"
          onClick={() => dialog.current?.showModal()}
          className="min-h-11 rounded-md bg-neutral-900 px-3 text-sm font-medium text-white hover:bg-neutral-700 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none sm:min-h-0 sm:py-2"
        >
          Nova empresa
        </button>
      </div>

      {busca ? (
        <p className="mb-2 text-xs text-neutral-500">
          {visiveis.length === 1
            ? "1 empresa encontrada"
            : `${visiveis.length} empresas encontradas`}{" "}
          de {companies.length}.
        </p>
      ) : null}

      {/* `<dialog>` nativo: já vem com foco preso dentro, Esc que fecha e
          fundo escurecido — os três pedaços que uma janela feita à mão erra,
          e nenhum deles é o assunto desta tela. */}
      <dialog
        ref={dialog}
        aria-label="Nova empresa no radar"
        onClick={(event) => {
          // Clique no fundo fecha; clique no cartão não. O alvo ser o próprio
          // <dialog> só acontece no fundo, já que o cartão é filho.
          if (event.target === dialog.current) dialog.current?.close();
        }}
        className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-xl border border-neutral-200 bg-white p-0 shadow-xl backdrop:bg-neutral-900/40"
      >
        <form
          ref={newForm}
          action={async (formData) => {
            await createRadarAction(formData);
            newForm.current?.reset();
            dialog.current?.close();
          }}
          className="space-y-2 p-4"
        >
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-900">
              Nova empresa
            </h2>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              aria-label="Fechar"
              className="min-h-10 px-2 text-sm text-neutral-500 hover:text-neutral-900 sm:min-h-0"
            >
              Fechar
            </button>
          </div>

        {/* O foco inicial é do nome, não do botão Fechar: sem isto o
            `<dialog>` foca o primeiro focável, que é a saída. */}
        <input
          name="company"
          required
          autoFocus
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
            className="min-h-11 w-full rounded bg-neutral-900 px-3 text-sm font-medium text-white hover:bg-neutral-700 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Adicionar
          </button>
        </form>
      </dialog>

      {visiveis.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-500">
          {busca
            ? "Nada encontrado com esse termo."
            : "Nenhuma empresa no radar ainda."}
        </p>
      ) : (
        <>
          <p className="mb-2 text-xs text-neutral-400 sm:hidden">
            {visiveis.length === 1
              ? "1 empresa"
              : `${visiveis.length} empresas`}{" "}
            · toque para editar, sai do campo e já salva
          </p>

          {/* No monitor a grade rola dentro da própria caixa, pra página nunca
              rolar de lado; no celular cada linha é um cartão e não rola nada. */}
          <div className="sm:overflow-x-auto sm:rounded-lg sm:border sm:border-neutral-200">
            <div className="sm:min-w-[68rem]">
              <div
                className={`hidden bg-neutral-50 px-1.5 py-2 text-[11px] font-semibold tracking-wide text-neutral-400 uppercase ${COLUMNS}`}
              >
                {COLUNAS.map((coluna) => {
                  const atual = ordem.coluna === coluna.chave;
                  return (
                    <button
                      key={coluna.chave}
                      type="button"
                      onClick={() =>
                        setOrdem((anterior) =>
                          anterior.coluna === coluna.chave
                            ? { coluna: coluna.chave, desc: !anterior.desc }
                            : { coluna: coluna.chave, desc: false }
                        )
                      }
                      // `aria-sort` mora no cabeçalho de tabela de verdade;
                      // aqui é grade, então o estado vai pelo rótulo lido.
                      aria-label={`Ordenar por ${coluna.rotulo}${
                        atual && !ordem.desc ? ", agora crescente" : ""
                      }${atual && ordem.desc ? ", agora decrescente" : ""}`}
                      className={`flex items-center gap-1 text-left uppercase hover:text-neutral-700 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none ${
                        atual ? "text-neutral-900" : ""
                      }`}
                    >
                      <span className="truncate">{coluna.rotulo}</span>
                      <span aria-hidden="true" className="shrink-0">
                        {atual ? (ordem.desc ? "↓" : "↑") : "↕"}
                      </span>
                    </button>
                  );
                })}
                <span className="text-right">Ações</span>
              </div>

              <ul className="space-y-3 sm:space-y-0">
                {visiveis.map((row) => {
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
