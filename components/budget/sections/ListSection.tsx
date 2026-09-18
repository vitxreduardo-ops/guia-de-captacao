import { RevealStagger, RevealItem } from "@/components/Reveal";
import { SectionBlock, SectionHeading } from "@/components/budget/SectionShell";
import type { BlockTone, ListSectionData } from "@/lib/budgetSections";

/**
 * A forma genérica de seção: cabeçalho e uma lista numerada em duas colunas.
 * Serve as quatro seções que só precisam disso — os dois blocos de
 * diferenciais de pacote, o "mas se você precisa" e a estratégia.
 */
export function ListSection({
  data,
  tone,
  number,
}: {
  data: ListSectionData;
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
      <RevealStagger className="grid gap-x-10 gap-y-1 sm:grid-cols-2">
        {data.items.map((item, index) => (
          <RevealItem
            key={`${item}-${index}`}
            className={`flex items-baseline gap-4 border-t py-4 ${tone.divider}`}
          >
            <span className={`text-xs tabular-nums ${tone.textMuted}`}>
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="text-base font-medium leading-snug">{item}</span>
          </RevealItem>
        ))}
      </RevealStagger>
    </SectionBlock>
  );
}
