"use client";

import { Trash2 } from "lucide-react";
import type { ReactNode } from "react";

const FOCUS_RING =
  "focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-1 focus-visible:outline-none";

export const FIELD_CLASS =
  "w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none";

/** O rótulo miúdo em caixa alta que nomeia cada campo do painel. */
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-500">
        {label}
      </span>
      {children}
    </label>
  );
}

/**
 * Uma lista que cresce e encolhe: serviços, projetos, logos, pacotes,
 * perguntas. O que muda entre elas é só o que vai dentro de cada item, então
 * quem chama desenha a linha e este componente cuida de adicionar, remover e
 * do estado vazio.
 *
 * Sem arrastar para reordenar: quando alguém precisar, o array já suporta e o
 * projeto já tem dnd-kit.
 */
export function RepeatableList<T>({
  items,
  onChange,
  novoItem,
  rotulo,
  vazio,
  children,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  /** Como nasce um item novo. */
  novoItem: () => T;
  /** O nome de um item, para o botão e para o título de cada linha. */
  rotulo: string;
  vazio?: string;
  children: (item: T, trocar: (item: T) => void, index: number) => ReactNode;
}) {
  function trocarEm(index: number) {
    return (item: T) =>
      onChange(items.map((atual, i) => (i === index ? item : atual)));
  }

  return (
    <div className="space-y-2">
      {items.length === 0 && vazio ? (
        <p className="rounded-md border border-dashed border-neutral-300 px-3 py-3 text-center text-[11px] text-neutral-400">
          {vazio}
        </p>
      ) : null}

      {items.map((item, index) => (
        <div
          key={index}
          className="rounded-md border border-neutral-200 bg-neutral-50/60 p-2.5"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-400">
              {rotulo} {index + 1}
            </span>
            <button
              type="button"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
              className={`rounded p-1 text-neutral-400 hover:text-red-600 ${FOCUS_RING}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="sr-only">
                Remover {rotulo.toLowerCase()} {index + 1}
              </span>
            </button>
          </div>
          <div className="space-y-2">{children(item, trocarEm(index), index)}</div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...items, novoItem()])}
        className={`rounded-md border border-neutral-300 px-2.5 py-1.5 text-[11px] font-medium text-neutral-700 hover:bg-neutral-50 ${FOCUS_RING}`}
      >
        + adicionar {rotulo.toLowerCase()}
      </button>
    </div>
  );
}

/**
 * A variante de uma linha só por item, para as listas de texto simples
 * (serviços, itens de pacote): o campo e a lixeira lado a lado.
 */
export function TextList({
  items,
  onChange,
  rotulo,
  placeholder,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  rotulo: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-1.5">
          <input
            value={item}
            placeholder={placeholder}
            onChange={(event) =>
              onChange(
                items.map((atual, i) => (i === index ? event.target.value : atual))
              )
            }
            className={FIELD_CLASS}
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, i) => i !== index))}
            className={`shrink-0 rounded p-1.5 text-neutral-400 hover:text-red-600 ${FOCUS_RING}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="sr-only">Remover item {index + 1}</span>
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, ""])}
        className={`rounded-md border border-neutral-300 px-2.5 py-1.5 text-[11px] font-medium text-neutral-700 hover:bg-neutral-50 ${FOCUS_RING}`}
      >
        + adicionar {rotulo}
      </button>
    </div>
  );
}
