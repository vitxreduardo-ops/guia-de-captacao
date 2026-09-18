import { RevealStagger, RevealItem } from "@/components/Reveal";
import { SectionBlock, SectionHeading } from "@/components/budget/SectionShell";
import { PACKAGE_WHATSAPP_URL } from "@/lib/budgetCalc";
import type { BlockTone, SectionData } from "@/lib/budgetSections";

function money(value: number) {
  return (
    "R$ " +
    (Number(value) || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })
  );
}

/**
 * Os pacotes lado a lado. O destacado ganha a borda cheia e o botão sólido —
 * é o que o cliente deve olhar primeiro.
 *
 * O id="pacotes" é o destino do botão da capa.
 */
export function PricingSection({
  data,
  tone,
  number,
}: {
  data: SectionData["pricing"];
  tone: BlockTone;
  number: string;
}) {
  return (
    <SectionBlock tone={tone} id="pacotes">
      <SectionHeading
        number={number}
        eyebrow={data.eyebrow}
        title={data.title}
        subtitle={data.subtitle}
        tone={tone}
        className="mb-12"
      />
      <RevealStagger className="grid gap-5 sm:grid-cols-3">
        {data.packages.map((pkg, index) => (
          <RevealItem
            key={`${pkg.name}-${index}`}
            className={`relative flex flex-col bg-[var(--tatu-cream)] p-7 text-[var(--tatu-ink)] ${
              pkg.featured
                ? "border-[1.5px] border-[var(--tatu-olive)]"
                : "border border-[var(--tatu-taupe)]"
            }`}
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--tatu-ink)]/50">
                Opção {String(index + 1).padStart(2, "0")}
              </span>
              {pkg.featured ? (
                <span className="bg-[var(--tatu-ink)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[var(--tatu-cream)]">
                  Recomendado
                </span>
              ) : null}
            </div>

            <p className="text-2xl font-bold">{pkg.name}</p>
            {pkg.subtitle ? (
              <p className="mt-1 text-sm text-[var(--tatu-ink)]/60">{pkg.subtitle}</p>
            ) : null}

            <p
              style={{ fontFamily: "Bootzy, sans-serif" }}
              className="mt-6 text-4xl leading-none tracking-wide"
            >
              {money(pkg.price)}
            </p>
            {pkg.description ? (
              <p className="mt-2 text-sm text-[var(--tatu-ink)]/60">
                {pkg.description}
              </p>
            ) : null}

            <ul className="mb-7 mt-6 flex-1 space-y-2">
              {pkg.features.map((feature, i) => (
                <li
                  key={`${feature}-${i}`}
                  className="flex gap-2 border-t border-[var(--tatu-taupe)] pt-2 text-sm text-[var(--tatu-ink)]/75"
                >
                  <span aria-hidden>✓</span>
                  {feature}
                </li>
              ))}
            </ul>

            <a
              href={PACKAGE_WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              className={`block py-3 text-center text-xs font-bold uppercase tracking-widest ${
                pkg.featured
                  ? "bg-[var(--tatu-ink)] text-[var(--tatu-cream)]"
                  : "border border-[var(--tatu-ink)]/40 text-[var(--tatu-ink)] hover:bg-[var(--tatu-taupe)]/30"
              }`}
            >
              {data.cta || `Escolher ${pkg.name}`}
            </a>
          </RevealItem>
        ))}
      </RevealStagger>
    </SectionBlock>
  );
}
