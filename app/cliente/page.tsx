import Link from "next/link";
import {
  getPortalClient,
  listPortalCards,
  requirePortalUser,
  type PortalCard,
} from "@/lib/clientPortal";
import { approveCardAction, requestChangesAction } from "./actions";

export const dynamic = "force-dynamic";

function status(card: PortalCard) {
  if (card.approved_at) return { label: "Aprovado", tone: "bg-emerald-100 text-emerald-800" };
  if (card.changes_requested_at)
    return { label: "Ajuste pedido", tone: "bg-amber-100 text-amber-800" };
  return { label: "Aguardando você", tone: "bg-sky-100 text-sky-800" };
}

function formatDate(date: string) {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

function CardItem({ card }: { card: PortalCard }) {
  const s = status(card);
  return (
    <li className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex items-start gap-3">
        {card.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={card.cover_url}
            alt=""
            className="h-20 w-20 shrink-0 rounded-lg object-cover"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-medium">{card.title || "Sem título"}</h3>
            <span className={`rounded-full px-2 py-0.5 text-xs ${s.tone}`}>{s.label}</span>
          </div>
          <p className="mt-0.5 text-xs text-neutral-500">
            {card.format}
            {card.post_date ? ` · ${formatDate(card.post_date)}` : ""}
          </p>
          {card.caption ? (
            <p className="mt-2 whitespace-pre-line text-sm text-neutral-700">{card.caption}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {card.drive_url ? (
              <a href={card.drive_url} target="_blank" rel="noreferrer" className="underline">
                Ver material
              </a>
            ) : null}
            {card.guide ? (
              <Link href={`/guia/${card.guide.slug}`} className="underline">
                Guia de captação
              </Link>
            ) : null}
          </div>
          {card.changes_requested_at && card.client_feedback ? (
            <p className="mt-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-900">
              Você pediu: {card.client_feedback}
            </p>
          ) : null}
        </div>
      </div>

      {!card.approved_at ? (
        <div className="mt-3 flex flex-col gap-2 border-t border-neutral-100 pt-3 sm:flex-row sm:items-start">
          <form action={approveCardAction}>
            <input type="hidden" name="cardId" value={card.id} />
            <button className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white">
              Aprovar
            </button>
          </form>
          <form action={requestChangesAction} className="flex flex-1 gap-2">
            <input type="hidden" name="cardId" value={card.id} />
            <input
              name="feedback"
              required
              placeholder="O que ajustar?"
              className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
            <button className="rounded-lg border border-neutral-300 px-4 py-2 text-sm">
              Pedir ajuste
            </button>
          </form>
        </div>
      ) : null}
    </li>
  );
}

export default async function ClientePage() {
  const user = await requirePortalUser();
  const [client, cards] = await Promise.all([
    getPortalClient(user.client_id),
    listPortalCards(user.client_id),
  ]);
  const pending = cards.filter((c) => !c.approved_at);
  const done = cards.filter((c) => c.approved_at);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">{client.name}</h1>
        {client.status === "published" ? (
          <Link href={`/galeria/${client.slug}`} className="mt-1 inline-block text-sm underline">
            Ver galeria de fotos
          </Link>
        ) : null}
      </div>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">
          Para aprovar ({pending.length})
        </h2>
        {pending.length ? (
          <ul className="space-y-3">{pending.map((c) => <CardItem key={c.id} card={c} />)}</ul>
        ) : (
          <p className="text-sm text-neutral-500">Nada esperando você.</p>
        )}
      </section>

      {done.length ? (
        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">
            Aprovados ({done.length})
          </h2>
          <ul className="space-y-3">{done.map((c) => <CardItem key={c.id} card={c} />)}</ul>
        </section>
      ) : null}
    </div>
  );
}
