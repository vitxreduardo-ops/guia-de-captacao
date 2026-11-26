import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { formatBRL } from "@/lib/billingTypes";

/**
 * Peças visuais do Financeiro. O verde-tinta da Tatu (`--tatu-ink`) com os
 * tons claros da marca (`--tatu-cream`) é o cartão âncora de cada aba: a
 * resposta principal da tela. O resto é branco, como no resto do admin.
 */

export const FOCO =
  "focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none";

/** Botão de 44 px: contorno (padrão), cheio (verde) ou claro (para cima do verde). */
export const BOTAO = {
  contorno: `inline-flex min-h-11 items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 text-base text-neutral-900 transition-transform hover:bg-neutral-50 active:scale-[0.97] disabled:opacity-50 ${FOCO}`,
  cheio: `inline-flex min-h-11 items-center justify-center rounded-lg bg-(--tatu-ink) px-4 text-base font-medium text-white transition-transform hover:bg-(--tatu-ink)/90 active:scale-[0.97] disabled:opacity-50 ${FOCO}`,
  claro: `inline-flex min-h-11 items-center justify-center rounded-lg bg-(--tatu-cream) px-4 text-base font-medium text-(--tatu-ink) transition-transform hover:bg-white active:scale-[0.97] disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-(--tatu-cream) focus-visible:ring-offset-2 focus-visible:ring-offset-(--tatu-ink) focus-visible:outline-none`,
} as const;

export const CARTAO = "rounded-xl border border-neutral-200 bg-white p-5";

/** Cartão âncora da aba: verde-tinta com texto claro. */
export function Ancora({
  children,
  className = "",
  label,
}: {
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <section aria-label={label} className={`rounded-xl bg-(--tatu-ink) p-5 text-(--tatu-cream) ${className}`}>
      {children}
    </section>
  );
}

/** R$ 46.850,32 com os centavos menores, como num extrato. */
export function Dinheiro({
  cents,
  className = "text-3xl",
  centavos = true,
}: {
  cents: number;
  className?: string;
  centavos?: boolean;
}) {
  const texto = formatBRL(cents);
  const virgula = texto.lastIndexOf(",");
  if (!centavos || virgula < 0) return <span className={`font-medium tabular-nums ${className}`}>{texto.slice(0, virgula < 0 ? undefined : virgula)}</span>;
  return (
    <span className={`font-medium tabular-nums ${className}`}>
      {texto.slice(0, virgula)}
      <span className="text-[0.55em] font-normal opacity-70">{texto.slice(virgula)}</span>
    </span>
  );
}

/** Um número com legenda, para as linhas de apoio dentro dos cartões. */
export function Dado({
  label,
  cents,
  note,
  tom = "",
  escuro = false,
  icone: Icone,
}: {
  label: string;
  cents: number;
  note?: string;
  tom?: string;
  escuro?: boolean;
  /** Ícone Lucide antes do rótulo (só onde a tela pede). */
  icone?: LucideIcon;
}) {
  return (
    <div className="min-w-0">
      <p className={`flex items-center gap-1.5 text-sm ${escuro ? "text-(--tatu-cream)/75" : "text-neutral-600"}`}>
        {Icone ? <Icone aria-hidden className="size-4 shrink-0" strokeWidth={1.75} /> : null}
        {label}
      </p>
      <p className={`text-lg font-medium tabular-nums ${tom}`}>{formatBRL(cents)}</p>
      {note ? <p className={`text-sm ${escuro ? "text-(--tatu-cream)/75" : "text-neutral-500"}`}>{note}</p> : null}
    </div>
  );
}

/** Barra de progresso falada: o valor também vai como texto para leitor de tela. */
export function Barra({
  pct,
  escuro = false,
  rotulo,
}: {
  pct: number;
  escuro?: boolean;
  rotulo: string;
}) {
  const v = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <div
      role="progressbar"
      aria-label={rotulo}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={v}
      className={`h-2 overflow-hidden rounded-full ${escuro ? "bg-(--tatu-cream)/20" : "bg-neutral-100"}`}
    >
      <div className={`h-2 rounded-full ${escuro ? "bg-(--tatu-cream)" : "bg-(--tatu-ink)"}`} style={{ width: `${v}%` }} />
    </div>
  );
}

/**
 * Anel de progresso no estilo do bloco "Plan overview" (blocks.so): trilho
 * apagado, arco com ponta redonda saindo do topo e a porcentagem no meio.
 * Usa a cor do texto, então funciona em cima do verde da Tatu.
 */
export function Anel({ pct, rotulo }: { pct: number; rotulo: string }) {
  const v = Math.max(0, Math.round(pct));
  const raio = 44;
  const volta = 2 * Math.PI * raio;
  return (
    <div
      role="progressbar"
      aria-label={rotulo}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.min(100, v)}
      className="relative size-32 shrink-0"
    >
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={raio} fill="none" stroke="currentColor" strokeOpacity="0.18" strokeWidth="8" />
        {v > 0 ? (
          <circle
            cx="50"
            cy="50"
            r={raio}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={volta}
            strokeDashoffset={volta * (1 - Math.min(100, v) / 100)}
          />
        ) : null}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-3xl font-medium tabular-nums">
        {v}
        <span className="text-base font-normal opacity-75">%</span>
      </span>
    </div>
  );
}

/** Frase quando falta cadastrar algo: leva direto à ação, sem mandar para outra tela. */
export function Vazio({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`rounded-xl border border-dashed border-neutral-300 p-6 text-center text-base text-neutral-600 ${className}`}>
      {children}
    </p>
  );
}
