import type { ReactNode } from "react";
import { Reveal } from "@/components/Reveal";
import type { BlockTone } from "@/lib/budgetSections";

/**
 * O cabeçalho que abre quase toda seção da proposta: o número, um filete, a
 * etiqueta em caixa alta e o título grande.
 *
 * Capa e rodapé não usam — são os dois blocos sem número, que abrem e fecham a
 * página com um desenho próprio.
 */
export function SectionHeading({
  number,
  eyebrow,
  title,
  subtitle,
  tone,
  className = "",
}: {
  number: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  tone: BlockTone;
  className?: string;
}) {
  if (!eyebrow && !title && !subtitle) return null;

  return (
    <Reveal className={className}>
      {eyebrow ? (
        <div className="mb-6 flex items-center gap-4">
          <span className="text-xs font-bold tabular-nums">{number}</span>
          <span className={`h-px w-10 ${tone.isDark ? "bg-[var(--tatu-cream)]/40" : "bg-[var(--tatu-ink)]/30"}`} />
          <span className={`text-xs font-medium uppercase tracking-[0.2em] ${tone.textMuted}`}>
            {eyebrow}
          </span>
        </div>
      ) : null}
      {title ? (
        <h2
          style={{ fontFamily: "Bootzy, sans-serif" }}
          className="max-w-3xl text-3xl leading-[1.1] tracking-wide sm:text-5xl"
        >
          {title}
        </h2>
      ) : null}
      {subtitle ? (
        <p className={`mt-4 max-w-xl text-base ${tone.textMuted}`}>{subtitle}</p>
      ) : null}
    </Reveal>
  );
}

/** O bloco full-width com a cor da vez e o respiro padrão da página. */
export function SectionBlock({
  tone,
  id,
  children,
}: {
  tone: BlockTone;
  id?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={`px-4 py-20 sm:px-8 sm:py-24 ${tone.bg} ${tone.text}`}
    >
      <div className="mx-auto w-full max-w-5xl">{children}</div>
    </section>
  );
}
