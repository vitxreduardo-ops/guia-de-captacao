import { formatBRL } from "@/lib/billingTypes";

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
 * dele, que encolheria no celular); rótulos e o ponto mais baixo são HTML por
 * cima, então o texto fica legível em qualquer largura.
 */
export function CaixaGrafico({
  meses,
  caixaHoje,
  simulado,
  reservaMinima,
  resumo,
}: {
  meses: { month: string; fim: number }[];
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

  return (
    <div>
      <div className="relative h-56" role="img" aria-label={resumo}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden>
          <path d={`${linha(base)} L100 100 L0 100 Z`} fill="var(--tatu-ink)" opacity="0.07" />
          <line x1="0" x2="100" y1={y(reservaMinima)} y2={y(reservaMinima)} stroke="#b45309" strokeWidth="1.5" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
          <path d={linha(base)} fill="none" stroke="var(--tatu-ink)" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          {sim ? (
            <path d={linha(sim)} fill="none" stroke="#b45309" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          ) : null}
        </svg>
        <span className="absolute left-0 top-0 rounded bg-white/85 px-1 text-sm text-neutral-600">{curto(topo)}</span>
        <span className="absolute right-0 rounded bg-white/85 px-1 text-sm text-amber-800" style={{ top: `calc(${y(reservaMinima)}% - 1.5rem)` }}>
          reserva mínima
        </span>
        <span
          className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-(--tatu-ink)"
          style={{ left: `${x(serieMenor)}%`, top: `${y((sim ?? base)[serieMenor])}%`, backgroundColor: sim ? "#b45309" : undefined }}
          aria-hidden
        />
      </div>
      <ol className="mt-1 flex justify-between text-sm text-neutral-600" aria-hidden>
        <li>hoje</li>
        {meses.map((m) => (
          <li key={m.month}>{mesCurto(m.month)}</li>
        ))}
      </ol>
      <p className="sr-only">{meses.map((m) => `${mesCurto(m.month)}: ${formatBRL(m.fim)}`).join("; ")}</p>
    </div>
  );
}
