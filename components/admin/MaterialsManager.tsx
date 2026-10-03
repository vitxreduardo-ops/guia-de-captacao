"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { deleteMaterialAction } from "@/app/admin/area-do-cliente/actions";
import {
  MaterialForm,
  type ColumnOption,
  type PickerImage,
} from "@/components/admin/MaterialForm";

export interface MaterialRowData {
  id: string;
  title: string;
  format: string;
  post_date: string | null;
  caption: string;
  drive_url: string | null;
  guide_id: string | null;
  media_image_ids: string[];
  column_id: string;
  column_name: string;
  column_visible: boolean;
  status: "approved" | "changes" | "waiting";
}

const STATUS = {
  approved: { label: "Aprovado", tone: "bg-emerald-50 text-emerald-700" },
  changes: { label: "Ajuste solicitado", tone: "bg-amber-50 text-amber-800" },
  waiting: { label: "Aguardando", tone: "bg-neutral-100 text-neutral-700" },
};

export function MaterialsManager({
  clientId,
  rows,
  columns,
  guides,
  images,
}: {
  clientId: string;
  rows: MaterialRowData[];
  columns: ColumnOption[];
  guides: { id: string; title: string }[];
  images: PickerImage[];
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-neutral-600">
          Materiais que o cliente confere e aprova no portal. Só aparecem para
          ele os que estão em colunas liberadas.
        </p>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          aria-expanded={creating}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md bg-neutral-900 px-4 text-sm font-medium text-white"
        >
          <Plus className="size-4" aria-hidden /> Novo material
        </button>
      </div>

      {columns.length && !columns.some((c) => c.visible) ? (
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          Nenhuma coluna está liberada ao cliente. Libere uma em Área do cliente → Materiais visíveis, senão ele não verá nada.
        </p>
      ) : null}

      {creating ? (
        <div className="rounded-xl border border-neutral-200 p-4">
          <MaterialForm clientId={clientId} columns={columns} guides={guides} images={images} onDone={() => setCreating(false)} />
        </div>
      ) : null}

      {rows.length ? (
        <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200">
          {rows.map((row) => (
            <li key={row.id} className="px-4 py-3">
              {editing === row.id ? (
                <MaterialForm
                  clientId={clientId}
                  columns={columns}
                  guides={guides}
                  images={images}
                  onDone={() => setEditing(null)}
                  initial={{
                    id: row.id,
                    title: row.title,
                    format: row.format,
                    post_date: row.post_date ?? "",
                    caption: row.caption,
                    drive_url: row.drive_url ?? "",
                    guide_id: row.guide_id ?? "",
                    column_id: row.column_id,
                    media_image_ids: row.media_image_ids,
                  }}
                />
              ) : (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <div className="min-w-0 flex-1 basis-48">
                    <p className="truncate font-medium">{row.title}</p>
                    <p className="text-xs text-neutral-500">
                      <span className="capitalize">{row.format}</span>
                      {row.post_date ? ` · ${row.post_date.split("-").reverse().join("/")}` : ""}
                      {` · ${row.media_image_ids.length} arquivo${row.media_image_ids.length === 1 ? "" : "s"}`}
                    </p>
                  </div>
                  <span className={`rounded px-1.5 py-0.5 text-xs ${row.column_visible ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-600"}`}>
                    {row.column_name || "Sem coluna"} · {row.column_visible ? "cliente vê" : "só equipe"}
                  </span>
                  <span className={`rounded px-1.5 py-0.5 text-xs ${STATUS[row.status].tone}`}>{STATUS[row.status].label}</span>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => setEditing(row.id)} aria-label={`Editar ${row.title}`} className="grid size-11 place-items-center rounded-md hover:bg-neutral-100">
                      <Pencil className="size-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      aria-label={`Excluir ${row.title}`}
                      onClick={() => {
                        if (window.confirm(`Excluir "${row.title}"? O card some do quadro de Entregas também.`)) {
                          startTransition(() => deleteMaterialAction(row.id, clientId));
                        }
                      }}
                      className="grid size-11 place-items-center rounded-md text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-neutral-500">Nenhum material deste cliente ainda.</p>
      )}
    </div>
  );
}
