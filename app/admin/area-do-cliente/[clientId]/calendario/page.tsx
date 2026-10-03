import Link from "next/link";
import { EditorialCapture } from "@/components/admin/EditorialCapture";
import { IdeaRow } from "@/components/admin/IdeaRow";
import { MonthGrid } from "@/components/MonthGrid";
import { listClientPosts } from "@/lib/clientArea";
import { listIdeas } from "@/lib/editorialCalendar";
import { groupByMonth, MONTH_NAMES, nextMonths } from "@/lib/editorialMonths";

export const dynamic = "force-dynamic";

export default async function CalendarioPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ vista?: string; ano?: string; mes?: string }>;
}) {
  const { clientId } = await params;
  const now = new Date();
  const query = await searchParams;
  const year = Number(query.ano) || now.getFullYear();
  const monthly = query.vista === "mes";
  const month = Math.min(12, Math.max(1, Number(query.mes) || now.getMonth() + 1));
  const base = `/admin/area-do-cliente/${clientId}/calendario`;

  const switcher = (
    <div role="group" aria-label="Modo de visualização" className="inline-flex rounded-lg border border-neutral-300 p-0.5">
      {[
        { label: "Ano", href: `${base}?vista=ano&ano=${year}`, on: !monthly },
        { label: "Mês", href: `${base}?vista=mes&ano=${year}&mes=${month}`, on: monthly },
      ].map((t) => (
        <Link
          key={t.label}
          href={t.href}
          aria-current={t.on ? "true" : undefined}
          className={`inline-flex min-h-10 items-center rounded-md px-4 text-sm ${
            t.on ? "bg-neutral-900 font-medium text-white" : "text-neutral-600 hover:bg-neutral-100"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );

  if (monthly) {
    const pad = (n: number) => String(n).padStart(2, "0");
    const last = new Date(year, month, 0).getDate();
    const [ideas, posts] = await Promise.all([
      listIdeas(clientId, year, { includeInternal: true }),
      listClientPosts(clientId, `${year}-${pad(month)}-01`, `${year}-${pad(month)}-${pad(last)}`),
    ]);
    const monthIdeas = groupByMonth(ideas)[month - 1];
    const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
    const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
    const go = (d: { y: number; m: number }) => `${base}?vista=mes&ano=${d.y}&mes=${d.m}`;

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {switcher}
          <div className="flex items-center gap-3">
            <Link href={go(prev)} className="text-sm text-neutral-600 underline underline-offset-4">← Anterior</Link>
            <h2 className="min-w-36 text-center text-lg font-semibold">{MONTH_NAMES[month - 1]} {year}</h2>
            <Link href={go(next)} className="text-sm text-neutral-600 underline underline-offset-4">Próximo →</Link>
          </div>
        </div>

        <MonthGrid year={year} month={month} postDates={posts.map((p) => p.post_date)} today={now.toISOString().slice(0, 10)} />

        <section aria-labelledby="prog">
          <h3 id="prog" className="mb-1.5 text-sm font-semibold text-neutral-700">Programação de postagens</h3>
          {posts.length ? (
            <ul className="space-y-1.5">
              {posts.map((p) => (
                <li key={p.id} className="flex items-center gap-3 rounded-lg bg-neutral-50 px-3 py-2 text-sm">
                  <span className="w-10 shrink-0 font-semibold tabular-nums">{p.post_date.slice(8, 10)}/{p.post_date.slice(5, 7)}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{p.title || "Sem título"}</span>
                  <span className="text-xs capitalize text-neutral-500">{p.format}</span>
                  <span className={`rounded px-1.5 py-0.5 text-[11px] ${p.visible ? "bg-emerald-50 text-emerald-700" : "bg-neutral-200 text-neutral-600"}`}>
                    {p.visible ? "cliente vê" : "só equipe"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-neutral-500">Nenhuma postagem com data neste mês. Agende pelo quadro de Entregas.</p>
          )}
        </section>

        <section aria-labelledby="ideias-m">
          <h3 id="ideias-m" className="mb-1.5 text-sm font-semibold text-neutral-700">Ideias de {MONTH_NAMES[month - 1].toLowerCase()}</h3>
          <ul className="space-y-1.5">
            {monthIdeas.map((idea) => (
              <IdeaRow key={idea.id} idea={idea} clientId={clientId} />
            ))}
          </ul>
          {monthIdeas.length === 0 ? <p className="text-sm text-neutral-500">Nenhuma ideia neste mês.</p> : null}
        </section>

        <EditorialCapture clientId={clientId} months={nextMonths(now, 12)} />
      </div>
    );
  }

  const months = groupByMonth(await listIdeas(clientId, year, { includeInternal: true }));
  const filled = months.map((ideas, i) => ({ ideas, i })).filter((m) => m.ideas.length);
  const empty = months.map((ideas, i) => ({ ideas, i })).filter((m) => !m.ideas.length);
  const yearLink = (y: number) => `${base}?vista=ano&ano=${y}`;

  return (
    <div className="space-y-6">
      {switcher}
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
