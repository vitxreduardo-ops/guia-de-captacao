import { RevealStagger, RevealItem } from "@/components/Reveal";
import { SectionBlock, SectionHeading } from "@/components/budget/SectionShell";
import type { BlockTone, SectionData } from "@/lib/budgetSections";

/**
 * As regras da proposta em blocos de texto: ajuste, aprovação, captação,
 * prazos, pagamento, o que não entra e direitos. Cada bloco é um título e
 * uma lista de linhas.
 */
export function RulesSection({
  data,
  tone,
  number,
}: {
  data: SectionData["regras"];
  tone: BlockTone;
  number: string;
}) {
  return (
    <SectionBlock tone={tone}>
      <SectionHeading
        number={number}
        eyebrow={data.eyebrow}
        title={data.title}
        tone={tone}
        className="mb-12"
      />
      <RevealStagger className="grid gap-x-10 gap-y-10 sm:grid-cols-2 pdf:grid-cols-3 pdf:gap-y-8">
        {data.blocks.map((block, index) => (
          <RevealItem key={`${block.title}-${index}`}>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.16em]">
              {block.title}
            </h3>
            <ul className="space-y-3 pdf:space-y-2">
              {block.lines.map((line, i) => (
                <li
                  key={`${line}-${i}`}
                  className={`border-t pt-3 text-sm leading-relaxed pdf:pt-2 pdf:text-xs ${tone.divider} ${tone.textMuted}`}
                >
                  {line}
                </li>
              ))}
            </ul>
          </RevealItem>
        ))}
      </RevealStagger>
    </SectionBlock>
  );
}
