import { notFound } from "next/navigation";
import { getBudgetBySlugWithSections } from "@/lib/budgets";
import { BudgetSections } from "@/components/budget/BudgetSections";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

/**
 * A proposta como o cliente vê.
 *
 * A página não conhece mais as seções: ela recebe o array do orçamento e o
 * entrega ao BudgetSections, que decide o que aparece, em que ordem e de que
 * cor. Trocar a ordem ou desligar um bloco é edição de dado, não de código.
 */
export default async function PublicBudgetPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const budget = await getBudgetBySlugWithSections(slug);

  if (!budget) notFound();

  if (budget.status !== "published") {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[var(--tatu-beige)] px-4 text-center">
        <p className="text-sm text-[var(--tatu-ink)]/70">
          Este orçamento ainda não foi publicado.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-svh">
      <BudgetSections
        sections={budget.sections}
        clientName={budget.client_name}
      />
    </div>
  );
}
