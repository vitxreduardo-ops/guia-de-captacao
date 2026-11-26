"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { BOTAO, CARTAO, Dinheiro, Vazio } from "@/components/admin/financeiro/ui";
import { formatBRL } from "@/lib/billingTypes";

export interface GrupoReembolso {
  pessoa: string;
  nome: string;
  itens: { key: string; descricao: string; data: string; cents: number }[];
}
export interface Historico {
  id: string;
  nome: string;
  quando: string;
  cents: number;
}

const quandoTxt = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/**
 * Reembolsos: o que o estúdio deve a cada pessoa, com "Reembolsei" e, embaixo,
 * os últimos reembolsos feitos com "Desfazer". Cmd/Ctrl+Z desfaz o último que
 * foi marcado nesta tela (fora de campos de texto, onde o atalho é do campo).
 */
export function Reembolsos({
  grupos,
  historico,
  reembolsar,
  desfazer,
}: {
  grupos: GrupoReembolso[];
  historico: Historico[];
  reembolsar: (formData: FormData) => Promise<string>;
  desfazer: (formData: FormData) => Promise<void>;
}) {
  const [pending, start] = useTransition();
  const [erro, setErro] = useState("");
  const ultimo = useRef<string | null>(null);

  const desfazerId = (id: string) =>
    start(async () => {
      try {
        const f = new FormData();
        f.set("id", id);
        await desfazer(f);
        if (ultimo.current === id) ultimo.current = null;
        setErro("");
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não foi possível desfazer.");
      }
    });

  const marcar = (pessoa: string) =>
    start(async () => {
      try {
        const f = new FormData();
        f.set("pessoa", pessoa);
        ultimo.current = await reembolsar(f);
        setErro("");
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Não foi possível marcar.");
      }
    });

  useEffect(() => {
    const aoApertar = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.shiftKey || e.key.toLowerCase() !== "z" || !ultimo.current) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      e.preventDefault();
      desfazerId(ultimo.current);
    };
    window.addEventListener("keydown", aoApertar);
    return () => window.removeEventListener("keydown", aoApertar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className={CARTAO} aria-labelledby="reembolsos-titulo">
      <h2 id="reembolsos-titulo" className="text-lg font-medium text-neutral-900">Reembolsos</h2>
      <p className="text-base text-neutral-600">
        Gastos do estúdio pagos no cartão pessoal. Saem do caixa quando você marca o reembolso. Marcou sem querer? Desfaça aqui embaixo ou com Cmd+Z.
      </p>
      <p className="min-h-6 text-base text-red-700" role="alert">{erro}</p>

      {grupos.length === 0 ? (
        <div className="mt-1">
          <Vazio>Ninguém tem nada a receber. Ao lançar uma saída, escolha em Pago por quem pagou no cartão.</Vazio>
        </div>
      ) : (
        <div className="mt-1 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
          {grupos.map(({ pessoa, nome, itens }) => {
            const total = itens.reduce((s, e) => s + e.cents, 0);
            return (
              <div key={pessoa} className="rounded-lg border border-neutral-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-neutral-600">
                      {nome} · {itens.length} {itens.length === 1 ? "conta" : "contas"}
                    </p>
                    <Dinheiro cents={total} className="text-2xl" />
                  </div>
                  <button
                    type="button"
                    disabled={pending}
                    aria-label={`Marcar ${formatBRL(total)} como reembolsado para ${nome}`}
                    onClick={() => marcar(pessoa)}
                    className={BOTAO.cheio}
                  >
                    {pending ? "Salvando…" : "Reembolsei"}
                  </button>
                </div>
                <ul className="mt-2 divide-y divide-neutral-100">
                  {itens.map((e) => (
                    <li key={e.key} className="flex items-baseline justify-between gap-3 py-2 text-base">
                      <span className="min-w-0 truncate">
                        {e.descricao || "Sem descrição"} <span className="text-sm text-neutral-500">· {e.data}</span>
                      </span>
                      <span className="tabular-nums">{formatBRL(e.cents)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      <h3 className="mt-5 text-sm font-medium text-neutral-600">Últimos reembolsos feitos</h3>
      {historico.length === 0 ? (
        <p className="mt-1 text-base text-neutral-500">Nenhum reembolso marcado ainda.</p>
      ) : (
        <ul className="mt-1 divide-y divide-neutral-100">
          {historico.map((h) => (
            <li key={h.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2 text-base">
              <span className="min-w-0 flex-1">
                {h.nome} <span className="text-sm text-neutral-500">· {quandoTxt(h.quando)}</span>
              </span>
              <span className="tabular-nums">{formatBRL(h.cents)}</span>
              <button type="button" disabled={pending} onClick={() => desfazerId(h.id)} className={BOTAO.contorno}>
                Desfazer
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
