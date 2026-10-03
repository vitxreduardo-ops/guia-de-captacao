import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CreatorTag } from "@/components/CreatorTag";
import { getPortalSession } from "@/lib/clientPortal";
import { listIdeas } from "@/lib/editorialCalendar";
import { groupByMonth, MONTH_NAMES, nextMonths } from "@/lib/editorialMonths";
import { IdeaForm } from "../IdeaForm";

export const dynamic = "force-dynamic";

const HEADING = { fontFamily: "Bootzy, sans-serif", letterSpacing: "0.02em" };

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ ano?: string }>;
}) {
  const { clientId, preview } = await getPortalSession();
  const now = new Date();
  const year = Number((await searchParams).ano) || now.getFullYear();
  const months = groupByMonth(await listIdeas(clientId, year, { includeInternal: false }));
  const currentMonth = year === now.getFullYear() ? now.getMonth() : -1;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-4xl leading-none" style={HEADING}>
          Calendário editorial
        </h1>
        <p className="mt-2 text-[var(--tatu-muted)]">
          As ideias que a gente vai guardando para cada mês do ano.
        </p>
        <div className="mt-4 flex items-center gap-2">
          <Link
            href={`/cliente/calendario?ano=${year - 1}`}
            aria-label={`Ver ${year - 1}`}
            className="grid size-11 place-items-center rounded-full border border-[var(--tatu-border)] hover:bg-white/60"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </Link>
          <span className="min-w-16 text-center text-xl font-semibold tabular-nums">{year}</span>
          <Link
            href={`/cliente/calendario?ano=${year + 1}`}
            aria-label={`Ver ${year + 1}`}
            className="grid size-11 place-items-center rounded-full border border-[var(--tatu-border)] hover:bg-white/60"
          >
            <ChevronRight className="size-5" aria-hidden />
          </Link>
        </div>
      </header>

      {preview ? null : <IdeaForm months={nextMonths(now, 12)} />}

      <div className="space-y-2">
        {months.map((ideas, index) => (
          <details
            key={index}
            open={index === currentMonth || undefined}
            className="group rounded-2xl bg-white/60 open:bg-white"
          >
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3 [&::-webkit-details-marker]:hidden">
              <span className="text-lg font-semibold">
                {MONTH_NAMES[index]}
                {index === currentMonth ? (
                  <span className="ml-2 rounded-full bg-[var(--tatu-ink)] px-2 py-0.5 align-middle text-[11px] font-medium text-[var(--tatu-cream)]">
                    agora
                  </span>
                ) : null}
              </span>
              <span className="flex items-center gap-2 text-sm text-[var(--tatu-muted)]">
                {ideas.length ? `${ideas.length} ${ideas.length === 1 ? "ideia" : "ideias"}` : "vazio"}
                <ChevronRight className="size-4 transition-transform group-open:rotate-90" aria-hidden />
              </span>
            </summary>
            <div className="px-4 pb-4">
              {ideas.length ? (
                <ul className="space-y-3">
                  {ideas.map((idea) => (
                    <li key={idea.id}>
                      <p className="font-medium">
                        {idea.title} <CreatorTag idea={idea} viewerIsClient />
                      </p>
                      {idea.notes ? (
                        <p className="whitespace-pre-line text-sm text-[var(--tatu-muted)]">{idea.notes}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[var(--tatu-muted)]">
                  Ainda sem ideias. Quando surgirem, a gente anota por aqui.
                </p>
              )}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
