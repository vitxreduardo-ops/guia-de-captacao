import { Reveal } from "@/components/Reveal";
import { SectionBlock, SectionHeading } from "@/components/budget/SectionShell";
import type { BlockTone, SectionData } from "@/lib/budgetSections";

/**
 * Um bloco de texto corrido antes dos pacotes. Parágrafos são separados por
 * linha em branco no campo de texto.
 */
export function WhyExternalSection({
  data,
  tone,
  number,
}: {
  data: SectionData["whyExternal"];
  tone: BlockTone;
  number: string;
}) {
  const paragraphs = data.text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <SectionBlock tone={tone}>
      <SectionHeading
        number={number}
        eyebrow={data.eyebrow}
        title={data.title}
        tone={tone}
        className="mb-10"
      />
      <Reveal className="max-w-2xl space-y-5">
        {paragraphs.map((paragraph, i) => (
          <p key={i} className={`text-base leading-relaxed ${tone.textMuted}`}>
            {paragraph}
          </p>
        ))}
      </Reveal>
    </SectionBlock>
  );
}
