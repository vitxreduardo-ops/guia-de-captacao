"use client";

import { useState } from "react";
import { formatBRL, monthLabel } from "@/lib/billingTypes";
import { CartaoFlutuante, LinhaCartao, useCartaoFlutuante } from "@/components/admin/financeiro/Flutuante";

const MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const mesCurto = (month: string) => MES[Number(month.slice(5, 7)) - 1];

/** "R$ 105,4 mil" para eixo de gráfico: curto, sem centavos. */
export function curto(cents: number): string {
  const v = Math.abs(cents) / 100;
  const sinal = cents < 0 ? "-" : "";
  if (v >= 1_000_000) return `${sinal}R$ ${(v / 1_000_000).toFixed(1).replace(".", ",")} mi`;
  if (v >= 1_000) return `${sinal}R$ ${(v / 1_000).toFixed(1).replace(".", ",")} mil`;
  return `${sinal}R$ ${Math.round(v)}`;
}

/**
 * Linha do caixa mês a mês. O traço é SVG esticado (não escreve texto dentro
 * dele, que encolheria no celular); rótulos, o ponto mais baixo e o ponto do
 * mês sob o mouse são HTML por cima, então o texto fica legível em qualquer
 * largura. Passar o mouse (ou tocar, ou usar Tab) abre o cartão do mês.
 */
export function CaixaGrafico({
  meses,
  caixaHoje,
  simulado,
  reservaMinima,
  resumo,
}: {
  meses: { month: string; fim: number; entra?: number; sai?: number }[];
  caixaHoje: number;
  /** Mesma série, com o compromisso simulado já pago. */
  simulado?: number[];
  reservaMinima: number;
  /** Frase para leitor de tela com o que o gráfico mostra. */
  resumo: string;
}) {
  const base = [caixaHoje, ...meses.map((m) => m.fim)];
  const sim = simulado ? [caixaHoje, ...simulado] : null;
  const todos = [...base, ...(sim ?? []), reservaMinima];
  const topo = Math.max(...todos);
  const fundo = Math.min(...todos);
  const faixa = Math.max(1, topo - fundo);
  const x = (i: number) => (i / (base.length - 1)) * 100;
  const y = (v: number) => 4 + (1 - (v - fundo) / faixa) * 92;
  const linha = (serie: number[]) => serie.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(2)} ${y(v).toFixed(2)}`).join(" ");
  const serieMenor = (sim ?? base).reduce((m, v, i) => (v < (sim ?? base)[m] ? i : m), 0);

  const [ativo, setAtivo] = useState<number | null>(null);
  const { ref, lugar, posicionar, limpar } = useCartaoFlutuante();
  const passo = 100 / (base.length - 1);

  const cartao =
    ativo === null ? null : (
      <>
        <p className="mb-1.5 font-medium text-neutral-900 first-letter:uppercase">
          {ativo === 0 ? "Hoje" : monthLabel(meses[ativo - 1].month)}
        </p>
        <LinhaCartao rotulo={ativo === 0 ? "Em caixa" : "Caixa no fim do mês"} valor={formatBRL(base[ativo])} tom={base[ativo] < reservaMinima ? "text-red-700" : ""} />
        {ativo > 0 ? (
          <>
            <LinhaCartao rotulo="Entra" valor={formatBRL(meses[ativo - 1].entra ?? 0)} />
            <LinhaCartao rotulo="Sai" valor={formatBRL(meses[ativo - 1].sai ?? 0)} />
          </>
        ) : null}
        {sim && ativo > 0 ? (
          <div className="mt-1 border-t border-neutral-100 pt-1">
            <LinhaCartao rotulo="Com o compromisso" valor={formatBRL(sim[ativo])} tom={sim[ativo] < reservaMinima ? "text-red-700" : ""} />
          </div>
        ) : null}
        <p className="mt-1 text-xs text-neutral-500">Reserva mínima: {formatBRL(reservaMinima)}</p>
      </>
    );

  return (
    <figure className="m-0" onMouseLeave={() => { setAtivo(null); limpar(); }}>
      <div className="relative h-56" role="img" aria-label={resumo}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden>
          <path d={`${linha(base)} L100 100 L0 100 Z`} fill="var(--tatu-ink)" opacity="0.07" />
          <line x1="0" x2="100" y1={y(reservaMinima)} y2={y(reservaMinima)} stroke="#b45309" strokeWidth="1.5" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
          <path d={linha(base)} fill="none" stroke="var(--tatu-ink)" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {sim ? (
            <path d={linha(sim)} fill="none" stroke="#b45309" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          ) : null}
          {ativo !== null ? (
            <line x1={x(ativo)} x2={x(ativo)} y1="0" y2="100" stroke="#d4d4d4" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ) : null}
        </svg>
        <span className="pointer-events-none absolute left-0 top-0 rounded bg-white/85 px-1 text-sm text-neutral-600">{curto(topo)}</span>
        <span className="pointer-events-none absolute right-0 rounded bg-white/85 px-1 text-sm text-amber-800" style={{ top: `calc(${y(reservaMinima)}% - 1.5rem)` }}>
          reserva mínima
        </span>
        <span
          className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-(--tatu-ink)"
          style={{ left: `${x(serieMenor)}%`, top: `${y((sim ?? base)[serieMenor])}%`, backgroundColor: sim ? "#b45309" : undefined }}
          aria-hidden
        />
        {ativo !== null && ativo !== serieMenor ? (
          <span
            className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-(--tatu-ink)"
            style={{ left: `${x(ativo)}%`, top: `${y((sim ?? base)[ativo])}%` }}
            aria-hidden
          />
        ) : null}

        {/* Uma faixa por ponto, centrada nele: mouse, toque e Tab chegam no mesmo lugar. */}
        {base.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`${i === 0 ? "Hoje" : monthLabel(meses[i - 1].month)}: ${formatBRL(base[i])}`}
            onMouseEnter={(e) => { setAtivo(i); posicionar(e.clientX, e.clientY); }}
            onMouseMove={(e) => posicionar(e.clientX, e.clientY)}
            onFocus={(e) => {
              setAtivo(i);
              const r = e.currentTarget.getBoundingClientRect();
              posicionar(r.left + r.width / 2, r.top + r.height / 2);
            }}
            onBlur={() => { setAtivo(null); limpar(); }}
            onClick={() => setAtivo(i)}
            className="absolute inset-y-0 cursor-default focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none"
            style={{ left: `${Math.max(0, x(i) - passo / 2)}%`, width: `${i === 0 || i === base.length - 1 ? passo / 2 : passo}%` }}
          />
        ))}
      </div>

      <CartaoFlutuante cartaoRef={ref} lugar={cartao ? lugar : null}>{cartao}</CartaoFlutuante>

      <ol className="mt-1 flex justify-between text-sm text-neutral-600" aria-hidden>
        <li>hoje</li>
        {meses.map((m) => (
          <li key={m.month}>{mesCurto(m.month)}</li>
        ))}
      </ol>

      {/* Celular: o cartão vem embaixo, sem cobrir o gráfico. */}
      <div role="status" className="sm:hidden">
        {cartao ? (
          <div className="mt-3 rounded-lg border border-neutral-200 bg-white p-3 text-sm">{cartao}</div>
        ) : (
          <p className="mt-3 text-sm text-neutral-500">Toque num ponto para ver o caixa do mês.</p>
        )}
      </div>
      <p className="sr-only">{meses.map((m) => `${mesCurto(m.month)}: ${formatBRL(m.fim)}`).join("; ")}</p>
    </figure>
  );
}
