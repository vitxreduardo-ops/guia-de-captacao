"use client";

import { useMemo, useRef, useState } from "react";
import { ContractBody } from "@/components/contract/ContractBody";
import {
  contractBlocks,
  joinClauses,
  renderContractBody,
  splitClauses,
  type ContractClause,
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

// Só precisa ser único entre as cláusulas da tela, então um contador do módulo
// basta.
let ultimoId = 0;
const novoId = () => ++ultimoId;

const campo =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none disabled:bg-neutral-100 disabled:text-neutral-500";
const rotulo = "mb-1 block text-xs font-medium text-neutral-600";

/** Mesma regra do servidor: aceita "2.500,00" e "2500.00". Só alimenta a
 *  prévia — quem grava é `updateContractAction`. */
function priceFromText(texto: string) {
  const limpo = texto.trim().replace(/[^\d,.-]/g, "");
  if (!limpo) return 0;
  const n = Number(
    limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo,
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
  // Cada cláusula tem um id próprio: com o índice como chave, apagar uma do
  // meio faria o React reaproveitar o campo da vizinha.
  const [clausulas, setClausulas] = useState(() =>
    splitClauses(contract.body).map((c) => ({ ...c, id: novoId() })),
  );
  const [abertas, setAbertas] = useState<number[]>([]);
  const [editou, setEditou] = useState(false);
  // Até a primeira edição vale o corpo salvo, byte a byte: abrir e salvar sem
  // mexer nas cláusulas não pode reformatar o contrato.
  const body = editou ? joinClauses(clausulas) : contract.body;
  const [vars, setVars] = useState<ContractVars>(contract);
  const [ativa, setAtiva] = useState<number | null>(null);
  const documento = useRef<HTMLDivElement>(null);
  const painel = useRef<HTMLDivElement>(null);

  type Bloco = ContractClause & { id: number };
  function mudar(proximas: Bloco[]) {
    setEditou(true);
    setClausulas(proximas);
  }
  function editar(id: number, parte: Partial<ContractClause>) {
    mudar(clausulas.map((c) => (c.id === id ? { ...c, ...parte } : c)));
  }
  function alternar(id: number) {
    setAbertas((a) =>
      a.includes(id) ? a.filter((x) => x !== id) : [...a, id],
    );
  }
  function adicionar() {
    const id = novoId();
    mudar([...clausulas, { id, title: "", text: "" }]);
    setAbertas((a) => [...a, id]);
  }

  const preview = useMemo(() => renderContractBody(body, vars), [body, vars]);

  // As cláusulas são os blocos `## ` — a mesma regra do `ContractBody`, então
  // o índice aqui é o índice do <h2> desenhado.
  const titulos = useMemo(
    () =>
      contractBlocks(preview)
        .filter((bloco) => bloco.startsWith("## "))
        .map((bloco) => bloco.slice(3)),
    [preview],
  );
  const ehAnexo = (titulo: string) => /^anexo/i.test(titulo);

  function irPara(indice: number) {
    setAtiva(indice);
    // O sumário só lista cláusulas com título, e a abertura (sem título) vem
    // antes delas na lista de blocos.
    const titulados = clausulas.filter((c) => c.title !== null);
    const alvo = titulados[indice];
    if (alvo) {
      setAbertas((a) => (a.includes(alvo.id) ? a : [...a, alvo.id]));
      setTimeout(
        () =>
          painel.current
            ?.querySelector(`[data-clausula="${alvo.id}"]`)
            ?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
        0,
      );
    }
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

  const itensClausulas = titulos
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
                {itensClausulas.map((t) => itemSumario(t.titulo, t.indice))}
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

      <div
        ref={painel}
        className="space-y-6 rounded-lg border border-neutral-200 bg-white p-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto"
      >
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
            <input type="hidden" name="body" value={body} />
            <ul className="space-y-2">
              {clausulas.map((c) => {
                const aberta = abertas.includes(c.id);
                const linhas = Math.min(
                  24,
                  Math.max(4, c.text.split("\n").length + 1),
                );
                return (
                  <li
                    key={c.id}
                    data-clausula={c.id}
                    className="rounded-md border border-neutral-200"
                  >
                    <div className="flex items-center gap-1 p-1">
                      <button
                        type="button"
                        onClick={() => alternar(c.id)}
                        aria-expanded={aberta}
                        aria-label={aberta ? "Recolher" : "Expandir"}
                        className="rounded px-1.5 py-1 text-xs text-neutral-500 hover:bg-neutral-100"
                      >
                        {aberta ? "▾" : "▸"}
                      </button>
                      {c.title === null ? (
                        <span className="flex-1 px-1 text-xs font-medium text-neutral-600">
                          Abertura
                        </span>
                      ) : (
                        <input
                          value={c.title}
                          onChange={(e) =>
                            editar(c.id, { title: e.target.value })
                          }
                          placeholder="Título da cláusula"
                          aria-label="Título da cláusula"
                          className="min-w-0 flex-1 rounded border border-transparent px-1 py-1 text-xs font-medium text-neutral-900 hover:border-neutral-200 focus:border-neutral-400 focus:outline-none"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          mudar(clausulas.filter((x) => x.id !== c.id))
                        }
                        aria-label="Remover cláusula"
                        className="rounded px-1.5 py-1 text-xs text-neutral-400 hover:bg-red-50 hover:text-red-600"
                      >
                        ✕
                      </button>
                    </div>
                    {aberta ? (
                      <textarea
                        value={c.text}
                        onChange={(e) => editar(c.id, { text: e.target.value })}
                        rows={linhas}
                        aria-label="Texto da cláusula"
                        className={`${campo} rounded-t-none border-x-0 border-b-0 font-mono text-xs leading-relaxed`}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              onClick={adicionar}
              className="mt-2 rounded-md border border-dashed border-neutral-300 px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50"
            >
              + Adicionar cláusula
            </button>
            <p className="mt-2 text-xs text-neutral-500">
              Dentro de cada cláusula: <code>**texto**</code> fica em negrito.
              As chaves duplas são trocadas pelos campos acima na hora de
              exibir.
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
