"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { formatBRL, monthLabel, parseBRLToCents } from "@/lib/billingTypes";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@/lib/backlogTypes";
import type { PaymentMethod } from "@/lib/backlogTypes";
import type { StatementRow } from "@/lib/dinheiroTypes";
import { diaPorExtenso } from "@/lib/dinheiroTexto";
import {
  markUnpaidAction,
  setPaidAtAction,
  setPartialAmountAction,
  updatePaymentAction,
} from "@/app/admin/clientes/dinheiro/actions";

const PRESS =
  "transition-transform focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.97] min-h-11";
const CAMPO =
  "min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-base focus:border-neutral-500 focus:outline-none";
const BTN_PRIMARIO = `rounded-lg bg-neutral-900 px-5 text-base font-medium text-white hover:bg-neutral-800 disabled:opacity-50 ${PRESS}`;
const BTN_LINK = `rounded-lg px-3 text-sm text-neutral-600 underline hover:text-neutral-900 ${PRESS}`;
const paraCampo = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");
const hoje = () => new Date().toLocaleDateString("sv-SE");

/** Dias entre o vencimento e o pagamento (positivo = pagou depois). */
function diasDeAtraso(dueOn: string | null, paidAt: string | null): number {
  if (!dueOn || !paidAt) return 0;
  return Math.round((Date.parse(paidAt) - Date.parse(dueOn)) / 86_400_000);
}

/** Roda uma ação do servidor e devolve a mensagem de erro, se houver. */
function useAcao() {
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const rodar = (fn: () => Promise<void>, depois?: () => void) =>
    startTransition(async () => {
      setErro(null);
      try {
        await fn();
        depois?.();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não deu para salvar.");
      }
    });
  return { pending, erro, rodar };
}

/** Só o dia do pagamento: usado nas Contas, mesma ação do extrato. */
export function MudarDataPagamento({
  cardId,
  paidAt,
  onDone,
}: {
  cardId: string;
  paidAt: string;
  onDone: () => void;
}) {
  const { pending, erro, rodar } = useAcao();
  return (
    <form
      action={(f) => rodar(() => setPaidAtAction(f), onDone)}
      className="mt-2 flex flex-wrap items-end gap-2 rounded-lg bg-neutral-50 p-3"
    >
      <input type="hidden" name="card" value={cardId} />
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-neutral-700">Pago em</span>
        <input name="pago_em" type="date" required autoFocus defaultValue={paidAt} max={hoje()} className="min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-base focus:border-neutral-500 focus:outline-none" />
      </label>
      <button type="submit" disabled={pending} className={BTN_PRIMARIO}>
        {pending ? "Salvando…" : "Salvar"}
      </button>
      <button type="button" onClick={onDone} className={`rounded-lg px-3 text-base text-neutral-700 underline ${PRESS}`}>
        Cancelar
      </button>
      {erro ? <p role="alert" className="w-full text-sm text-red-700">{erro}</p> : null}
    </form>
  );
}

/** Editar tudo de um pagamento: dia, forma, quantidade e valor de cada. */
function EditarPagamento({
  row,
  onDone,
  onSaved,
}: {
  row: StatementRow;
  onDone: () => void;
  onSaved: (paidAt: string) => void;
}) {
  const { pending, erro, rodar } = useAcao();
  const [qtd, setQtd] = useState(String(row.quantity));
  const [valor, setValor] = useState(paraCampo(row.unitCents));
  const total = Math.max(0, Number(qtd) || 0) * parseBRLToCents(valor);
  return (
    <form
      action={(f) => {
        const dia = String(f.get("pago_em"));
        rodar(() => updatePaymentAction(f), () => {
          onSaved(dia);
          onDone();
        });
      }}
      className="mt-2 grid gap-3 rounded-lg bg-neutral-50 p-3 sm:grid-cols-[10rem_1fr_6rem_9rem]"
    >
      <input type="hidden" name="card" value={row.cardId} />
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-neutral-700">Pago em</span>
        <input name="pago_em" type="date" required autoFocus defaultValue={row.paidAt ?? hoje()} max={hoje()} className={CAMPO} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-neutral-700">Como pagou</span>
        <select name="method" defaultValue={row.method ?? "pix"} className={CAMPO}>
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m as PaymentMethod]}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-neutral-700">Quantidade</span>
        <input name="quantidade" type="number" min={1} required value={qtd} onChange={(e) => setQtd(e.target.value)} className={CAMPO} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-neutral-700">Valor de cada</span>
        <input name="valor" required inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} className={CAMPO} />
      </label>
      <div className="flex flex-wrap items-center gap-2 sm:col-span-4">
        <button type="submit" disabled={pending} className={BTN_PRIMARIO}>
          {pending ? "Salvando…" : "Salvar"}
        </button>
        <button type="button" onClick={onDone} className={`rounded-lg px-3 text-base text-neutral-700 underline ${PRESS}`}>
          Cancelar
        </button>
        <p className="text-sm text-neutral-600">
          Total: <strong className="tabular-nums text-neutral-900">{formatBRL(total)}</strong>. Também muda no card do quadro de Entregas e no PDF.
        </p>
      </div>
      {erro ? <p role="alert" className="text-sm text-red-700 sm:col-span-4">{erro}</p> : null}
    </form>
  );
}

/** Corrigir quanto entrou de um parcial. */
function EditarParcial({ row, onDone }: { row: StatementRow; onDone: () => void }) {
  const { pending, erro, rodar } = useAcao();
  return (
    <form
      action={(f) => rodar(() => setPartialAmountAction(f), onDone)}
      className="mt-2 flex flex-wrap items-end gap-2 rounded-lg bg-neutral-50 p-3"
    >
      <input type="hidden" name="card" value={row.cardId} />
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-neutral-700">Quanto entrou até agora</span>
        <input name="valor" required autoFocus inputMode="decimal" defaultValue={paraCampo(row.receivedCents)} className={`${CAMPO} w-40`} />
      </label>
      <button type="submit" disabled={pending} className={BTN_PRIMARIO}>
        {pending ? "Salvando…" : "Salvar"}
      </button>
      <button type="button" onClick={onDone} className={`rounded-lg px-3 text-base text-neutral-700 underline ${PRESS}`}>
        Cancelar
      </button>
      <p className="w-full text-sm text-neutral-600">
        Total da entrega: {formatBRL(row.totalCents)}. Para fechar o valor inteiro, use o Recebi nas Contas. Zero apaga o parcial.
      </p>
      {erro ? <p role="alert" className="w-full text-sm text-red-700">{erro}</p> : null}
    </form>
  );
}

function Linha({
  row,
  onAviso,
  onChanged,
  mes,
}: {
  row: StatementRow;
  onAviso: (texto: string) => void;
  /** Chamado depois de salvar, desfazer ou apagar: quem mostra a lista recarrega. */
  onChanged?: () => void;
  /** Mês aberto na lista; null = todos os meses (página do cliente). */
  mes: string | null;
}) {
  const [editando, setEditando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const { pending, erro, rodar } = useAcao();
  const atraso = diasDeAtraso(row.dueOn, row.paidAt);
  const nome = row.title || row.clientName;

  const desfazer = () => {
    const f = new FormData();
    f.append("card", row.cardId);
    if (row.kind === "parcial") {
      f.append("valor", "0");
      rodar(() => setPartialAmountAction(f), () => {
        onAviso(`Parcial de ${nome} apagado.`);
        onChanged?.();
      });
    } else {
      rodar(() => markUnpaidAction(f), () => {
        onAviso(`${nome} voltou para “a receber”.`);
        onChanged?.();
      });
    }
  };

  const linhaInfo =
    row.kind === "pago"
      ? [
          row.paidAt ? diaPorExtenso(row.paidAt) : "",
          row.method ? (PAYMENT_METHOD_LABELS[row.method as PaymentMethod] ?? row.method) : "",
          row.workMonth ? `trabalho de ${monthLabel(row.workMonth)}` : "",
          atraso > 0 ? `pagou ${atraso} ${atraso === 1 ? "dia" : "dias"} depois do vencimento` : "",
        ]
      : [row.workMonth ? `trabalho de ${monthLabel(row.workMonth)}` : ""];

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <div className="min-w-0 flex-1 basis-48">
          <p className="text-base text-neutral-900">{row.title || "Sem título"}</p>
          <p className="text-sm text-neutral-500">{linhaInfo.filter(Boolean).join(" · ")}</p>
          {row.kind === "sem-data" ? (
            <p className="text-sm text-amber-700">Marcado como pago, mas sem dia de pagamento. Não entra em mês nenhum.</p>
          ) : null}
          {row.kind === "parcial" ? (
            <p className="text-sm text-amber-700">
              Entrou {formatBRL(row.receivedCents)} de {formatBRL(row.totalCents)}. Pagamento parcial não guarda o dia.
            </p>
          ) : null}
        </div>
        <span className={`text-base font-medium tabular-nums ${row.kind === "pago" ? "text-emerald-700" : "text-amber-700"}`}>
          {formatBRL(row.kind === "parcial" ? row.receivedCents : row.totalCents)}
        </span>
        <button
          type="button"
          onClick={() => {
            setEditando(!editando);
            setConfirmando(false);
          }}
          aria-expanded={editando}
          aria-label={`${row.kind === "sem-data" ? "Informar o dia do pagamento de" : "Editar pagamento de"} ${nome}`}
          className={BTN_LINK}
        >
          {row.kind === "sem-data" ? "Informar dia" : "Editar"}
        </button>
        {confirmando ? (
          <span className="flex items-center gap-1">
            <button
              type="button"
              disabled={pending}
              onClick={desfazer}
              className={`rounded-lg bg-red-700 px-3 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50 ${PRESS}`}
            >
              {pending ? "Desfazendo…" : "Sim, desfazer"}
            </button>
            <button type="button" onClick={() => setConfirmando(false)} className={BTN_LINK}>Não</button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => {
              setConfirmando(true);
              setEditando(false);
            }}
            aria-label={`${row.kind === "parcial" ? "Apagar o parcial de" : "Desfazer o pagamento de"} ${nome}`}
            className={`rounded-lg px-3 text-sm text-red-700 underline hover:text-red-800 ${PRESS}`}
          >
            {row.kind === "parcial" ? "Apagar parcial" : "Desfazer"}
          </button>
        )}
      </div>
      {confirmando ? (
        <p className="mt-1 text-sm text-neutral-600">
          {row.kind === "parcial"
            ? "O valor parcial é zerado. A entrega continua em aberto."
            : "A entrega volta para a coluna de espera do quadro e perde dia e forma de pagamento. Fica em aberto de novo nas Contas."}
        </p>
      ) : null}
      {editando && row.kind === "parcial" ? (
        <EditarParcial row={row} onDone={() => { setEditando(false); onChanged?.(); }} />
      ) : null}
      {editando && row.kind !== "parcial" ? (
        <EditarPagamento
          row={row}
          onDone={() => setEditando(false)}
          onSaved={(dia) => {
            onChanged?.();
            if (mes && dia.slice(0, 7) !== mes.slice(0, 7)) {
              onAviso(`${nome} foi para ${monthLabel(`${dia.slice(0, 7)}-01`)} e saiu desta lista.`);
            }
          }}
        />
      ) : null}
      {erro ? <p role="alert" className="mt-1 text-sm text-red-700">{erro}</p> : null}
    </li>
  );
}

interface Grupo {
  id: string;
  nome: string;
  rows: StatementRow[];
  pagoCents: number;
  semData: number;
  parciais: number;
}

function agrupar(rows: StatementRow[]): Grupo[] {
  const map = new Map<string, Grupo>();
  for (const row of rows) {
    const g = map.get(row.clientId) ?? {
      id: row.clientId,
      nome: row.clientName,
      rows: [],
      pagoCents: 0,
      semData: 0,
      parciais: 0,
    };
    g.rows.push(row);
    if (row.kind === "pago") g.pagoCents += row.totalCents;
    if (row.kind === "sem-data") g.semData += 1;
    if (row.kind === "parcial") g.parciais += 1;
    map.set(row.clientId, g);
  }
  // Quem tem pendência primeiro; depois quem mais pagou.
  return [...map.values()].sort(
    (a, b) =>
      Number(b.semData + b.parciais > 0) - Number(a.semData + a.parciais > 0) ||
      b.pagoCents - a.pagoCents ||
      a.nome.localeCompare(b.nome)
  );
}

function GrupoCliente({
  grupo,
  aberto: abertoInicial,
  mes,
  onAviso,
}: {
  grupo: Grupo;
  aberto: boolean;
  mes: string | null;
  onAviso: (texto: string) => void;
}) {
  const [aberto, setAberto] = useState(abertoInicial);
  const pagos = grupo.rows.filter((r) => r.kind === "pago").length;
  return (
    <li className="rounded-xl border border-neutral-200 bg-white">
      <button
        type="button"
        aria-expanded={aberto}
        onClick={() => setAberto(!aberto)}
        className={`flex w-full flex-wrap items-center gap-x-4 gap-y-1 rounded-xl p-4 text-left ${PRESS}`}
      >
        <span className="min-w-0 flex-1 basis-48">
          <span className="block truncate text-lg font-semibold text-neutral-900">{grupo.nome}</span>
          <span className="block text-sm text-neutral-600">
            {pagos} {pagos === 1 ? "pagamento" : "pagamentos"}{mes ? " neste mês" : ""}
            {grupo.semData ? <span className="text-amber-700"> · {grupo.semData} sem dia</span> : null}
            {grupo.parciais ? <span className="text-amber-700"> · {grupo.parciais} parcial</span> : null}
          </span>
        </span>
        <span className="text-base font-medium text-emerald-700 tabular-nums">{formatBRL(grupo.pagoCents)}</span>
        <span aria-hidden className="text-neutral-400">{aberto ? "▴" : "▾"}</span>
      </button>
      {aberto ? (
        <ul className="divide-y divide-neutral-100 border-t border-neutral-100 px-4">
          {grupo.rows.map((row) => (
            <Linha key={row.cardId} row={row} mes={mes} onAviso={onAviso} />
          ))}
          <li className="py-2">
            <Link href={`/admin/clientes/${grupo.id}`} className={`inline-flex items-center rounded-lg text-base text-neutral-700 underline hover:text-neutral-900 ${PRESS}`}>
              Abrir página de {grupo.nome}
            </Link>
          </li>
        </ul>
      ) : null}
    </li>
  );
}

const PAGINA = 12;

/**
 * `plano` é a lista corrida de um cliente só (página do cliente, todos os
 * meses): sem o cabeçalho de grupo, e mostra os mais recentes primeiro.
 */
export function Extrato({
  rows,
  mes,
  plano = false,
  onChanged,
}: {
  rows: StatementRow[];
  mes: string | null;
  plano?: boolean;
  onChanged?: () => void;
}) {
  const [aviso, setAviso] = useState<string | null>(null);
  const [limite, setLimite] = useState(PAGINA);
  const grupos = agrupar(rows);
  return (
    <>
      {aviso ? (
        <p role="status" className="mb-3 flex items-center justify-between gap-3 rounded-lg bg-emerald-50 px-4 py-2 text-base text-emerald-900">
          <span>{aviso}</span>
          <button type="button" onClick={() => setAviso(null)} className={`rounded-lg px-2 text-sm underline ${PRESS}`}>
            Fechar
          </button>
        </p>
      ) : null}
      {plano ? (
        <div className="rounded-xl border border-neutral-200 bg-white">
          <ul className="divide-y divide-neutral-100 px-4">
            {rows.slice(0, limite).map((row) => (
              <Linha key={row.cardId} row={row} mes={mes} onAviso={setAviso} onChanged={onChanged} />
            ))}
          </ul>
          {rows.length > limite ? (
            <button
              type="button"
              onClick={() => setLimite(limite + PAGINA)}
              className={`w-full rounded-b-xl border-t border-neutral-100 text-base text-neutral-700 underline hover:bg-neutral-50 ${PRESS}`}
            >
              Mostrar mais ({rows.length - limite} restantes)
            </button>
          ) : null}
        </div>
      ) : (
        <ul className="space-y-3">
          {grupos.map((g) => (
            <GrupoCliente
              key={g.id}
              grupo={g}
              mes={mes}
              aberto={grupos.length <= 2 || g.semData + g.parciais > 0}
              onAviso={setAviso}
            />
          ))}
        </ul>
      )}
    </>
  );
}
