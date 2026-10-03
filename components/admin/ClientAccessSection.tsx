"use client";

import { useState, useTransition } from "react";
import { PortalAccessPanel } from "@/components/admin/PortalAccessPanel";
import { setGalleryArticleAction } from "@/app/admin/area-do-cliente/actions";
import { galleryTitle } from "@/lib/editorialMonths";

/** Acesso ao portal e título da galeria de um cliente. O "do/da" grava ao escolher. */
export function ClientAccessSection({
  clientId,
  name,
  login,
  article,
}: {
  clientId: string;
  name: string;
  login: string | null;
  article: "do" | "da";
}) {
  const [current, setCurrent] = useState(article);
  const [, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <section aria-labelledby="acesso" className="space-y-2">
        <h2 id="acesso" className="text-base font-semibold">Login do portal</h2>
        <PortalAccessPanel clientId={clientId} clientName={name} login={login} />
      </section>

      <section aria-labelledby="galeria" className="space-y-2">
        <h2 id="galeria" className="text-base font-semibold">Nome da galeria</h2>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={current}
            aria-label="Do ou da"
            onChange={(e) => {
              const next = e.target.value as "do" | "da";
              setCurrent(next);
              startTransition(() => setGalleryArticleAction(clientId, next));
            }}
            className="min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-sm"
          >
            <option value="do">Galeria do…</option>
            <option value="da">Galeria da…</option>
          </select>
          <p className="text-sm text-neutral-600">
            No portal: <strong>{galleryTitle(name, current)}</strong>
          </p>
        </div>
      </section>
    </div>
  );
}
