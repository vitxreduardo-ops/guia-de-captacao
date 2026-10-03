"use client";

import Link from "next/link";
import { CheckCircle2, Clock, MessageSquareMore } from "lucide-react";
import { useFormStatus } from "react-dom";
import type { PortalCard } from "@/lib/clientPortal";
import { approveCardAction, requestChangesAction } from "./actions";

function status(card: PortalCard) {
  if (card.approved_at)
    return { label: "Aprovado", Icon: CheckCircle2, tone: "bg-[var(--tatu-olive)] text-white" };
  if (card.changes_requested_at)
    return { label: "Ajuste solicitado", Icon: MessageSquareMore, tone: "bg-[var(--tatu-taupe)] text-[var(--tatu-ink)]" };
  return { label: "Aguardando sua aprovação", Icon: Clock, tone: "bg-[var(--tatu-ink)] text-[var(--tatu-cream)]" };
}

function Submit({ children, primary = false }: { children: string; primary?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className={`min-h-12 rounded-full px-5 font-semibold transition-opacity disabled:opacity-60 ${
        primary
          ? "w-full bg-[var(--tatu-ink)] text-[var(--tatu-cream)]"
          : "border border-[var(--tatu-border)]"
      }`}
    >
      {pending ? "Enviando…" : children}
    </button>
  );
}

export function CardItem({ card, readOnly = false }: { card: PortalCard; readOnly?: boolean }) {
  const s = status(card);
  return (
    <li className="overflow-hidden rounded-2xl bg-white">
      {card.cover_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={card.cover_url} alt="" className="aspect-[16/10] w-full object-cover" />
      ) : null}
      <div className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-lg font-semibold">{card.title || "Sem título"}</h3>
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${s.tone}`}>
            <s.Icon className="size-3.5" aria-hidden />
            {s.label}
          </span>
        </div>
        <p className="text-sm text-[var(--tatu-muted)]">
          <span className="capitalize">{card.format}</span>
          {card.post_date ? ` · ${new Date(`${card.post_date}T12:00:00`).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}` : ""}
        </p>
        {card.caption ? <p className="whitespace-pre-line text-sm">{card.caption}</p> : null}

        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm font-medium">
          {card.drive_url ? (
            <a href={card.drive_url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center underline underline-offset-4">
              Abrir material
            </a>
          ) : null}
          {card.guide ? (
            <Link href={`/guia/${card.guide.slug}`} className="inline-flex min-h-11 items-center underline underline-offset-4">
              Guia de captação
            </Link>
          ) : null}
        </div>

        {card.changes_requested_at && card.client_feedback ? (
          <p className="rounded-xl bg-[var(--tatu-cream)] p-3 text-sm">
            <span className="font-semibold">Ajuste solicitado:</span> {card.client_feedback}
          </p>
        ) : null}

        {!card.approved_at && !readOnly ? (
          <div className="space-y-2 pt-1">
            <form action={approveCardAction}>
              <input type="hidden" name="cardId" value={card.id} />
              <Submit primary>Aprovar</Submit>
            </form>
            <details className="group">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-center rounded-full border border-[var(--tatu-border)] font-semibold [&::-webkit-details-marker]:hidden group-open:hidden">
                Solicitar ajuste
              </summary>
              <form action={requestChangesAction} className="space-y-2">
                <input type="hidden" name="cardId" value={card.id} />
                <label className="block text-sm font-medium" htmlFor={`fb-${card.id}`}>
                  Qual ajuste você gostaria de solicitar?
                </label>
                <textarea
                  id={`fb-${card.id}`}
                  name="feedback"
                  required
                  rows={3}
                  className="w-full rounded-xl border border-[var(--tatu-border)] bg-white p-3"
                />
                <Submit>Enviar solicitação</Submit>
              </form>
            </details>
          </div>
        ) : null}
      </div>
    </li>
  );
}
