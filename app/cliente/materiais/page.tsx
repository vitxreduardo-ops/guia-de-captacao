import Link from "next/link";
import { getPortalSession, listMediaForCards, listPortalCards } from "@/lib/clientPortal";
import { toPickerImages, getGalleryClientWithImages } from "@/lib/galleries";
import { AttachMediaProvider } from "./AttachMedia";
import { MaterialItem } from "./MaterialItem";
import { shortDate } from "./StatusChip";

export const dynamic = "force-dynamic";

const HEADING = { fontFamily: "Bootzy, sans-serif", letterSpacing: "0.02em" };

function Wrapper({
  images,
  children,
}: {
  images: ReturnType<typeof toPickerImages> | null;
  children: React.ReactNode;
}) {
  return images ? <AttachMediaProvider images={images}>{children}</AttachMediaProvider> : <>{children}</>;
}

export default async function MateriaisPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string; abrir?: string }>;
}) {
  const { clientId, preview } = await getPortalSession();
  const query = await searchParams;
  const showApproved = query.v === "aprovados";
  const open = query.abrir;
  const cards = await listPortalCards(clientId);
  const media = await listMediaForCards(clientId, cards);
  // Só a equipe (prévia) conecta arquivos; o cliente nem recebe a lista.
  const pickerImages = preview ? toPickerImages((await getGalleryClientWithImages(clientId))?.images ?? []) : null;
  const waiting = cards.filter((c) => !c.approved_at);
  const done = cards.filter((c) => c.approved_at);
  const list = showApproved ? done : waiting;

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
        <Wrapper images={pickerImages}>
        <ul>
          {list.map((card) => (
            <MaterialItem
              key={card.id}
              defaultOpen={card.id === open}
              material={{
                id: card.id,
                title: card.title,
                format: card.format,
                dateLabel: card.post_date ? shortDate(card.post_date) : null,
                cover_url: card.cover_url,
                drive_url: card.drive_url,
                caption: card.caption,
                approved: Boolean(card.approved_at),
                changesRequested: Boolean(card.changes_requested_at),
                feedback: card.client_feedback,
                approvedByTeam: Boolean(card.approver && card.approver.role !== "client"),
                mediaIds: card.media_image_ids ?? [],
                guide: card.guide,
                items: media[card.id] ?? [],
              }}
            />
          ))}
        </ul>
        </Wrapper>
      ) : (
        <p className="text-[var(--tatu-muted)]">
          {showApproved ? "Nenhum material aprovado até o momento." : "Nenhum material aguardando aprovação."}
        </p>
      )}
    </div>
  );
}
