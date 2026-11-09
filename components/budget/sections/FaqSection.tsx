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
      <div className="pdf:hidden">
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
              <p
                className={`pb-5 pl-8 text-sm leading-relaxed ${tone.textMuted}`}
              >
                {item.answer}
              </p>
            </Accordion>
          ))}
        </Reveal>
      </div>
      {/* No PDF não dá para clicar: as respostas saem abertas, em duas colunas. */}
      <dl className="hidden grid-cols-2 pdf:grid gap-x-12 gap-y-8">
        {data.items.map((item, index) => (
          <div
            key={`${item.question}-${index}`}
            className={`border-t pt-4 ${tone.divider}`}
          >
            <dt className="flex items-baseline gap-3 text-sm font-bold">
              <span className={`text-xs tabular-nums ${tone.textMuted}`}>
                {String(index + 1).padStart(2, "0")}
              </span>
              {item.question}
            </dt>
            {item.answer ? (
              <dd
                className={`mt-2 pl-8 text-sm leading-relaxed ${tone.textMuted}`}
              >
                {item.answer}
              </dd>
            ) : null}
          </div>
        ))}
      </dl>
    </SectionBlock>
  );
}
