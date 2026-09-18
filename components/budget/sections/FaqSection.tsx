import { Accordion } from "@/components/Accordion";
import { Reveal } from "@/components/Reveal";
import { SectionBlock, SectionHeading } from "@/components/budget/SectionShell";
import type { BlockTone, SectionData } from "@/lib/budgetSections";

/** As dúvidas que costumam aparecer antes do sim. */
export function FaqSection({
  data,
  tone,
  number,
}: {
  data: SectionData["faq"];
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
        className="mb-10"
      />
      <Reveal>
        {data.items.map((item, index) => (
          <Accordion
            key={`${item.question}-${index}`}
            className={`border-t ${tone.divider} ${
              index === data.items.length - 1 ? "border-b" : ""
            }`}
            buttonClassName="py-5"
            summary={
              <span className="flex items-baseline gap-3 text-left text-sm font-bold">
                <span className={`text-xs tabular-nums ${tone.textMuted}`}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                {item.question}
              </span>
            }
          >
            <p className={`pb-5 pl-8 text-sm leading-relaxed ${tone.textMuted}`}>
              {item.answer}
            </p>
          </Accordion>
        ))}
      </Reveal>
    </SectionBlock>
  );
}
