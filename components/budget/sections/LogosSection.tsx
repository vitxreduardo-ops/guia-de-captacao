/* eslint-disable @next/next/no-img-element */
import { RevealStagger, RevealItem } from "@/components/Reveal";
import { SectionBlock, SectionHeading } from "@/components/budget/SectionShell";
import type { BlockTone, SectionData } from "@/lib/budgetSections";

/**
 * A faixa de logos de quem já foi cliente.
 *
 * Os logos chegam em arte e cor de origem, cada um com um peso — por isso
 * entram dessaturados e num tom só, ganhando cor no hover. É o que faz uma
 * fileira de marcas diferentes parecer uma coisa só.
 *
 * <img> cru em vez de next/image de propósito: a URL pode ser de qualquer
 * domínio que alguém cole no editor, e a otimização do Next exige domínio
 * declarado na config.
 */
export function LogosSection({
  data,
  tone,
  number,
}: {
  data: SectionData["logos"];
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
      <RevealStagger className="grid grid-cols-2 items-center gap-x-10 gap-y-12 sm:grid-cols-4">
        {data.logos.map((logo, index) => (
          <RevealItem key={`${logo.url}-${index}`}>
            <img
              src={logo.url}
              alt={logo.name || "Cliente"}
              className="h-10 w-full object-contain opacity-70 grayscale transition duration-300 hover:opacity-100 hover:grayscale-0 sm:h-12"
            />
          </RevealItem>
        ))}
      </RevealStagger>
    </SectionBlock>
  );
}
