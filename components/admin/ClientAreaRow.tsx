"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Eye } from "lucide-react";
import { PortalAccessPanel } from "@/components/admin/PortalAccessPanel";
import { setGalleryArticleAction } from "@/app/admin/area-do-cliente/acessos/actions";
import { galleryTitle } from "@/lib/editorialMonths";

/**
 * Uma linha por cliente com tudo da Área do cliente: o login do portal, como
 * a galeria se chama ("Galeria do 14Bis" / "Galeria da Dra. Juliana") e a
 * prévia. O "do/da" grava ao escolher, sem botão de salvar.
 */
export function ClientAreaRow({
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
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(article);
  const [, startTransition] = useTransition();

  return (
    <li className="space-y-3 px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="min-w-0 flex-1 basis-40 truncate font-medium">{name}</span>

        <label className="flex items-center gap-2 text-sm text-neutral-600">
          <span className="sr-only">Título da galeria</span>
          <select
            value={current}
            onChange={(e) => {
              const next = e.target.value as "do" | "da";
              setCurrent(next);
              startTransition(() => setGalleryArticleAction(clientId, next));
            }}
            className="min-h-11 rounded-lg border border-neutral-300 bg-white px-2 text-sm"
          >
            <option value="do">Galeria do</option>
            <option value="da">Galeria da</option>
          </select>
        </label>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={`min-h-11 rounded-full px-3 text-sm ${
            login
              ? "bg-emerald-50 text-emerald-700"
              : "border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
          }`}
        >
          {login ? "Portal ativo" : "Criar acesso"}
        </button>

        <Link
          href={`/cliente/previa?cliente=${clientId}`}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-neutral-300 px-3 text-sm hover:bg-neutral-50"
        >
          <Eye className="size-4" aria-hidden />
          Ver como o cliente
        </Link>
      </div>

      <p className="text-xs text-neutral-500">
        No portal: {galleryTitle(name, current)}
      </p>

      {open ? <PortalAccessPanel clientId={clientId} clientName={name} login={login} /> : null}
    </li>
  );
}
