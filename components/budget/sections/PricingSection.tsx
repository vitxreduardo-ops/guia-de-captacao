import { RevealStagger } from "@/components/Reveal";
import { PackageCard } from "@/components/budget/PackageCard";
import { SectionBlock, SectionHeading } from "@/components/budget/SectionShell";
import { PACKAGE_WHATSAPP_URL } from "@/lib/budgetCalc";
import type { BlockTone, SectionData } from "@/lib/budgetSections";

type PackagesData = SectionData["pricing"] | SectionData["avulsos"];

/**
 * Os pacotes lado a lado. Cada um abre o próprio painel de itens (ver
 * PackageCard). O destacado ganha a borda cheia e o botão sólido.
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
      <PackagesGrid data={data} variant="pricing" />
    </SectionBlock>
  );
}

/**
 * Avulsos: mesmo componente dos pacotes, sem destaque, com botão de orçamento
 * e um rodapé de regras comuns.
 */
export function AvulsosSection({
  data,
  tone,
  number,
}: {
  data: SectionData["avulsos"];
  tone: BlockTone;
  number: string;
}) {
  return (
    <SectionBlock tone={tone}>
      <SectionHeading
        number={number}
        eyebrow={data.eyebrow}
        title={data.title}
        subtitle={data.subtitle}
        tone={tone}
        className="mb-12"
      />
      <PackagesGrid data={data} variant="avulsos" />
      {data.notes.length > 0 ? (
        <ul className={`mt-12 space-y-2 border-t pt-6 text-sm ${tone.divider} ${tone.textMuted}`}>
          {data.notes.map((line, i) => (
            <li key={`${line}-${i}`} className="leading-relaxed">
              {line}
            </li>
          ))}
        </ul>
      ) : null}
    </SectionBlock>
  );
}

function PackagesGrid({
  data,
  variant,
}: {
  data: PackagesData;
  variant: "pricing" | "avulsos";
}) {
  return (
    <RevealStagger className="grid gap-5 sm:grid-cols-3">
      {data.packages.map((pkg, index) => (
        <PackageCard
          key={`${pkg.name}-${index}`}
          pkg={pkg}
          index={index}
          variant={variant}
          ctaLabel={data.cta}
          ctaHref={PACKAGE_WHATSAPP_URL}
        />
      ))}
    </RevealStagger>
  );
}
