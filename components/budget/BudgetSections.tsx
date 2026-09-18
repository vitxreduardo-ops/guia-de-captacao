import {
  blockTone,
  isNumbered,
  sectionNumber,
  visibleSections,
  type BudgetSection,
} from "@/lib/budgetSections";
import { CoverSection } from "@/components/budget/sections/CoverSection";
import { AboutSection } from "@/components/budget/sections/AboutSection";
import { PortfolioSection } from "@/components/budget/sections/PortfolioSection";
import { LogosSection } from "@/components/budget/sections/LogosSection";
import { ListSection } from "@/components/budget/sections/ListSection";
import { PricingSection } from "@/components/budget/sections/PricingSection";
import { FaqSection } from "@/components/budget/sections/FaqSection";
import { FooterSection } from "@/components/budget/sections/FooterSection";

/**
 * Monta a proposta a partir do array de seções.
 *
 * É o mesmo componente nos dois lados: a página pública renderiza no servidor,
 * e o editor do admin renderiza no cliente com o estado do painel. Por isso
 * aqui não entra nada de Supabase — só os dados que já vieram prontos.
 *
 * Duas regras moram neste arquivo, e em nenhum outro:
 *   * a cor do bloco alterna na ordem em que os blocos aparecem, contando
 *     todos os visíveis, inclusive capa e rodapé;
 *   * o número só avança nas seções de miolo — capa e rodapé não são
 *     numeradas, então a primeira seção depois da capa é a 01.
 */
export function BudgetSections({
  sections,
  clientName = "",
}: {
  sections: BudgetSection[];
  clientName?: string;
}) {
  const visible = visibleSections(sections);
  const hasPricing = visible.some((section) => section.kind === "pricing");

  // Tom e número saem prontos antes do render: a numeração depende de quantas
  // seções numeráveis vieram antes, e contar durante o map seria mutar estado
  // no meio da renderização.
  const blocks = visible.map((section, index) => ({
    section,
    tone: blockTone(index),
    number: sectionNumber(visible.slice(0, index).filter(isNumbered).length),
  }));

  return (
    <>
      {blocks.map(({ section, tone, number }) => {
        if (section.kind === "cover") {
          return (
            <CoverSection
              key={section.kind}
              data={section.data}
              tone={tone}
              hasPricing={hasPricing}
            />
          );
        }

        if (section.kind === "footer") {
          return (
            <FooterSection
              key={section.kind}
              data={section.data}
              tone={tone}
              clientName={clientName}
            />
          );
        }

        switch (section.kind) {
          case "about":
            return (
              <AboutSection
                key={section.kind}
                data={section.data}
                tone={tone}
                number={number}
              />
            );
          case "portfolio":
            return (
              <PortfolioSection
                key={section.kind}
                data={section.data}
                tone={tone}
                number={number}
              />
            );
          case "logos":
            return (
              <LogosSection
                key={section.kind}
                data={section.data}
                tone={tone}
                number={number}
              />
            );
          case "pricing":
            return (
              <PricingSection
                key={section.kind}
                data={section.data}
                tone={tone}
                number={number}
              />
            );
          case "faq":
            return (
              <FaqSection
                key={section.kind}
                data={section.data}
                tone={tone}
                number={number}
              />
            );
          default:
            // package1, package1Extra, package2Perks e strategy: todas a mesma
            // forma, um componente só.
            return (
              <ListSection
                key={section.kind}
                data={section.data}
                tone={tone}
                number={number}
              />
            );
        }
      })}
    </>
  );
}
