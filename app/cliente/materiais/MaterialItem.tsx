"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronRight, Clapperboard, MessageSquareMore } from "lucide-react";
import { useAttachMedia } from "./AttachMedia";
import { MaterialViewer, type ViewerItem } from "./MaterialViewer";
import { ReviewActions } from "./ReviewActions";

export interface MaterialView {
  id: string;
  title: string;
  format: string;
  dateLabel: string | null;
  cover_url: string | null;
  drive_url: string | null;
  caption: string;
  approved: boolean;
  changesRequested: boolean;
  feedback: string;
  approvedByTeam: boolean;
  mediaIds: string[];
  guide: { slug: string; title: string } | null;
  items: ViewerItem[];
}

/**
 * Um material, minimizado: miniatura, título e data. Ao abrir mostra a prévia,
 * a legenda e as decisões. Aprovados não levam etiqueta: a aba já diz isso.
 */
export function MaterialItem({
  material,
  defaultOpen = false,
}: {
  material: MaterialView;
  defaultOpen?: boolean;
}) {
  const [opened, setOpened] = useState(defaultOpen);
  const details = useRef<HTMLDetailsElement>(null);

  // Se a pessoa tocou antes de a página carregar, o navegador já abriu o
  // <details> sem avisar o React: sincroniza ao montar.
  useEffect(() => {
    if (details.current?.open) queueMicrotask(() => setOpened(true));
  }, []);
  const attach = useAttachMedia();
  const thumb = material.items.find((i) => i.kind === "image")?.thumbSrc ?? material.cover_url;

  return (
    <li className="border-b border-[var(--tatu-taupe)] last:border-b-0">
      <details
        ref={details}
        open={defaultOpen || undefined}
        onToggle={(e) => setOpened(e.currentTarget.open)}
        className="group"
      >
        <summary className="flex min-h-[4.5rem] cursor-pointer list-none items-center gap-3 py-3 [&::-webkit-details-marker]:hidden">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt="" className="size-14 shrink-0 rounded-xl object-cover" />
          ) : (
            <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-white/70 text-[var(--tatu-olive)]">
              <Clapperboard className="size-6" strokeWidth={1.6} aria-hidden />
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{material.title || "Sem título"}</span>
            <span className="block truncate text-sm text-[var(--tatu-muted)]">
              <span className="capitalize">{material.format}</span>
              {material.dateLabel ? ` · ${material.dateLabel}` : ""}
            </span>
            {material.changesRequested && !material.approved ? (
              <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-[var(--tatu-olive)]">
                <MessageSquareMore className="size-3.5" aria-hidden /> Ajuste solicitado
              </span>
            ) : null}
          </span>
          <ChevronRight className="size-4 shrink-0 text-[var(--tatu-muted)] transition-transform group-open:rotate-90" aria-hidden />
        </summary>

        {opened ? (
          <div className="space-y-4 pb-5">
            <MaterialViewer items={material.items} coverUrl={material.cover_url} driveUrl={material.drive_url} />

            {attach ? (
              <button
                type="button"
                onClick={() =>
                  attach({
                    id: material.id,
                    title: material.title,
                    mediaIds: material.mediaIds,
                    driveUrl: material.drive_url ?? "",
                  })
                }
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-dashed border-[var(--tatu-ink)] px-4 text-sm font-semibold"
              >
                Conectar arquivos do Drive ({material.mediaIds.length}) · só equipe
              </button>
            ) : null}

            {material.caption ? (
              <section aria-label="Legenda" className="rounded-2xl bg-white/60 p-4">
                <h3 className="mb-1 text-sm font-semibold text-[var(--tatu-muted)]">Legenda</h3>
                <p className="whitespace-pre-line">{material.caption}</p>
              </section>
            ) : null}

            {material.guide ? (
              <Link
                href={`/guia/${material.guide.slug}?de=portal`}
                className="inline-flex min-h-11 items-center gap-1 text-sm font-medium underline underline-offset-4"
              >
                Ver o roteiro desta gravação <ChevronRight className="size-4" aria-hidden />
              </Link>
            ) : null}

            {material.changesRequested && material.feedback && !material.approved ? (
              <p className="rounded-2xl bg-white p-3 text-sm">
                <span className="font-semibold">Ajuste solicitado:</span> {material.feedback}
              </p>
            ) : null}

            {material.approved && material.approvedByTeam ? (
              <p className="text-sm text-[var(--tatu-muted)]">Aprovação registrada pela equipe da Tatú.</p>
            ) : null}

            {!material.approved ? <ReviewActions cardId={material.id} /> : null}
          </div>
        ) : null}
      </details>
    </li>
  );
}
