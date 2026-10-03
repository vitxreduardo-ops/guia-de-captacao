"use client";

import { useState, useTransition } from "react";
import { Check, Film } from "lucide-react";
import {
  createMaterialAction,
  updateMaterialAction,
} from "@/app/admin/area-do-cliente/actions";

export interface PickerImage {
  id: string;
  thumb: string;
  folder: string;
  caption: string;
  video: boolean;
}
export interface ColumnOption {
  id: string;
  name: string;
  visible: boolean;
}
export interface MaterialValues {
  id?: string;
  title: string;
  format: string;
  post_date: string;
  caption: string;
  drive_url: string;
  guide_id: string;
  column_id: string;
  media_image_ids: string[];
}

const field = "min-h-11 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm";
const label = "block text-xs font-medium text-neutral-600";

/**
 * Cria ou edita um material para aprovação. Os arquivos saem da galeria do
 * cliente (já sincronizada com o Drive): a equipe marca as miniaturas, sem
 * subir nada de novo. O link do Drive é a alternativa pra quem ainda não
 * sincronizou a pasta.
 */
export function MaterialForm({
  clientId,
  columns,
  guides,
  images,
  initial,
  onDone,
}: {
  clientId: string;
  columns: ColumnOption[];
  guides: { id: string; title: string }[];
  images: PickerImage[];
  initial?: MaterialValues;
  onDone?: () => void;
}) {
  const defaultColumn = initial?.column_id ?? columns.find((c) => c.visible)?.id ?? columns[0]?.id ?? "";
  const [selected, setSelected] = useState<string[]>(initial?.media_image_ids ?? []);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const folders = Map.groupBy(images, (i) => i.folder || "Raiz");

  function toggle(id: string) {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const form = e.currentTarget;
        const data = new FormData(form);
        data.set("clientId", clientId);
        if (initial?.id) data.set("id", initial.id);
        startTransition(async () => {
          try {
            await (initial?.id ? updateMaterialAction(data) : createMaterialAction(data));
            if (!initial?.id) {
              form.reset();
              setSelected([]);
            }
            onDone?.();
          } catch {
            setError("Não foi possível salvar. Confira os campos e tente de novo.");
          }
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={`${label} sm:col-span-2`}>
          Título
          <input name="title" required defaultValue={initial?.title} className={`${field} mt-1 font-normal`} />
        </label>
        <label className={label}>
          Formato
          <select name="format" defaultValue={initial?.format ?? "reel"} className={`${field} mt-1 font-normal`}>
            <option value="reel">Reel</option>
            <option value="carrossel">Carrossel</option>
            <option value="foto">Foto</option>
            <option value="story">Story</option>
          </select>
        </label>
        <label className={label}>
          Data de postagem (opcional)
          <input type="date" name="post_date" defaultValue={initial?.post_date} className={`${field} mt-1 font-normal`} />
        </label>
        <label className={`${label} sm:col-span-2`}>
          Legenda (opcional)
          <textarea name="caption" rows={3} defaultValue={initial?.caption} className="mt-1 w-full rounded-md border border-neutral-300 bg-white p-3 text-sm font-normal" />
        </label>
        <label className={label}>
          Roteiro (opcional)
          <select name="guide_id" defaultValue={initial?.guide_id ?? ""} className={`${field} mt-1 font-normal`}>
            <option value="">Nenhum</option>
            {guides.map((g) => (
              <option key={g.id} value={g.id}>{g.title}</option>
            ))}
          </select>
        </label>
        <label className={label}>
          Coluna
          <select name="column_id" defaultValue={defaultColumn} className={`${field} mt-1 font-normal`}>
            {columns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.visible ? "(cliente vê)" : "(só equipe)"}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset>
        <legend className={label}>Arquivos da galeria ({selected.length} selecionado{selected.length === 1 ? "" : "s"})</legend>
        {images.length ? (
          <div className="mt-1 max-h-72 space-y-3 overflow-y-auto rounded-md border border-neutral-200 p-2">
            {[...folders.entries()].map(([folder, list]) => (
              <div key={folder}>
                <p className="mb-1 text-xs font-medium text-neutral-500">{folder}</p>
                <ul className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
                  {list.map((img) => {
                    const on = selected.includes(img.id);
                    return (
                      <li key={img.id}>
                        <label className="relative block aspect-square cursor-pointer overflow-hidden rounded-md bg-neutral-100">
                          <input
                            type="checkbox"
                            name="media_image_ids"
                            value={img.id}
                            checked={on}
                            onChange={() => toggle(img.id)}
                            className="peer sr-only"
                          />
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.thumb} alt={img.caption} loading="lazy" className="size-full object-cover" />
                          {img.video ? (
                            <Film className="absolute bottom-1 left-1 size-4 text-white drop-shadow" aria-hidden />
                          ) : null}
                          <span className="absolute inset-0 hidden bg-neutral-900/40 peer-checked:block" />
                          <span className="absolute right-1 top-1 hidden size-5 place-items-center rounded-full bg-neutral-900 text-white peer-checked:grid">
                            <Check className="size-3.5" aria-hidden />
                          </span>
                          <span className="absolute inset-0 ring-neutral-900 peer-focus-visible:ring-2" />
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-1 text-sm text-neutral-500">
            A galeria deste cliente ainda não tem arquivos. Sincronize a pasta do Drive em Galerias ou use o link abaixo.
          </p>
        )}
      </fieldset>

      <label className={label}>
        Ou link do Drive (opcional)
        <input name="drive_url" type="url" placeholder="https://drive.google.com/…" defaultValue={initial?.drive_url} className={`${field} mt-1 font-normal`} />
      </label>

      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
      <div className="flex gap-2">
        <button disabled={pending} className="min-h-11 rounded-md bg-neutral-900 px-4 text-sm font-medium text-white disabled:opacity-50">
          {pending ? "Salvando…" : initial?.id ? "Salvar alterações" : "Salvar e liberar"}
        </button>
        {initial?.id ? (
          <button type="button" onClick={onDone} className="min-h-11 rounded-md border border-neutral-300 px-4 text-sm">
            Cancelar
          </button>
        ) : null}
      </div>
    </form>
  );
}
