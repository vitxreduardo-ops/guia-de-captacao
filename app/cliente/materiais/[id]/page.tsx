import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { getPortalSession, listPortalCards } from "@/lib/clientPortal";
import { ReviewActions } from "../ReviewActions";
import { shortDate, StatusChip } from "../StatusChip";

export const dynamic = "force-dynamic";

const HEADING = { fontFamily: "Bootzy, sans-serif", letterSpacing: "0.02em" };

export default async function MaterialPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ v?: string }>;
}) {
  const { id } = await params;
  const view = (await searchParams).v === "aprovados" ? "aprovados" : "aguardando";
  const { clientId } = await getPortalSession();
  const cards = await listPortalCards(clientId);

  // A lista de onde o cliente veio dá o "2 de 20" e o anterior/próximo.
  const list = cards.filter((c) => (view === "aprovados" ? c.approved_at : !c.approved_at));
  const card = cards.find((c) => c.id === id);
  if (!card) notFound();
  const index = list.findIndex((c) => c.id === id);
  const prev = index > 0 ? list[index - 1] : null;
  const next = index >= 0 && index < list.length - 1 ? list[index + 1] : null;
  const back = view === "aprovados" ? "/cliente/materiais?v=aprovados" : "/cliente/materiais";
  const nav = (c: typeof card) => `/cliente/materiais/${c.id}?v=${view}`;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link href={back} className="inline-flex min-h-11 items-center gap-1 text-sm font-medium">
          <ChevronLeft className="size-4" aria-hidden /> Materiais
        </Link>
        {index >= 0 ? (
          <span className="text-sm text-[var(--tatu-muted)]">
            {index + 1} de {list.length}
          </span>
        ) : null}
      </div>

      {card.cover_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={card.cover_url} alt="" className="max-h-[60svh] w-full rounded-2xl bg-white object-contain" />
      ) : null}

      <header className="space-y-2">
        <h1 className="text-3xl leading-tight" style={HEADING}>
          {card.title || "Sem título"}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip card={card} />
          <span className="text-sm text-[var(--tatu-muted)]">
            <span className="capitalize">{card.format}</span>
            {card.post_date ? ` · ${shortDate(card.post_date)}` : ""}
          </span>
        </div>
        {card.approved_at && card.approver && card.approver.role !== "client" ? (
          <p className="text-sm text-[var(--tatu-muted)]">Aprovação registrada pela equipe da Tatú.</p>
        ) : null}
      </header>

      {!card.cover_url && !card.drive_url && !card.caption ? (
        <p className="rounded-2xl bg-white/60 p-4 text-sm text-[var(--tatu-muted)]">
          Os arquivos deste material ainda não foram anexados. Se precisar
          conferi-lo agora, fale com a nossa equipe.
        </p>
      ) : null}

      {card.drive_url ? (
        <a
          href={card.drive_url}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-[var(--tatu-ink)] font-semibold"
        >
          Abrir material <ExternalLink className="size-4" aria-hidden />
        </a>
      ) : null}

      {card.caption ? (
        <section aria-labelledby="legenda" className="rounded-2xl bg-white/60 p-4">
          <h2 id="legenda" className="mb-1 text-sm font-semibold text-[var(--tatu-muted)]">Legenda</h2>
          <p className="whitespace-pre-line">{card.caption}</p>
        </section>
      ) : null}

      {card.guide ? (
        <Link href={`/guia/${card.guide.slug}`} className="inline-flex min-h-11 items-center gap-1 text-sm font-medium underline underline-offset-4">
          Ver o roteiro desta gravação <ChevronRight className="size-4" aria-hidden />
        </Link>
      ) : null}

      {card.changes_requested_at && card.client_feedback && !card.approved_at ? (
        <p className="rounded-2xl bg-white p-3 text-sm">
          <span className="font-semibold">Ajuste solicitado:</span> {card.client_feedback}
        </p>
      ) : null}

      {!card.approved_at ? <ReviewActions cardId={card.id} /> : null}

      {prev || next ? (
        <nav aria-label="Outros materiais" className="flex items-center justify-between border-t border-[var(--tatu-taupe)] pt-3 text-sm">
          {prev ? (
            <Link href={nav(prev)} className="inline-flex min-h-11 items-center gap-1 font-medium">
              <ChevronLeft className="size-4" aria-hidden /> Anterior
            </Link>
          ) : <span />}
          {next ? (
            <Link href={nav(next)} className="inline-flex min-h-11 items-center gap-1 font-medium">
              Próximo <ChevronRight className="size-4" aria-hidden />
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
