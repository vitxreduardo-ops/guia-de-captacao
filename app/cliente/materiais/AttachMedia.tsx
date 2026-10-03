"use client";

import { createContext, useContext, useRef, useState, useTransition } from "react";
import { X } from "lucide-react";
import { MediaPicker, type PickerImage } from "@/components/admin/MediaPicker";
import { attachMaterialMediaAction } from "../actions";

interface Target {
  id: string;
  title: string;
  mediaIds: string[];
  driveUrl: string;
}

const AttachContext = createContext<((target: Target) => void) | null>(null);

/** Abre a janela de "conectar arquivos"; nulo para o cliente (só a equipe tem). */
export const useAttachMedia = () => useContext(AttachContext);

/**
 * Janela única, aberta pela equipe na prévia do portal, para ligar a um
 * material os arquivos que já estão no Drive do cliente (galeria), ou um link.
 */
export function AttachMediaProvider({
  images,
  children,
}: {
  images: PickerImage[];
  children: React.ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [target, setTarget] = useState<Target | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [link, setLink] = useState("");
  const [pending, startTransition] = useTransition();

  function open(next: Target) {
    setTarget(next);
    setSelected(next.mediaIds);
    setLink(next.driveUrl);
    dialog.current?.showModal();
  }

  return (
    <AttachContext.Provider value={open}>
      {children}
      <dialog
        ref={dialog}
        aria-labelledby="attach-title"
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
        className="m-auto w-[min(92vw,42rem)] max-w-none rounded-2xl bg-white p-0 text-neutral-900 backdrop:bg-black/50"
      >
        <div className="space-y-3 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="attach-title" className="text-lg font-semibold">Conectar arquivos do Drive</h2>
              <p className="text-sm text-neutral-500">{target?.title} · visível só para a equipe</p>
            </div>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              aria-label="Fechar"
              className="-m-2 grid size-11 place-items-center rounded-full hover:bg-neutral-100"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>

          <p className="text-xs font-medium text-neutral-600">
            Arquivos da galeria ({selected.length} selecionado{selected.length === 1 ? "" : "s"})
          </p>
          <MediaPicker
            images={images}
            selected={selected}
            onChange={setSelected}
          />

          <label className="block text-xs font-medium text-neutral-600">
            Ou link do Drive (opcional)
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              type="url"
              placeholder="https://drive.google.com/…"
              className="mt-1 min-h-11 w-full rounded-md border border-neutral-300 px-3 text-sm font-normal"
            />
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending || !target}
              onClick={() =>
                startTransition(async () => {
                  if (!target) return;
                  await attachMaterialMediaAction(target.id, selected, link);
                  dialog.current?.close();
                })
              }
              className="min-h-11 rounded-md bg-neutral-900 px-4 text-sm font-medium text-white disabled:opacity-50"
            >
              {pending ? "Salvando…" : "Salvar"}
            </button>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className="min-h-11 rounded-md border border-neutral-300 px-4 text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      </dialog>
    </AttachContext.Provider>
  );
}
