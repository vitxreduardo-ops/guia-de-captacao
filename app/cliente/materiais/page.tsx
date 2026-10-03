import Link from "next/link";
import { ChevronRight, Clapperboard } from "lucide-react";
import { getPortalSession, listPortalCards } from "@/lib/clientPortal";
import { cardStatus, shortDate } from "./StatusChip";

export const dynamic = "force-dynamic";

const HEADING = { fontFamily: "Bootzy, sans-serif", letterSpacing: "0.02em" };

export default async function MateriaisPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string }>;
}) {
  const { clientId, preview } = await getPortalSession();
  const showApproved = (await searchParams).v === "aprovados";
  const cards = await listPortalCards(clientId);
  const waiting = cards.filter((c) => !c.approved_at);
  const done = cards.filter((c) => c.approved_at);
  const list = showApproved ? done : waiting;
  const view = showApproved ? "aprovados" : "aguardando";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-4xl leading-none" style={HEADING}>
          Materiais
        </h1>
        <p className="mt-2 text-[var(--tatu-muted)]">
          Abra cada material para conferir e registrar a sua aprovação.
        </p>
      </header>

      {preview ? (
        <p className="rounded-2xl bg-white p-3 text-sm text-[var(--tatu-muted)]">
          Você está na visualização do painel. Aprovações e solicitações feitas
          aqui ficam registradas como da equipe, em nome do cliente.
        </p>
      ) : null}

      <div role="group" aria-label="Filtrar materiais" className="inline-flex rounded-full border border-[var(--tatu-border)] p-1">
        {[
          { label: `Aguardando (${waiting.length})`, href: "/cliente/materiais", on: !showApproved },
          { label: `Aprovados (${done.length})`, href: "/cliente/materiais?v=aprovados", on: showApproved },
        ].map((t) => (
          <Link
            key={t.label}
            href={t.href}
            aria-current={t.on ? "true" : undefined}
            className={`inline-flex min-h-10 items-center rounded-full px-4 text-sm ${
              t.on ? "bg-[var(--tatu-ink)] font-semibold text-[var(--tatu-cream)]" : "text-[var(--tatu-muted)]"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {list.length ? (
        <ul>
          {list.map((card) => {
            const s = cardStatus(card);
            return (
              <li key={card.id} className="border-b border-[var(--tatu-taupe)] last:border-b-0">
                <Link
                  href={`/cliente/materiais/${card.id}?v=${view}`}
                  className="flex min-h-[4.5rem] items-center gap-3 py-3 hover:text-[var(--tatu-olive)]"
                >
                  {card.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={card.cover_url} alt="" className="size-14 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-white/70 text-[var(--tatu-olive)]">
                      <Clapperboard className="size-6" strokeWidth={1.6} aria-hidden />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{card.title || "Sem título"}</span>
                    <span className="block truncate text-sm text-[var(--tatu-muted)]">
                      <span className="capitalize">{card.format}</span>
                      {card.post_date ? ` · ${shortDate(card.post_date)}` : ""}
                    </span>
                    {card.changes_requested_at && !card.approved_at ? (
                      <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-[var(--tatu-olive)]">
                        <s.Icon className="size-3.5" aria-hidden />
                        {s.label}
                      </span>
                    ) : null}
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-[var(--tatu-muted)]" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-[var(--tatu-muted)]">
          {showApproved ? "Nenhum material aprovado até o momento." : "Nenhum material aguardando aprovação."}
        </p>
      )}
    </div>
  );
}
