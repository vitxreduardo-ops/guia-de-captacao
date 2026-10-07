"use client";

import { useMemo, useRef, useState } from "react";
import { ContractBody } from "@/components/contract/ContractBody";
import {
  contractBlocks,
  renderContractBody,
  type ContractVars,
} from "@/lib/contractBody";
import { updateContractAction } from "@/app/admin/contratos/[id]/actions";

type Contract = ContractVars & {
  id: string;
  title: string;
  kind: string;
  client_email: string;
  client_address: string;
  body: string;
  status: string;
};

const campo =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none disabled:bg-neutral-100 disabled:text-neutral-500";
const rotulo = "mb-1 block text-xs font-medium text-neutral-600";

/** Mesma regra do servidor: aceita "2.500,00" e "2500.00". Só alimenta a
 *  prévia — quem grava é `updateContractAction`. */
function priceFromText(texto: string) {
  const limpo = texto.trim().replace(/[^\d,.-]/g, "");
  if (!limpo) return 0;
  const n = Number(
    limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo
  );
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function varsFromForm(form: FormData): ContractVars {
  const texto = (nome: string) => String(form.get(nome) ?? "");
  const meses = Number(texto("duration_months"));
  return {
    client_name: texto("client_name"),
    client_document: texto("client_document"),
    scope: texto("scope"),
    price: priceFromText(texto("price")),
    payment_terms: texto("payment_terms"),
    start_date: texto("start_date") || null,
    duration_months: meses > 0 ? Math.trunc(meses) : null,
  };
}

export function ContractEditor({ contract }: { contract: Contract }) {
  const travado = contract.status === "signed";
  const [body, setBody] = useState(contract.body);
  const [vars, setVars] = useState<ContractVars>(contract);
  const [ativa, setAtiva] = useState<number | null>(null);
  const documento = useRef<HTMLDivElement>(null);

  const preview = useMemo(() => renderContractBody(body, vars), [body, vars]);

  // As cláusulas são os blocos `## ` — a mesma regra do `ContractBody`, então
  // o índice aqui é o índice do <h2> desenhado.
  const titulos = useMemo(
    () =>
      contractBlocks(preview)
        .filter((bloco) => bloco.startsWith("## "))
        .map((bloco) => bloco.slice(3)),
    [preview]
  );
  const ehAnexo = (titulo: string) => /^anexo/i.test(titulo);

  function irPara(indice: number) {
    setAtiva(indice);
    documento.current
      ?.querySelectorAll("h2")
      [indice]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const itemSumario = (titulo: string, indice: number) => (
    <li key={indice}>
      <button
        type="button"
        onClick={() => irPara(indice)}
        className={`w-full rounded px-2 py-1 text-left text-xs leading-snug hover:bg-neutral-100 ${
          ativa === indice
            ? "bg-neutral-100 font-semibold text-neutral-900"
            : "text-neutral-600"
        }`}
      >
        {titulo}
      </button>
    </li>
  );

  const clausulas = titulos
    .map((titulo, indice) => ({ titulo, indice }))
    .filter((t) => !ehAnexo(t.titulo));
  const anexos = titulos
    .map((titulo, indice) => ({ titulo, indice }))
    .filter((t) => ehAnexo(t.titulo));

  return (
    <form
      id="contract-editor"
      action={updateContractAction}
      onChange={(e) => {
        const dados = new FormData(e.currentTarget);
        setBody(String(dados.get("body") ?? ""));
        setVars(varsFromForm(dados));
      }}
      className="grid gap-4 lg:grid-cols-[200px_minmax(0,1fr)_340px]"
    >
      <input type="hidden" name="id" value={contract.id} />

      <aside className="rounded-lg border border-neutral-200 bg-white p-3 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto">
        <details open className="group">
          <summary className="cursor-pointer text-xs font-semibold tracking-wide text-neutral-500 uppercase lg:cursor-default">
            Sumário
          </summary>
          {titulos.length === 0 ? (
            <p className="mt-2 text-xs text-neutral-500">
              Sem cláusulas ainda. Abra uma com <code>##</code>.
            </p>
          ) : (
            <>
              <ul className="mt-2 space-y-0.5">
                {clausulas.map((t) => itemSumario(t.titulo, t.indice))}
              </ul>
              {anexos.length > 0 ? (
                <>
                  <p className="mt-3 mb-1 text-[10px] font-semibold tracking-wide text-neutral-400 uppercase">
                    Anexos
                  </p>
                  <ul className="space-y-0.5">
                    {anexos.map((t) => itemSumario(t.titulo, t.indice))}
                  </ul>
                </>
              ) : null}
            </>
          )}
        </details>
      </aside>

      <div
        ref={documento}
        className="rounded-lg border border-neutral-200 bg-[var(--tatu-beige)] p-6"
      >
        <p className="mb-4 text-xs font-medium tracking-wide text-neutral-500 uppercase">
          Como o cliente vê
        </p>
        {body.trim() ? (
          <ContractBody text={preview} />
        ) : (
          <p className="text-sm text-neutral-500">
            O corpo está vazio. Escreva as cláusulas ao lado.
          </p>
        )}
      </div>

      <div className="space-y-6 rounded-lg border border-neutral-200 bg-white p-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto">
        {travado ? (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            Contrato assinado. O texto não muda mais — para alterar algo, crie
            um novo contrato.
          </p>
        ) : null}

        <fieldset disabled={travado} className="space-y-6">
          <div>
            <h2 className="mb-3 text-sm font-semibold text-neutral-900">
              Contrato
            </h2>
            <div className="space-y-3">
              <div>
                <label className={rotulo} htmlFor="title">
                  Nome interno (não aparece para o cliente)
                </label>
                <input
                  id="title"
                  name="title"
                  defaultValue={contract.title}
                  required
                  className={campo}
                />
              </div>
              <div>
                <label className={rotulo} htmlFor="kind">
                  Tipo
                </label>
                <select
                  id="kind"
                  name="kind"
                  defaultValue={contract.kind}
                  className={campo}
                >
                  <option value="mensal">Mensal</option>
                  <option value="freela">Projeto fechado</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold text-neutral-900">
              Quem contrata
            </h2>
            <div className="space-y-3">
              <div>
                <label className={rotulo} htmlFor="client_name">
                  Nome ou razão social
                </label>
                <input
                  id="client_name"
                  name="client_name"
                  defaultValue={contract.client_name}
                  className={campo}
                />
              </div>
              <div>
                <label className={rotulo} htmlFor="client_document">
                  CNPJ ou CPF
                </label>
                <input
                  id="client_document"
                  name="client_document"
                  defaultValue={contract.client_document}
                  className={campo}
                />
              </div>
              <div>
                <label className={rotulo} htmlFor="client_email">
                  E-mail
                </label>
                <input
                  id="client_email"
                  name="client_email"
                  type="email"
                  defaultValue={contract.client_email}
                  className={campo}
                />
              </div>
              <div>
                <label className={rotulo} htmlFor="client_address">
                  Endereço
                </label>
                <input
                  id="client_address"
                  name="client_address"
                  defaultValue={contract.client_address}
                  className={campo}
                />
              </div>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold text-neutral-900">
              O combinado
            </h2>
            <div className="space-y-3">
              <div>
                <label className={rotulo} htmlFor="scope">
                  Escopo — vira {"{{escopo}}"} no texto
                </label>
                <textarea
                  id="scope"
                  name="scope"
                  rows={4}
                  defaultValue={contract.scope}
                  placeholder="Quatro vídeos por mês, roteiro e edição inclusos."
                  className={campo}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <div>
                  <label className={rotulo} htmlFor="price">
                    Valor (R$)
                  </label>
                  <input
                    id="price"
                    name="price"
                    inputMode="decimal"
                    defaultValue={
                      contract.price > 0 ? String(contract.price) : ""
                    }
                    className={campo}
                  />
                </div>
                <div>
                  <label className={rotulo} htmlFor="start_date">
                    Início
                  </label>
                  <input
                    id="start_date"
                    name="start_date"
                    type="date"
                    defaultValue={contract.start_date ?? ""}
                    className={campo}
                  />
                </div>
                <div>
                  <label className={rotulo} htmlFor="duration_months">
                    Duração (meses)
                  </label>
                  <input
                    id="duration_months"
                    name="duration_months"
                    type="number"
                    min={1}
                    defaultValue={contract.duration_months ?? ""}
                    className={campo}
                  />
                </div>
              </div>
              <div>
                <label className={rotulo} htmlFor="payment_terms">
                  Condições de pagamento — vira {"{{pagamento}}"}
                </label>
                <textarea
                  id="payment_terms"
                  name="payment_terms"
                  rows={3}
                  defaultValue={contract.payment_terms}
                  placeholder="Pagamento todo dia 5, por PIX."
                  className={campo}
                />
              </div>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold text-neutral-900">
              Cláusulas
            </h2>
            <textarea
              id="body"
              name="body"
              rows={20}
              defaultValue={contract.body}
              className={`${campo} font-mono text-xs leading-relaxed`}
            />
            <p className="mt-1 text-xs text-neutral-500">
              Markdown: <code>##</code> abre uma cláusula,{" "}
              <code>**texto**</code> fica em negrito. As chaves duplas são
              trocadas pelos campos acima na hora de exibir.
            </p>
          </div>

          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Salvar contrato
          </button>
        </fieldset>
      </div>
    </form>
  );
}
