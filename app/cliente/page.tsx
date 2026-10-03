import Link from "next/link";
import { ChevronRight, Images, BookOpenText } from "lucide-react";
import {
  getPortalClient,
  getPortalSession,
  listPortalCards,
  listPortalGuides,
  listUpcoming,
} from "@/lib/clientPortal";
import { CreatorTag } from "@/components/CreatorTag";
import { listIdeasBetween } from "@/lib/editorialCalendar";
import {
  galleryTitle,
  MONTH_NAMES,
  nextMonths,
  pendingSummary,
} from "@/lib/editorialMonths";

export const dynamic = "force-dynamic";

const firstOfMonth = (m: { year: number; month: number }) =>
  `${m.year}-${String(m.month).padStart(2, "0")}-01`;

const HEADING = { fontFamily: "Bootzy, sans-serif", letterSpacing: "0.02em" };

function dayParts(date: string) {
  const d = new Date(`${date}T12:00:00`);
  return {
    day: d.getDate(),
    month: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
    weekday: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
  };
}

function RowLink({ href, icon: Icon, children }: { href: string; icon: typeof Images; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex min-h-14 items-center gap-3 border-b border-[var(--tatu-taupe)] py-3 last:border-b-0 hover:text-[var(--tatu-olive)]"
    >
      <Icon className="size-5 shrink-0 text-[var(--tatu-olive)]" strokeWidth={1.8} aria-hidden />
      <span className="flex-1">{children}</span>
      <ChevronRight className="size-4 text-[var(--tatu-muted)]" aria-hidden />
    </Link>
  );
}

export default async function ClientePage() {
  const { clientId } = await getPortalSession();
  const now = new Date();
  // Mês atual e os dois seguintes (pode virar o ano).
  const span = nextMonths(now, 3);
  const today = now.toISOString().slice(0, 10);
  const [client, cards, ideas] = await Promise.all([
    getPortalClient(clientId),
    listPortalCards(clientId),
    listIdeasBetween(clientId, firstOfMonth(span[0]), firstOfMonth(span[2]), {
      includeInternal: false,
    }),
  ]);

  const waiting = cards.filter((c) => !c.approved_at && !c.changes_requested_at).length;
  const changes = cards.filter((c) => !c.approved_at && c.changes_requested_at).length;
  const summary = pendingSummary(waiting, changes);
  const upcoming = listUpcoming(cards, today);
  const approved = cards.filter((c) => c.approved_at).length;
  const guides = listPortalGuides(cards);
  const firstName = (client.contact_name || client.name).split(" ")[0];

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-4xl leading-none" style={HEADING}>
          Oi, {firstName}
        </h1>
        <p className="mt-2 text-[var(--tatu-muted)]">
          Aqui você acompanha tudo que a gente está fazendo pra {client.name}.
        </p>
      </header>

      <Link
        href="/cliente/materiais"
        className={`flex min-h-14 items-center justify-between gap-3 rounded-2xl px-5 py-4 transition-transform active:scale-[0.99] ${
          summary
            ? "bg-[var(--tatu-ink)] text-[var(--tatu-cream)]"
            : "bg-white text-[var(--tatu-ink)]"
        }`}
      >
        <span>
          <span className="block font-medium">
            {summary ?? (cards.length ? "Tudo conferido por aqui" : "Seus materiais")}
          </span>
          <span className={`block text-sm ${summary ? "opacity-80" : "text-[var(--tatu-muted)]"}`}>
            {cards.length
              ? `${approved} ${approved === 1 ? "aprovado" : "aprovados"} de ${cards.length}`
              : "Quando a gente liberar os primeiros, eles aparecem aqui."}
          </span>
        </span>
        <span className="flex items-center gap-1 text-sm">
          {summary ? "Conferir" : "Ver"} <ChevronRight className="size-4" aria-hidden />
        </span>
      </Link>

      <section aria-labelledby="proximas">
        <h2 id="proximas" className="mb-3 text-2xl" style={HEADING}>
          Próximas postagens
        </h2>
        {upcoming.length ? (
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
                    <p className="text-sm capitalize text-[var(--tatu-muted)]">
                      {weekday} · {card.format}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-[var(--tatu-muted)]">
            Quando a gente marcar a próxima postagem, ela aparece aqui.
          </p>
        )}
      </section>

      <section aria-labelledby="ideias">
        <h2 id="ideias" className="mb-3 text-2xl" style={HEADING}>
          Ideias para os próximos meses
        </h2>
        <div className="space-y-4">
          {span.map(({ year, month }) => {
            const list = ideas.filter((i) => i.month === `${year}-${String(month).padStart(2, "0")}-01`);
            return (
              <div key={`${year}-${month}`}>
                <h3 className="mb-1.5 text-sm font-semibold uppercase tracking-wide text-[var(--tatu-muted)]">
                  {MONTH_NAMES[month - 1]}
                </h3>
                {list.length ? (
                  <ul className="space-y-2">
                    {list.slice(0, 3).map((idea) => (
                      <li key={idea.id} className="rounded-2xl bg-white/60 px-4 py-3">
                        <p className="font-medium">
                          {idea.title} <CreatorTag idea={idea} viewerIsClient />
                        </p>
                        {idea.notes ? <p className="text-sm text-[var(--tatu-muted)]">{idea.notes}</p> : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-[var(--tatu-muted)]">Ainda sem ideias.</p>
                )}
              </div>
            );
          })}
        </div>
        <Link
          href="/cliente/calendario"
          className="mt-3 inline-flex min-h-11 items-center gap-1 font-medium underline underline-offset-4"
        >
          Ver o ano todo e anotar uma ideia <ChevronRight className="size-4" aria-hidden />
        </Link>
      </section>

      {client.status === "published" || guides.length ? (
        <section aria-labelledby="tudo">
          <h2 id="tudo" className="mb-1 text-2xl" style={HEADING}>
            Seus arquivos
          </h2>
          <div>
            {client.status === "published" ? (
              <RowLink href={`/galeria/${client.slug}`} icon={Images}>
                {galleryTitle(client.name, client.gallery_article)}
              </RowLink>
            ) : null}
            {guides.map((guide) => (
              <RowLink key={guide.slug} href={`/guia/${guide.slug}`} icon={BookOpenText}>
                Guia de captação: {guide.title}
              </RowLink>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
