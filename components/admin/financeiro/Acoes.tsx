"use client";

import { Pencil } from "lucide-react";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { BOTAO } from "@/components/admin/financeiro/ui";

/**
 * Botão que dispara uma ação do servidor com os campos já prontos. É o
 * "Recebi" e o "Paguei": um toque, sem formulário, sem sair da tela.
 */
export function BotaoAcao({
  action,
  campos,
  children,
  ariaLabel,
  variante = "contorno",
}: {
  action: (formData: FormData) => Promise<void>;
  campos: Record<string, string | string[]>;
  children: ReactNode;
  ariaLabel?: string;
  variante?: keyof typeof BOTAO;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-label={ariaLabel}
      onClick={() =>
        start(async () => {
          const f = new FormData();
          for (const [k, v] of Object.entries(campos)) for (const x of Array.isArray(v) ? v : [v]) f.append(k, x);
          await action(f);
        })
      }
      className={BOTAO[variante]}
    >
      {pending ? "Salvando…" : children}
    </button>
  );
}

/** Janela de um campo só (saldo, meta, % de reserva): abre por cima, salva e fecha. */
export function EditarValor({
  rotulo,
  titulo,
  dica,
  action,
  valorInicial = "",
  placeholder,
  sufixo,
  variante = "contorno",
  ariaLabel,
  icone = false,
}: {
  rotulo: string;
  titulo: string;
  dica?: string;
  action: (formData: FormData) => Promise<void>;
  valorInicial?: string;
  placeholder?: string;
  sufixo?: string;
  variante?: keyof typeof BOTAO;
  ariaLabel?: string;
  /** Mostra só um lápis no lugar do texto (o `rotulo` vira o nome falado). */
  icone?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [pending, start] = useTransition();
  return (
    <>
      {icone ? (
        <button
          type="button"
          aria-label={ariaLabel ?? rotulo}
          title={rotulo}
          onClick={() => ref.current?.showModal()}
          className="inline-flex size-11 items-center justify-center rounded-lg text-neutral-600 transition-transform hover:bg-neutral-100 hover:text-neutral-900 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <Pencil className="size-5" strokeWidth={1.5} aria-hidden />
        </button>
      ) : (
        <button type="button" aria-label={ariaLabel} onClick={() => ref.current?.showModal()} className={BOTAO[variante]}>
          {rotulo}
        </button>
      )}
      <dialog
        ref={ref}
        aria-label={titulo}
        onClick={(e) => e.target === ref.current && ref.current?.close()}
        className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-xl border border-neutral-200 bg-white p-0 text-neutral-900 shadow-xl backdrop:bg-black/40"
      >
        <form
          action={(f) =>
            start(async () => {
              await action(f);
              ref.current?.close();
            })
          }
          className="grid gap-3 p-5"
        >
          <h2 className="text-lg font-medium">{titulo}</h2>
          {dica ? <p className="text-base text-neutral-600">{dica}</p> : null}
          <label className="flex items-center gap-2">
            <span className="sr-only">{titulo}</span>
            <input
              name="valor"
              inputMode="decimal"
              autoFocus
              onFocus={(e) => e.currentTarget.select()}
              defaultValue={valorInicial}
              placeholder={placeholder}
              className="min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-base focus:border-neutral-500 focus:outline-none"
            />
            {sufixo ? <span className="text-base text-neutral-600">{sufixo}</span> : null}
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className={BOTAO.cheio}>
              {pending ? "Salvando…" : "Salvar"}
            </button>
            <button type="button" onClick={() => ref.current?.close()} className={BOTAO.contorno}>
              Cancelar
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}

/** Janela com vários campos de texto (ex.: valor e meses da reserva mínima). */
export function EditarCampos({
  rotulo,
  titulo,
  dica,
  action,
  campos,
  variante = "contorno",
}: {
  rotulo: string;
  titulo: string;
  dica?: string;
  action: (formData: FormData) => Promise<void>;
  campos: { name: string; label: string; valorInicial?: string; placeholder?: string; sufixo?: string }[];
  variante?: keyof typeof BOTAO;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [pending, start] = useTransition();
  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()} className={BOTAO[variante]}>
        {rotulo}
      </button>
      <dialog
        ref={ref}
        aria-label={titulo}
        onClick={(e) => e.target === ref.current && ref.current?.close()}
        className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-neutral-200 bg-white p-0 text-neutral-900 shadow-xl backdrop:bg-black/40"
      >
        <form
          action={(f) =>
            start(async () => {
              await action(f);
              ref.current?.close();
            })
          }
          className="grid gap-3 p-5"
        >
          <h2 className="text-lg font-medium">{titulo}</h2>
          {dica ? <p className="text-base text-neutral-600">{dica}</p> : null}
          {campos.map((c, i) => (
            <label key={c.name} className="block">
              <span className="mb-1 block text-sm font-medium text-neutral-600">{c.label}</span>
              <span className="flex items-center gap-2">
                <input
                  name={c.name}
                  inputMode="decimal"
                  autoFocus={i === 0}
                  onFocus={(e) => e.currentTarget.select()}
                  defaultValue={c.valorInicial}
                  placeholder={c.placeholder}
                  className="min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-base focus:border-neutral-500 focus:outline-none"
                />
                {c.sufixo ? <span className="text-base text-neutral-600">{c.sufixo}</span> : null}
              </span>
            </label>
          ))}
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className={BOTAO.cheio}>
              {pending ? "Salvando…" : "Salvar"}
            </button>
            <button type="button" onClick={() => ref.current?.close()} className={BOTAO.contorno}>
              Cancelar
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}

/** Botão + janela de uma área maior (o formulário de lançar saída). */
export function Janela({
  rotulo,
  titulo,
  children,
  variante = "cheio",
}: {
  rotulo: string;
  titulo: string;
  /** Recebe `fechar` para o formulário se fechar sozinho ao salvar. */
  children: (fechar: () => void) => ReactNode;
  variante?: keyof typeof BOTAO;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [aberta, setAberta] = useState(false);
  // A janela nativa abre e fecha pelo estado: o formulário só existe enquanto ela está aberta.
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberta && !d.open) d.showModal();
    if (!aberta && d.open) d.close();
  }, [aberta]);
  return (
    <>
      <button type="button" onClick={() => setAberta(true)} className={BOTAO[variante]}>
        {rotulo}
      </button>
      <dialog
        ref={ref}
        aria-label={titulo}
        onClose={() => setAberta(false)}
        onClick={(e) => e.target === ref.current && setAberta(false)}
        className="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-xl border border-neutral-200 bg-white p-0 text-neutral-900 shadow-xl backdrop:bg-black/40"
      >
        <div className="p-5">
          <h2 className="mb-3 text-lg font-medium">{titulo}</h2>
          {aberta ? children(() => setAberta(false)) : null}
        </div>
      </dialog>
    </>
  );
}
