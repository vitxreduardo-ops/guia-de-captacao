import Link from "next/link";
import { ChevronRight, HardDrive } from "lucide-react";
import {
  getPortalClient,
  getPortalSession,
  listPortalCards,
  listUpcoming,
} from "@/lib/clientPortal";
import { CreatorTag } from "@/components/CreatorTag";
import { listIdeasBetween } from "@/lib/editorialCalendar";
import { driveTitle, MONTH_NAMES, nextMonths } from "@/lib/editorialMonths";
import { PushPrompt } from "./PushPrompt";

export const dynamic = "force-dynamic";

const HEADING = { fontFamily: "Bootzy, sans-serif", letterSpacing: "0.02em" };

const firstOfMonth = (m: { year: number; month: number }) =>
  `${m.year}-${String(m.month).padStart(2, "0")}-01`;

function dayParts(date: string) {
  const d = new Date(`${date}T12:00:00`);
  return {
    day: d.getDate(),
    month: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
    weekday: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
  };
}

export default async function ClientePage() {
  const { clientId, preview, viewerId, viewerName } = await getPortalSession();
  const now = new Date();
  // Mês atual e os dois seguintes (pode virar o ano).
  const span = nextMonths(now, 3);
  const today = now.toISOString().slice(0, 10);
  const client = await getPortalClient(clientId);
  const [cards, ideas] = await Promise.all([
    listPortalCards(clientId),
    listIdeasBetween(clientId, firstOfMonth(span[0]), firstOfMonth(span[2]), {
      includeInternal: false,
    }),
  ]);

  const waiting = cards.filter((c) => !c.approved_at).length;
  const approved = cards.length - waiting;
  const upcoming = listUpcoming(cards, today);
  const firstName = viewerName || (client.contact_name || client.name).split(" ")[0];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl leading-none" style={HEADING}>
          Olá, {firstName}
        </h1>
        <p className="mt-2 text-[var(--tatu-muted)]">
          Acompanhe aqui o andamento do seu conteúdo com a Tatú Estúdio Criativo.
        </p>
      </header>

      <Link
        href="/cliente/materiais"
        className={`flex min-h-16 items-center justify-between gap-3 rounded-2xl px-5 py-4 transition-transform active:scale-[0.99] ${
          waiting
            ? "bg-[var(--tatu-ink)] text-[var(--tatu-cream)]"
            : "bg-white text-[var(--tatu-ink)]"
        }`}
      >
        <span>
          <span className="block text-lg font-semibold">
            {waiting} {waiting === 1 ? "material para aprovação" : "materiais para aprovação"}
          </span>
          <span className={`block text-sm ${waiting ? "opacity-80" : "text-[var(--tatu-muted)]"}`}>
            {cards.length
              ? `${approved} ${approved === 1 ? "aprovado" : "aprovados"} de ${cards.length}`
              : "Os materiais liberados pela nossa equipe ficarão disponíveis aqui."}
          </span>
        </span>
        <span className="flex items-center gap-1 text-sm">
          Abrir <ChevronRight className="size-4" aria-hidden />
        </span>
      </Link>

      {preview ? null : <PushPrompt />}

      {client.status === "published" ? (
        <Link
          href={`/galeria/${client.slug}?de=portal`}
          className="flex min-h-14 items-center gap-3 rounded-2xl border border-[var(--tatu-border)] px-5 py-3 font-semibold transition-colors hover:bg-white/60"
        >
          <HardDrive className="size-5 text-[var(--tatu-olive)]" aria-hidden />
          <span className="flex-1">{driveTitle(client.name, client.gallery_article)}</span>
          <ChevronRight className="size-4 text-[var(--tatu-muted)]" aria-hidden />
        </Link>
      ) : null}

      {upcoming.length ? (
      <section aria-labelledby="proximas">
        <h2 id="proximas" className="mb-2 text-2xl" style={HEADING}>
          Próximas postagens
        </h2>
        <ul>
          {upcoming.map((card) => {
            const { day, month, weekday } = dayParts(card.post_date!);
            return (
              <li key={card.id} className="flex items-center gap-4 border-b border-[var(--tatu-taupe)] py-3 last:border-b-0">
                <div className="flex w-14 shrink-0 flex-col items-center rounded-xl bg-[var(--tatu-ink)] py-1.5 text-[var(--tatu-cream)]">
                  <span className="text-[11px] uppercase tracking-wide opacity-80">{month}</span>
                  <span className="text-xl font-semibold leading-none">{day}</span>
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{card.title || "Sem título"}</p>
                  <p className="text-sm text-[var(--tatu-muted)]">
                    <span className="capitalize">{weekday}</span> · <span className="capitalize">{card.format}</span>
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
      ) : null}

      <section aria-labelledby="ideias">
        <h2 id="ideias" className="mb-3 text-2xl" style={HEADING}>
          Ideias para os próximos meses
        </h2>
        <div className="space-y-5">
          {span.map(({ year, month }) => {
            const list = ideas.filter((i) => i.month === `${year}-${String(month).padStart(2, "0")}-01`);
            return (
              <div key={`${year}-${month}`}>
                <h3 className="mb-1 flex items-baseline gap-2 text-lg font-semibold">
                  {MONTH_NAMES[month - 1]}
                  {list.length ? (
                    <span className="rounded-full bg-[var(--tatu-ink)] px-2 py-0.5 text-xs font-medium text-[var(--tatu-cream)]">
                      {list.length}
                    </span>
                  ) : null}
                </h3>
                {list.length ? (
                  <ul className="list-disc space-y-1.5 pl-5 marker:text-[var(--tatu-olive)]">
                    {list.slice(0, 4).map((idea) => (
                      <li key={idea.id}>
                        <span className="font-medium">{idea.title}</span>{" "}
                        <CreatorTag idea={idea} viewerId={viewerId} />
                        {idea.notes ? <span className="block text-sm text-[var(--tatu-muted)]">{idea.notes}</span> : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-[var(--tatu-muted)]">Nenhuma ideia registrada.</p>
                )}
              </div>
            );
          })}
        </div>
        <Link
          href="/cliente/calendario"
          className="mt-3 inline-flex min-h-11 items-center gap-1 font-medium underline underline-offset-4"
        >
          Ver o calendário completo e sugerir uma ideia <ChevronRight className="size-4" aria-hidden />
        </Link>
      </section>
    </div>
  );
}
