import { notFound } from "next/navigation";
import { getBudgetWithSections } from "@/lib/budgets";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { BudgetGeneralInfoForm } from "@/components/admin/BudgetGeneralInfoForm";
import { BudgetHighlightsSection } from "@/components/admin/BudgetHighlightsSection";
import { BudgetReferencesSection } from "@/components/admin/BudgetReferencesSection";
import { BudgetPackagesSection } from "@/components/admin/BudgetPackagesSection";
import { BudgetRecurringCalculator } from "@/components/admin/BudgetRecurringCalculator";
import { BudgetFreelaCalculator } from "@/components/admin/BudgetFreelaCalculator";
import { BudgetFaqSection } from "@/components/admin/BudgetFaqSection";
import { BudgetPublishBox } from "@/components/admin/BudgetPublishBox";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function BudgetEditPage({ params }: { params: Params }) {
  const { id } = await params;
  const budget = await getBudgetWithSections(id);

  if (!budget) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <AdminHeader title={budget.title} backHref="/admin/orcamentos" />

      <div className="space-y-8">
        <BudgetPublishBox budget={budget} />
        <BudgetGeneralInfoForm budget={budget} />
        <BudgetHighlightsSection
          budgetId={budget.id}
          items={budget.highlights}
        />
        <BudgetReferencesSection
          budgetId={budget.id}
          items={budget.references}
        />
        <BudgetPackagesSection budgetId={budget.id} items={budget.packages} />
        <BudgetRecurringCalculator
          budget={budget}
          hasPackages={budget.packages.length > 0}
        />
        <BudgetFreelaCalculator budgetId={budget.id} />
        <BudgetFaqSection budgetId={budget.id} items={budget.faq} />
      </div>
    </div>
  );
}
