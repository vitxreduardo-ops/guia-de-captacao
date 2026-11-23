"use client";

import Link from "next/link";
import { useState } from "react";
import { formatBRL } from "@/lib/billingTypes";
import { CartaoFlutuante, LinhaCartao, useCartaoFlutuante } from "@/components/admin/financeiro/Flutuante";
import { FOCO } from "@/components/admin/financeiro/ui";

const MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MES_LONGO = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export interface MesAno {
  href: string;
  entrou: number;
  saiu: number;
  reserva: number;
  sobrou: number;
}

/**
 * Barras de quanto sobrou em cada mês do ano. Cada barra leva ao mês; passar
 * o mouse por cima abre o cartão com a conta toda (entrou, saiu, reserva).
 */
export function SobrouAno({ meses, atual, ano }: { meses: MesAno[]; atual: number; ano: number }) {
  const topo = Math.max(0, ...meses.map((m) => m.sobrou));
  const fundo = Math.min(0, ...meses.map((m) => m.sobrou));
  const faixa = Math.max(1, topo - fundo);
  const zero = (topo / faixa) * 100;
  const [ativo, setAtivo] = useState<number | null>(null);
  const { ref, lugar, posicionar, limpar } = useCartaoFlutuante();
  const m = ativo === null ? null : meses[ativo];

  return (
    <div onMouseLeave={() => { setAtivo(null); limpar(); }}>
      <ol className="grid grid-cols-12 gap-1">
        {meses.map((mes, idx) => {
          const noMes = idx === atual;
          const h = (Math.abs(mes.sobrou) / faixa) * 100;
          return (
            <li key={idx}>
              <Link
                href={mes.href}
                aria-current={noMes ? "page" : undefined}
                aria-label={`${MES[idx]}: sobrou ${formatBRL(mes.sobrou)}`}
                onMouseEnter={(e) => { setAtivo(idx); posicionar(e.clientX, e.clientY); }}
                onMouseMove={(e) => posicionar(e.clientX, e.clientY)}
                onFocus={(e) => {
                  setAtivo(idx);
                  const r = e.currentTarget.getBoundingClientRect();
                  posicionar(r.left + r.width / 2, r.top);
                }}
                onBlur={() => { setAtivo(null); limpar(); }}
                className={`flex flex-col items-center gap-1 rounded-md p-0.5 ${FOCO} ${noMes ? "bg-neutral-100" : "hover:bg-neutral-50"}`}
              >
                <span className="relative block h-28 w-full">
                  <span
                    className={`absolute inset-x-0 rounded-sm ${mes.sobrou < 0 ? "bg-red-600" : noMes ? "bg-(--tatu-ink)" : "bg-(--tatu-olive)"}`}
                    style={mes.sobrou < 0 ? { top: `${zero}%`, height: `${h}%` } : { bottom: `${100 - zero}%`, height: `${h}%` }}
                  />
                </span>
                <span className={`text-xs ${noMes ? "font-medium text-neutral-900" : "text-neutral-600"}`}>{MES[idx]}</span>
              </Link>
            </li>
          );
        })}
      </ol>

      <CartaoFlutuante cartaoRef={ref} lugar={m ? lugar : null}>
        {m && ativo !== null ? (
          <>
            <p className="mb-1.5 font-medium text-neutral-900 first-letter:uppercase">{MES_LONGO[ativo]} de {ano}</p>
            <LinhaCartao rotulo="Entrou" valor={formatBRL(m.entrou)} />
            <LinhaCartao rotulo="Saiu" valor={formatBRL(m.saiu)} />
            <LinhaCartao rotulo="Reserva estimada" valor={formatBRL(m.reserva)} />
            <div className="mt-1 border-t border-neutral-100 pt-1">
              <LinhaCartao rotulo="Sobrou" valor={formatBRL(m.sobrou)} tom={m.sobrou < 0 ? "text-red-700" : ""} />
            </div>
          </>
        ) : null}
      </CartaoFlutuante>
    </div>
  );
}
