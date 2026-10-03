import Link from "next/link";
import { EditorialCapture } from "@/components/admin/EditorialCapture";
import { IdeaRow } from "@/components/admin/IdeaRow";
import { listIdeas } from "@/lib/editorialCalendar";
import { groupByMonth, MONTH_NAMES, nextMonths } from "@/lib/editorialMonths";

export const dynamic = "force-dynamic";

export default async function CalendarioPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ ano?: string }>;
}) {
  const { clientId } = await params;
  const now = new Date();
  const year = Number((await searchParams).ano) || now.getFullYear();

  const months = groupByMonth(await listIdeas(clientId, year, { includeInternal: true }));
  const filled = months.map((ideas, i) => ({ ideas, i })).filter((m) => m.ideas.length);
  const empty = months.map((ideas, i) => ({ ideas, i })).filter((m) => !m.ideas.length);
  const yearLink = (y: number) => `/admin/area-do-cliente/${clientId}/calendario?ano=${y}`;

  return (
    <div className="space-y-6">
      <EditorialCapture clientId={clientId} months={nextMonths(now, 12)} />

      <div className="flex items-center gap-3">
        <Link href={yearLink(year - 1)} className="text-sm text-neutral-600 underline underline-offset-4">
          ← {year - 1}
        </Link>
        <h2 className="text-lg font-semibold tabular-nums">{year}</h2>
        <Link href={yearLink(year + 1)} className="text-sm text-neutral-600 underline underline-offset-4">
          {year + 1} →
        </Link>
      </div>

      {filled.length ? (
        <div className="space-y-5">
          {filled.map(({ ideas, i }) => (
            <section key={i} aria-labelledby={`m-${i}`}>
              <h3 id={`m-${i}`} className="mb-1.5 text-sm font-semibold text-neutral-700">
                {MONTH_NAMES[i]}
              </h3>
              <ul className="space-y-1.5">
                {ideas.map((idea) => (
                  <IdeaRow key={idea.id} idea={idea} clientId={clientId} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <p className="text-sm text-neutral-500">Nenhuma ideia em {year} ainda. Anote a primeira acima.</p>
      )}

      {filled.length && empty.length ? (
        <p className="text-sm text-neutral-500">
          Sem ideias em: {empty.map((m) => MONTH_NAMES[m.i]).join(", ")}.
        </p>
      ) : null}
    </div>
  );
}
