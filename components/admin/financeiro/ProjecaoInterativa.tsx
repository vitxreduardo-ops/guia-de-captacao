"use client";

import { useMemo, useState } from "react";
import { formatBRL, parseBRLToCents } from "@/lib/billingTypes";
import { simular, type Projecao, type TipoCompromisso } from "@/lib/caixaCalc";
import { CaixaGrafico, mesCurto } from "@/components/admin/financeiro/CaixaGrafico";
import { CARTAO } from "@/components/admin/financeiro/ui";

const CAMPO =
  "min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-base focus:border-neutral-500 focus:outline-none";
const MESES_NOME = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const nomeMes = (m: string) => MESES_NOME[Number(m.slice(5, 7)) - 1];

/**
 * Gráfico do caixa + simulador. Os dois dividem o estado (o que se digita
 * muda a linha na hora), então moram juntos; cada cartão recebe a posição da
 * grade da página por `className`.
 */
export function ProjecaoInterativa({
  base,
  reservaMinima,
  classeGrafico,
  classeSimulador,
}: {
  base: Projecao;
  reservaMinima: number;
  classeGrafico: string;
  classeSimulador: string;
}) {
  const [tipo, setTipo] = useState<TipoCompromisso>("uma");
  const [valor, setValor] = useState("");
  const [mes, setMes] = useState(base.meses[Math.min(1, base.meses.length - 1)].month);
  const [parcelas, setParcelas] = useState(3);

  const cents = parseBRLToCents(valor);
  const sim = useMemo(
    () => (cents > 0 ? simular(base, { cents, tipo, mes, parcelas }, reservaMinima) : null),
    [base, cents, tipo, mes, parcelas, reservaMinima]
  );

  const menor = sim ?? { menorCents: base.menorCents, cabe: base.menorCents >= reservaMinima };
  const idxMenor = (sim?.fim ?? base.meses.map((m) => m.fim)).reduce(
    (m, v, i, arr) => (v < arr[m] ? i : m),
    0
  );
  const mesMenor = base.meses[idxMenor]?.month;
  const resumo = `Caixa nos próximos ${base.meses.length} meses. ${
    sim ? "Com o compromisso simulado, o" : "O"
  } ponto mais baixo é ${formatBRL(menor.menorCents)}${mesMenor ? ` em ${nomeMes(mesMenor)}` : ""}.`;

  return (
    <>
      <section className={`${CARTAO} ${classeGrafico}`}>
        <h2 className="text-lg font-medium text-neutral-900">Seu caixa nos próximos {base.meses.length} meses</h2>
        <p className="mb-3 min-h-12 text-base text-neutral-600" aria-live="polite">
          {sim
            ? menor.cabe
              ? `Com o compromisso, o ponto mais baixo seria ${formatBRL(menor.menorCents)} em ${nomeMes(mesMenor)}. Ainda acima da reserva mínima.`
              : `Com o compromisso, o caixa cairia para ${formatBRL(menor.menorCents)} em ${nomeMes(mesMenor)}, abaixo da reserva mínima.`
            : menor.cabe
              ? `O caixa fica acima da reserva mínima nos próximos ${base.meses.length} meses. Ponto mais baixo: ${formatBRL(menor.menorCents)}${base.menorMes ? ` em ${nomeMes(base.menorMes)}` : " (hoje)"}.`
              : `O caixa passa abaixo da reserva mínima. Ponto mais baixo: ${formatBRL(menor.menorCents)}${base.menorMes ? ` em ${nomeMes(base.menorMes)}` : " (hoje)"}.`}
        </p>
        <CaixaGrafico
          meses={base.meses}
          caixaHoje={base.caixaHoje}
          simulado={sim?.fim}
          reservaMinima={reservaMinima}
          resumo={resumo}
        />
        <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-neutral-600">
          <span className="inline-flex items-center gap-1.5"><span aria-hidden className="h-0.5 w-5 bg-(--tatu-ink)" /> Caixa com o que já está lançado</span>
          <span className="inline-flex items-center gap-1.5"><span aria-hidden className="h-0.5 w-5 bg-amber-700" /> Reserva mínima (e simulação)</span>
        </p>
      </section>

      <section className={`${CARTAO} ${classeSimulador}`}>
        <h2 className="text-lg font-medium text-neutral-900">Posso assumir esse compromisso?</h2>
        <div role="radiogroup" aria-label="Frequência" className="mt-3 flex gap-1 rounded-lg border border-neutral-300 p-1">
          {([["uma", "Uma vez"], ["parcelado", "Parcelado"], ["mensal", "Todo mês"]] as const).map(([id, rotulo]) => (
            <label
              key={id}
              className={`flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-md text-base ${tipo === id ? "bg-(--tatu-ink) font-medium text-white" : "text-neutral-600 hover:bg-neutral-100"}`}
            >
              <input type="radio" name="tipo" value={id} checked={tipo === id} onChange={() => setTipo(id)} className="sr-only" />
              {rotulo}
            </label>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-neutral-600">
              {tipo === "uma" ? "Valor" : tipo === "parcelado" ? "Valor da parcela" : "Valor por mês"}
            </span>
            <input value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" placeholder="R$ 0,00" className={CAMPO} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-neutral-600">{tipo === "uma" ? "Quando" : "A partir de"}</span>
            <select value={mes} onChange={(e) => setMes(e.target.value)} className={CAMPO}>
              {base.meses.map((m) => (
                <option key={m.month} value={m.month}>{nomeMes(m.month)}</option>
              ))}
            </select>
          </label>
          {/* Sempre no lugar: some só o conteúdo, não o espaço. */}
          <label className={`col-span-2 block ${tipo === "parcelado" ? "" : "invisible"}`} aria-hidden={tipo !== "parcelado"}>
            <span className="mb-1 block text-sm font-medium text-neutral-600">Parcelas</span>
            <input
              type="number"
              min={1}
              max={base.meses.length}
              value={parcelas}
              disabled={tipo !== "parcelado"}
              onChange={(e) => setParcelas(Math.max(1, Math.min(base.meses.length, Number(e.target.value) || 1)))}
              className={CAMPO}
            />
          </label>
        </div>
        <p className="mt-2 min-h-12 text-base text-neutral-900" aria-live="polite">
          {sim
            ? sim.cabe
              ? `Cabe: sobram ${formatBRL(sim.sobraCents)} acima da reserva mínima no pior mês.`
              : `Não cabe: faltam ${formatBRL(-sim.sobraCents)} para manter a reserva mínima no pior mês.`
            : "Digite um valor e a linha do caixa mostra o efeito."}
        </p>
      </section>
    </>
  );
}

export { mesCurto };
