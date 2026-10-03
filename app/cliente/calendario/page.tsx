import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CreatorTag } from "@/components/CreatorTag";
import { MonthGrid } from "@/components/MonthGrid";
import { listClientPosts } from "@/lib/clientArea";
import { getPortalSession } from "@/lib/clientPortal";
import { listIdeas } from "@/lib/editorialCalendar";
import { groupByMonth, MONTH_NAMES, nextMonths } from "@/lib/editorialMonths";
import { IdeaForm } from "../IdeaForm";

export const dynamic = "force-dynamic";

const HEADING = { fontFamily: "Bootzy, sans-serif", letterSpacing: "0.02em" };
const pad = (n: number) => String(n).padStart(2, "0");

function Arrow({ href, label, dir }: { href: string; label: string; dir: "l" | "r" }) {
  const Icon = dir === "l" ? ChevronLeft : ChevronRight;
  return (
    <Link
      href={href}
      aria-label={label}
      className="grid size-11 place-items-center rounded-full border border-[var(--tatu-border)] hover:bg-white/60"
    >
      <Icon className="size-5" aria-hidden />
    </Link>
  );
}

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string; ano?: string; mes?: string }>;
}) {
  const { clientId, preview, viewerId } = await getPortalSession();
  const params = await searchParams;
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const year = Number(params.ano) || now.getFullYear();
  const monthly = params.vista === "mes";
  const month = Math.min(12, Math.max(1, Number(params.mes) || now.getMonth() + 1));

  const tabs = (
    <div role="group" aria-label="Modo de visualização" className="inline-flex rounded-full border border-[var(--tatu-border)] p-1">
      {[
        { label: "Ano", href: `/cliente/calendario?vista=ano&ano=${year}`, on: !monthly },
        { label: "Mês", href: `/cliente/calendario?vista=mes&ano=${year}&mes=${month}`, on: monthly },
      ].map((t) => (
        <Link
          key={t.label}
          href={t.href}
          aria-current={t.on ? "true" : undefined}
          className={`inline-flex min-h-10 items-center rounded-full px-5 text-sm ${
            t.on ? "bg-[var(--tatu-ink)] font-semibold text-[var(--tatu-cream)]" : "text-[var(--tatu-muted)]"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );

  const header = (
    <header className="space-y-4">
      <div>
        <h1 className="text-4xl leading-none" style={HEADING}>
          Calendário editorial
        </h1>
        <p className="mt-2 text-[var(--tatu-muted)]">
          Planejamento de conteúdo, programação de postagens e ideias de cada mês.
        </p>
      </div>
      <div className="flex items-center justify-between gap-3">
        {tabs}
        <IdeaForm months={nextMonths(now, 12)} readOnly={preview} />
      </div>
    </header>
  );

  if (monthly) {
    const last = new Date(year, month, 0).getDate();
    const [ideas, posts] = await Promise.all([
      listIdeas(clientId, year, { includeInternal: false }),
      listClientPosts(clientId, `${year}-${pad(month)}-01`, `${year}-${pad(month)}-${pad(last)}`),
    ]);
    const monthIdeas = groupByMonth(ideas)[month - 1];
    const visible = posts.filter((p) => p.visible);
    const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
    const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
    const link = (d: { y: number; m: number }) => `/cliente/calendario?vista=mes&ano=${d.y}&mes=${d.m}`;

    return (
      <div className="space-y-6">
        {header}

        <div className="flex items-center justify-between">
          <Arrow href={link(prev)} label="Mês anterior" dir="l" />
          <h2 className="text-2xl" style={HEADING}>
            {MONTH_NAMES[month - 1]} {year}
          </h2>
          <Arrow href={link(next)} label="Próximo mês" dir="r" />
        </div>

        <MonthGrid year={year} month={month} postDates={visible.map((p) => p.post_date)} today={today} />

        <section aria-labelledby="programacao">
          <h3 id="programacao" className="mb-2 text-xl font-semibold">
            Programação de postagens <span className="text-base font-normal text-[var(--tatu-muted)]">({visible.length})</span>
          </h3>
          {visible.length ? (
            <ul>
              {visible.map((p) => (
                <li key={p.id} className="flex items-center gap-3 border-b border-[var(--tatu-taupe)] py-2.5 last:border-b-0">
                  <span className="w-10 shrink-0 text-center">
                    <span className="block text-xl font-semibold leading-none">{Number(p.post_date.slice(8, 10))}</span>
                    <span className="block text-[11px] uppercase text-[var(--tatu-muted)]">
                      {new Date(`${p.post_date}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "")}
                    </span>
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{p.title || "Sem título"}</span>
                    <span className="block text-sm capitalize text-[var(--tatu-muted)]">{p.format}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[var(--tatu-muted)]">Nenhuma postagem programada para este mês.</p>
          )}
        </section>

        <section aria-labelledby="ideias-mes">
          <h3 id="ideias-mes" className="mb-2 text-xl font-semibold">
            Ideias de {MONTH_NAMES[month - 1].toLowerCase()} <span className="text-base font-normal text-[var(--tatu-muted)]">({monthIdeas.length})</span>
          </h3>
          {monthIdeas.length ? (
            <ul className="space-y-2">
              {monthIdeas.map((idea) => (
                <li key={idea.id} className="rounded-2xl bg-white/60 px-4 py-3">
                  <p className="font-medium">
                    {idea.title} <CreatorTag idea={idea} viewerId={viewerId} />
                  </p>
                  {idea.notes ? <p className="whitespace-pre-line text-sm text-[var(--tatu-muted)]">{idea.notes}</p> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[var(--tatu-muted)]">Nenhuma ideia registrada para este mês.</p>
          )}
        </section>
      </div>
    );
  }

  const months = groupByMonth(await listIdeas(clientId, year, { includeInternal: false }));
  const currentMonth = year === now.getFullYear() ? now.getMonth() : -1;

  return (
    <div className="space-y-6">
      {header}

      <div className="flex items-center gap-2">
        <Arrow href={`/cliente/calendario?vista=ano&ano=${year - 1}`} label={`Ver ${year - 1}`} dir="l" />
        <span className="min-w-16 text-center text-xl font-semibold tabular-nums">{year}</span>
        <Arrow href={`/cliente/calendario?vista=ano&ano=${year + 1}`} label={`Ver ${year + 1}`} dir="r" />
      </div>

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
                    mês atual
                  </span>
                ) : null}
              </span>
              <span className="flex items-center gap-2 text-sm text-[var(--tatu-muted)]">
                {ideas.length ? `${ideas.length} ${ideas.length === 1 ? "ideia" : "ideias"}` : "sem ideias"}
                <ChevronRight className="size-4 transition-transform group-open:rotate-90" aria-hidden />
              </span>
            </summary>
            <div className="space-y-3 px-4 pb-4">
              {ideas.length ? (
                <ul className="space-y-3">
                  {ideas.map((idea) => (
                    <li key={idea.id}>
                      <p className="font-medium">
                        {idea.title} <CreatorTag idea={idea} viewerId={viewerId} />
                      </p>
                      {idea.notes ? (
                        <p className="whitespace-pre-line text-sm text-[var(--tatu-muted)]">{idea.notes}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[var(--tatu-muted)]">Nenhuma ideia registrada para este mês.</p>
              )}
              <Link
                href={`/cliente/calendario?vista=mes&ano=${year}&mes=${index + 1}`}
                className="inline-flex min-h-11 items-center gap-1 text-sm font-medium underline underline-offset-4"
              >
                Ver programação do mês <ChevronRight className="size-4" aria-hidden />
              </Link>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
