"use client";

import { useMemo, useRef, useState } from "react";
import { ContractBody } from "@/components/contract/ContractBody";
import { Interruptor, PieceEditor } from "@/components/admin/ContractPieces";
import {
  clauseTitleText,
  joinClauses,
  layoutContract,
  parseClauseTitle,
  parsePieces,
  piecesToText,
  renderContractBody,
  splitClauses,
  type ContractPiece,
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

type Peca = ContractPiece & { pid: number };
type Clausula = {
  id: number;
  title: string | null;
  off: boolean;
  pieces: Peca[];
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

const ehAnexo = (titulo: string | null) => /^anexo/i.test(titulo ?? "");

/** O número que a cláusula tem no texto digitado ("Cláusula 7" -> "7"). */
const numeroDe = (titulo: string | null) =>
  titulo?.match(/^Cláusula\s+(\d+)/)?.[1] ?? null;

function lerClausulas(body: string): Clausula[] {
  return splitClauses(body).map((c) => {
    const { title, off } = parseClauseTitle(c.title);
    return {
      id: novoId(),
      title,
      off,
      pieces: parsePieces(c.text).map((p) => ({ ...p, pid: novoId() })),
    };
  });
}

function juntarClausulas(clausulas: Clausula[]) {
  return joinClauses(
    clausulas.map((c) => ({
      title: clauseTitleText(c.title, c.off),
      text: piecesToText(c.pieces),
    })),
  );
}

export function ContractEditor({ contract }: { contract: Contract }) {
  const travado = contract.status === "signed";
  // Cada cláusula e cada peça tem id próprio: com o índice como chave, apagar
  // uma do meio faria o React reaproveitar o campo da vizinha.
  const [clausulas, setClausulas] = useState(() => lerClausulas(contract.body));
  const [abertas, setAbertas] = useState<number[]>([]);
  const [editou, setEditou] = useState(false);
  // Até a primeira edição vale o corpo salvo, byte a byte: abrir e salvar sem
  // mexer nas cláusulas não pode reformatar o contrato.
  const body = editou ? juntarClausulas(clausulas) : contract.body;
  const [vars, setVars] = useState<ContractVars>(contract);
  const [ativa, setAtiva] = useState<number | null>(null);
  const documento = useRef<HTMLDivElement>(null);
  const painel = useRef<HTMLDivElement>(null);

  const preview = useMemo(() => renderContractBody(body, vars), [body, vars]);
  const layout = useMemo(() => layoutContract(clausulas), [clausulas]);

  function mudar(proximas: Clausula[]) {
    setEditou(true);
    setClausulas(proximas);
  }
  function editar(id: number, parte: Partial<Clausula>) {
    mudar(clausulas.map((c) => (c.id === id ? { ...c, ...parte } : c)));
  }
  function editarPeca(id: number, pid: number, peca: ContractPiece | null) {
    mudar(
      clausulas.map((c) =>
        c.id !== id
          ? c
          : {
              ...c,
              pieces: c.pieces.flatMap((p) =>
                p.pid !== pid ? [p] : peca ? [{ ...peca, pid }] : [],
              ),
            },
      ),
    );
  }
  function alternar(id: number) {
    setAbertas((a) =>
      a.includes(id) ? a.filter((x) => x !== id) : [...a, id],
    );
  }
  function abrir(id: number) {
    setAbertas((a) => (a.includes(id) ? a : [...a, id]));
  }
  function adicionarPeca(c: Clausula, nova: ContractPiece) {
    editar(c.id, { pieces: [...c.pieces, { ...nova, pid: novoId() }] });
    abrir(c.id);
  }
  function adicionarItem(c: Clausula) {
    const n = numeroDe(c.title);
    if (!n) return;
    const usados = c.pieces.flatMap((p) => {
      const m = p.kind === "text" ? p.num?.match(/^\d+\.(\d+)$/) : null;
      return m ? [Number(m[1])] : [];
    });
    const proximo = (usados.length ? Math.max(...usados) : 0) + 1;
    adicionarPeca(c, {
      kind: "text",
      text: "",
      num: `${n}.${proximo}`,
      off: false,
    });
  }
  function adicionarClausula(anexo: boolean) {
    const id = novoId();
    const numeros = clausulas.flatMap((c) => {
      const n = numeroDe(c.title);
      return n ? [Number(n)] : [];
    });
    const qtdAnexos = clausulas.filter((c) => ehAnexo(c.title)).length;
    const nova: Clausula = {
      id,
      title: anexo
        ? `Anexo ${qtdAnexos + 1} — `
        : `Cláusula ${(numeros.length ? Math.max(...numeros) : 0) + 1} — `,
      off: false,
      pieces: [],
    };
    // Cláusula nova entra antes dos anexos; anexo novo, no fim.
    const primeiroAnexo = clausulas.findIndex((c) => ehAnexo(c.title));
    const em = anexo || primeiroAnexo === -1 ? clausulas.length : primeiroAnexo;
    mudar([...clausulas.slice(0, em), nova, ...clausulas.slice(em)]);
    abrir(id);
  }

  // Posição de cada cláusula ligada entre os <h2> da prévia: desligada não
  // desenha título, então não conta.
  const posicaoNaPrevia = new Map<number, number>();
  clausulas.forEach((c, i) => {
    if (c.title !== null && layout.clauses[i].on) {
      posicaoNaPrevia.set(c.id, posicaoNaPrevia.size);
    }
  });

  /** O título como o cliente lê: com o número depois de fechar os buracos. */
  function tituloExibido(c: Clausula, i: number) {
    const n = layout.clauses[i].num;
    return n !== null && c.title
      ? c.title.replace(/^Cláusula\s+\d+/, `Cláusula ${n}`)
      : (c.title ?? "");
  }

  function irPara(c: Clausula) {
    setAtiva(c.id);
    abrir(c.id);
    setTimeout(() => {
      painel.current
        ?.querySelector(`[data-clausula="${c.id}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 0);
    const pos = posicaoNaPrevia.get(c.id);
    if (pos !== undefined) {
      documento.current
        ?.querySelectorAll("h2")
        [pos]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  const titulados = clausulas
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c.title !== null);
  const abertura = clausulas
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c.title === null);
  const soClausulas = titulados.filter(({ c }) => !ehAnexo(c.title));
  const soAnexos = titulados.filter(({ c }) => ehAnexo(c.title));

  const itemSumario = ({ c, i }: { c: Clausula; i: number }) => (
    <li key={c.id} className="flex items-start gap-1.5">
      <span className="pt-1.5">
        <Interruptor
          ligado={!c.off}
          rotulo={`${c.title} no contrato`}
          onChange={(ligado) => editar(c.id, { off: !ligado })}
        />
      </span>
      <button
        type="button"
        onClick={() => irPara(c)}
        className={`min-w-0 flex-1 rounded px-1.5 py-1 text-left text-xs leading-snug hover:bg-neutral-100 ${
          ativa === c.id
            ? "bg-neutral-100 font-semibold text-neutral-900"
            : "text-neutral-600"
        } ${c.off ? "line-through opacity-50" : ""}`}
      >
        {tituloExibido(c, i)}
      </button>
    </li>
  );

  const blocoClausula = (
    { c, i }: { c: Clausula; i: number },
    anexo?: number,
  ) => {
    const aberta = abertas.includes(c.id);
    const numerada = numeroDe(c.title) !== null;
    return (
      <li
        key={c.id}
        data-clausula={c.id}
        className={`rounded-md border border-neutral-200 ${
          c.off ? "bg-neutral-50" : ""
        }`}
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
          {anexo !== undefined ? (
            <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 uppercase">
              Anexo {anexo}
            </span>
          ) : null}
          {c.title === null ? (
            <span className="min-w-0 flex-1 px-1 text-xs font-medium text-neutral-600">
              Abertura
            </span>
          ) : (
            <input
              value={c.title ?? ""}
              onChange={(e) => editar(c.id, { title: e.target.value })}
              placeholder="Título"
              aria-label="Título"
              className={`min-w-0 flex-1 rounded border border-transparent px-1 py-1 text-xs font-medium hover:border-neutral-200 focus:border-neutral-400 focus:outline-none ${
                c.off ? "text-neutral-400 line-through" : "text-neutral-900"
              }`}
            />
          )}
          {c.title === null ? null : (
            <Interruptor
              ligado={!c.off}
              rotulo={`${c.title} no contrato`}
              onChange={(ligado) => editar(c.id, { off: !ligado })}
            />
          )}
          <button
            type="button"
            onClick={() => {
              if (confirm(`Remover "${c.title}" e todo o texto dela?`)) {
                mudar(clausulas.filter((x) => x.id !== c.id));
              }
            }}
            aria-label="Remover"
            className="rounded px-1.5 py-1 text-xs text-neutral-400 hover:bg-red-50 hover:text-red-600"
          >
            ✕
          </button>
        </div>
        {aberta ? (
          <div className="space-y-2 border-t border-neutral-200 p-2">
            {c.pieces.length === 0 ? (
              <p className="text-xs text-neutral-400">
                Vazio. Adicione um parágrafo, item, tabela ou lista abaixo.
              </p>
            ) : null}
            {c.pieces.map((p, j) => (
              <PieceEditor
                key={p.pid}
                piece={p}
                label={layout.clauses[i].pieces[j]?.label ?? null}
                on={layout.clauses[i].pieces[j]?.on ?? true}
                onChange={(nova) => editarPeca(c.id, p.pid, nova)}
                onRemove={() => editarPeca(c.id, p.pid, null)}
              />
            ))}
            <div className="flex flex-wrap gap-1 pt-1">
              {numerada ? (
                <button
                  type="button"
                  onClick={() => adicionarItem(c)}
                  className="rounded border border-dashed border-neutral-300 px-2 py-1 text-[11px] text-neutral-600 hover:bg-neutral-50"
                >
                  + Item numerado
                </button>
              ) : null}
              <button
                type="button"
                onClick={() =>
                  adicionarPeca(c, {
                    kind: "text",
                    text: "",
                    num: null,
                    off: false,
                  })
                }
                className="rounded border border-dashed border-neutral-300 px-2 py-1 text-[11px] text-neutral-600 hover:bg-neutral-50"
              >
                + Parágrafo
              </button>
              <button
                type="button"
                onClick={() =>
                  adicionarPeca(c, {
                    kind: "table",
                    rows: [
                      ["Item", "Descrição"],
                      ["", ""],
                    ],
                  })
                }
                className="rounded border border-dashed border-neutral-300 px-2 py-1 text-[11px] text-neutral-600 hover:bg-neutral-50"
              >
                + Tabela
              </button>
              <button
                type="button"
                onClick={() => adicionarPeca(c, { kind: "list", items: [""] })}
                className="rounded border border-dashed border-neutral-300 px-2 py-1 text-[11px] text-neutral-600 hover:bg-neutral-50"
              >
                + Lista
              </button>
            </div>
          </div>
        ) : null}
      </li>
    );
  };

  return (
    <form
      id="contract-editor"
      action={updateContractAction}
      onChange={(e) => {
        const dados = new FormData(e.currentTarget);
        setVars(varsFromForm(dados));
      }}
      className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_380px]"
    >
      <input type="hidden" name="id" value={contract.id} />

      <aside className="rounded-lg border border-neutral-200 bg-white p-3 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto">
        <details open className="group">
          <summary className="cursor-pointer text-xs font-semibold tracking-wide text-neutral-500 uppercase lg:cursor-default">
            Sumário
          </summary>
          {titulados.length === 0 ? (
            <p className="mt-2 text-xs text-neutral-500">
              Sem cláusulas ainda. Adicione uma no painel ao lado.
            </p>
          ) : (
            <>
              <ul className="mt-2 space-y-0.5">
                {soClausulas.map(itemSumario)}
              </ul>
              {soAnexos.length > 0 ? (
                <>
                  <p className="mt-3 mb-1 text-[10px] font-semibold tracking-wide text-neutral-400 uppercase">
                    Anexos
                  </p>
                  <ul className="space-y-0.5">{soAnexos.map(itemSumario)}</ul>
                </>
              ) : null}
              <p className="mt-3 text-[10px] leading-snug text-neutral-400">
                A chave liga e desliga no contrato. Desligado, some do texto e a
                numeração fecha o buraco.
              </p>
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
              {[...abertura, ...soClausulas].map((x) => blocoClausula(x))}
            </ul>
            <button
              type="button"
              onClick={() => adicionarClausula(false)}
              className="mt-2 rounded-md border border-dashed border-neutral-300 px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50"
            >
              + Adicionar cláusula
            </button>

            <h2 className="mt-6 mb-3 text-sm font-semibold text-neutral-900">
              Anexos
            </h2>
            <ul className="space-y-2">
              {soAnexos.map((x, n) => blocoClausula(x, n + 1))}
            </ul>
            <button
              type="button"
              onClick={() => adicionarClausula(true)}
              className="mt-2 rounded-md border border-dashed border-neutral-300 px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50"
            >
              + Adicionar anexo
            </button>

            <p className="mt-2 text-xs text-neutral-500">
              Dentro dos textos, <code>**texto**</code> fica em negrito. As
              chaves duplas são trocadas pelos campos acima na hora de exibir.
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
