import { CheckCircle2, Clock, MessageSquareMore } from "lucide-react";
import type { PortalCard } from "@/lib/clientPortal";

export function cardStatus(card: PortalCard) {
  if (card.approved_at)
    return { label: "Aprovado", Icon: CheckCircle2, tone: "bg-[var(--tatu-olive)] text-white" };
  if (card.changes_requested_at)
    return { label: "Ajuste solicitado", Icon: MessageSquareMore, tone: "bg-[var(--tatu-taupe)] text-[var(--tatu-ink)]" };
  return { label: "Aguardando aprovação", Icon: Clock, tone: "bg-[var(--tatu-ink)] text-[var(--tatu-cream)]" };
}

export function StatusChip({ card }: { card: PortalCard }) {
  const s = cardStatus(card);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${s.tone}`}>
      <s.Icon className="size-3.5" aria-hidden />
      {s.label}
    </span>
  );
}

export const shortDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR", { day: "numeric", month: "short" }).replace(".", "");
