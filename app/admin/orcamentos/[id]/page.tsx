import { notFound } from "next/navigation";
import { getBudgetWithSections } from "@/lib/budgets";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { BudgetEditor } from "@/components/admin/budget/BudgetEditor";
import { BudgetGeneralInfoForm } from "@/components/admin/BudgetGeneralInfoForm";
import { BudgetRecurringCalculator } from "@/components/admin/BudgetRecurringCalculator";
import { BudgetFreelaCalculator } from "@/components/admin/BudgetFreelaCalculator";
import { BudgetPublishBox } from "@/components/admin/BudgetPublishBox";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function BudgetEditPage({ params }: { params: Params }) {
  const { id } = await params;
  const budget = await getBudgetWithSections(id);

  if (!budget) notFound();

  return (
    <div className="mx-auto w-full max-w-[1600px] pb-6">
      <AdminHeader
        title={budget.title}
        dense
        trail={[
          { label: "Admin", href: "/admin" },
          { label: "Orçamentos", href: "/admin/orcamentos" },
        ]}
      />

      <BudgetEditor
        budget={budget}
        config={
          <>
            <BudgetPublishBox budget={budget} />
            <BudgetGeneralInfoForm budget={budget} />
            <BudgetRecurringCalculator
              budget={budget}
              hasPackages={budget.packages.length > 0}
            />
            <BudgetFreelaCalculator budgetId={budget.id} />
          </>
        }
      />
    </div>
  );
}
