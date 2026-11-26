"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { BotaoAcao, Janela } from "@/components/admin/financeiro/Acoes";
import { BOTAO, CARTAO } from "@/components/admin/financeiro/ui";
import { formatBRL } from "@/lib/billingTypes";

const CAMPO =
  "min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-base focus:border-neutral-500 focus:outline-none";

interface Opcao {
  id: string;
  name: string;
  paymentDay: number | null;
}
interface Item {
  clientId: string;
  name: string;
  cents: number;
  dia: number;
  inicio?: string | null;
  fim?: string | null;
}
const dm = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
const periodo = (inicio?: string | null, fim?: string | null) =>
  `${inicio ? `desde ${dm(inicio)}` : ""}${fim ? ` até ${dm(fim)}` : inicio ? ", sem data de fim" : ""}`;
type Acao = (formData: FormData) => Promise<void>;

function Formulario({
  action,
  opcoes,
  atual,
  fechar,
}: {
  action: Acao;
  opcoes: Opcao[];
  atual?: Item;
  fechar: () => void;
}) {
  const [cliente, setCliente] = useState(atual?.clientId ?? opcoes[0]?.id ?? "");
  const [dia, setDia] = useState(atual ? String(atual.dia) : String(opcoes[0]?.paymentDay ?? ""));
  const [erro, setErro] = useState("");
  const [hoje] = useState(() => new Date().toLocaleDateString("sv-SE"));
  const [pending, start] = useTransition();

  if (!atual && opcoes.length === 0) {
    return <p className="text-base text-neutral-600">Todos os clientes ativos já estão na lista.</p>;
  }
  return (
    <form
      action={(f) =>
        start(async () => {
          try {
            await action(f);
            fechar();
          } catch (e) {
            setErro(e instanceof Error ? e.message : "Não foi possível salvar.");
          }
        })
      }
      className="grid gap-3"
    >
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-neutral-600">Cliente</span>
        {atual ? (
          <>
            <input type="hidden" name="cliente" value={atual.clientId} />
            <p className="flex min-h-11 items-center rounded-lg bg-neutral-100 px-3 text-base">{atual.name}</p>
          </>
        ) : (
          <select
            name="cliente"
            value={cliente}
            onChange={(e) => {
              setCliente(e.target.value);
              setDia(String(opcoes.find((o) => o.id === e.target.value)?.paymentDay ?? ""));
            }}
            className={CAMPO}
          >
            {opcoes.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        )}
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-neutral-600">Valor por mês</span>
          <input
            name="valor"
            inputMode="decimal"
            autoFocus
            defaultValue={atual ? (atual.cents / 100).toFixed(2).replace(".", ",") : ""}
            placeholder="R$ 0,00"
            className={CAMPO}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-neutral-600">Dia que cai</span>
          <input
            name="dia"
            type="number"
            min={1}
            max={31}
            value={dia}
            onChange={(e) => setDia(e.target.value)}
            placeholder="1 a 31"
            className={CAMPO}
          />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-neutral-600">Início do contrato</span>
          <input name="inicio" type="date" required defaultValue={atual?.inicio ?? hoje} className={CAMPO} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-neutral-600">Fim do contrato</span>
          <input name="fim" type="date" defaultValue={atual?.fim ?? ""} className={CAMPO} />
        </label>
      </div>
      <p className="-mt-1 text-sm text-neutral-500">Deixe o fim vazio se o contrato não tem data para acabar.</p>
      <p className="min-h-6 text-base text-red-700" role="alert">{erro}</p>
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={BOTAO.cheio}>{pending ? "Salvando…" : "Salvar"}</button>
        <button type="button" onClick={fechar} className={BOTAO.contorno}>Cancelar</button>
      </div>
    </form>
  );
}

/**
 * Clientes recorrentes da Projeção: a pessoa diz quem paga todo mês, quanto e
 * em que dia; a projeção completa os meses sem cobrança lançada com isso.
 */
export function Recorrentes({
  className,
  itens,
  clientes,
  ligado,
  previstoCents,
  salvar,
  remover,
}: {
  className: string;
  itens: Item[];
  clientes: Opcao[];
  ligado: boolean;
  previstoCents: number;
  salvar: Acao;
  remover: Acao;
}) {
  const livres = clientes.filter((c) => !itens.some((i) => i.clientId === c.id));
  const total = itens.reduce((t, i) => t + i.cents, 0);
  return (
    <section className={`${CARTAO} ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium text-neutral-900">Clientes recorrentes</h2>
          <p className="text-base text-neutral-600">Quem paga todo mês. A projeção conta com isso mesmo sem cobrança lançada.</p>
        </div>
        <Janela rotulo="Adicionar cliente" titulo="Cliente recorrente" variante="contorno">
          {(fechar) => <Formulario action={salvar} opcoes={livres} fechar={fechar} />}
        </Janela>
      </div>

      {itens.length === 0 ? (
        <p className="mt-4 text-base text-neutral-600">Nenhum cliente recorrente ainda. Adicione quem paga todo mês.</p>
      ) : (
        <ul className="mt-4 divide-y divide-neutral-200 border-y border-neutral-200">
          {itens.map((i) => (
            <li key={i.clientId} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2">
              <p className="min-w-0 flex-1 truncate text-base font-medium text-neutral-900">{i.name}</p>
              <p className="text-base tabular-nums text-neutral-700">
                {formatBRL(i.cents)} <span className="text-neutral-500">todo dia {i.dia}</span>
              </p>
              <p className="text-sm text-neutral-500">{periodo(i.inicio, i.fim)}</p>
              <div className="flex gap-1">
                <Janela rotulo="Editar" titulo={`Recorrente: ${i.name}`} variante="contorno">
                  {(fechar) => <Formulario action={salvar} opcoes={livres} atual={i} fechar={fechar} />}
                </Janela>
                <BotaoAcao action={remover} campos={{ cliente: i.clientId }} ariaLabel={`Remover ${i.name}`}>
                  Remover
                </BotaoAcao>
              </div>
            </li>
          ))}
        </ul>
      )}

      {itens.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="min-w-0 flex-1 text-base text-neutral-600">
            {ligado
              ? `${formatBRL(total)} por mês no total. A projeção soma ${formatBRL(previstoCents)} nos próximos 6 meses, já sem o que está lançado.`
              : "A projeção está contando só o que já foi lançado."}
          </p>
          <Link href={ligado ? "?recorrentes=nao" : "?"} scroll={false} className={BOTAO.contorno}>
            {ligado ? "Desligar previsão" : "Ligar previsão"}
          </Link>
        </div>
      ) : null}
    </section>
  );
}
