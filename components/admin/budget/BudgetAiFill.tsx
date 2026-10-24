"use client";

import { useRef, useState } from "react";
import { CloudUpload, Sparkles, X } from "lucide-react";
import type { BudgetSection } from "@/lib/budgetSections";

/**
 * "Preencher com IA": a pessoa cola um texto ou escolhe um PDF, a rota lê e
 * devolve as seções. Só entram as que a IA marcou como cobertas pelo material;
 * o resto (inclusive portfólio e logos) fica como estava.
 */
export function BudgetAiFill({
  sections,
  onApply,
}: {
  sections: BudgetSection[];
  onApply: (next: BudgetSection[]) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [texto, setTexto] = useState("");
  const [pdf, setPdf] = useState<File | null>(null);
  const [lendo, setLendo] = useState(false);
  const [erro, setErro] = useState("");
  const [arrastando, setArrastando] = useState(false);

  function escolher(arquivo: File | undefined) {
    if (!arquivo) return;
    if (arquivo.type !== "application/pdf") return setErro("Só aceito PDF.");
    setErro("");
    setPdf(arquivo);
  }

  async function enviar() {
    // O servidor não abre links (muitos pedem login): sem isto a IA receberia
    // só o endereço e inventaria uma proposta em cima dele.
    if (!pdf && /^https?:\/\/\S+$/.test(texto.trim())) {
      return setErro("Não consigo abrir links. Cole o texto da proposta ou escolha um PDF.");
    }
    setLendo(true);
    setErro("");
    try {
      const body = new FormData();
      body.set("texto", texto);
      if (pdf) body.set("pdf", pdf);
      const res = await fetch("/api/orcamentos/ia", { method: "POST", body });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.erro ?? "Não consegui ler o material.");
      const novas = json.sections as BudgetSection[];
      onApply(
        sections.map((atual) => {
          const nova = novas.find((s) => s.kind === atual.kind);
          return nova?.enabled ? nova : atual;
        })
      );
      setTexto("");
      setPdf(null);
      dialog.current?.close();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não consegui ler o material.");
    } finally {
      setLendo(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="flex items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-xs font-medium text-neutral-800 hover:border-neutral-400 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none"
      >
        <Sparkles className="h-4 w-4" />
        Preencher com IA
      </button>

      <dialog
        ref={dialog}
        onCancel={(e) => lendo && e.preventDefault()}
        className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-xl border border-neutral-200 p-5 backdrop:bg-black/40"
      >
        <h2 className="text-base font-semibold text-neutral-900">Preencher com IA</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Escolha um PDF ou cole o texto (ou o código) de uma proposta. As seções
          que o material cobre são substituídas; revise antes de publicar.
        </p>
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setArrastando(true);
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastando(false);
            if (!lendo) escolher(e.dataTransfer.files[0]);
          }}
          className={`mt-4 flex cursor-pointer flex-col items-center gap-1 rounded-3xl border-2 border-dashed px-6 py-6 text-center transition-colors focus-within:ring-2 focus-within:ring-neutral-900 ${
            arrastando
              ? "border-neutral-900 bg-neutral-100"
              : "border-neutral-300 bg-neutral-50 hover:border-neutral-500"
          }`}
        >
          <CloudUpload aria-hidden="true" className="size-10 text-neutral-400" />
          {pdf ? (
            <span className="flex items-center gap-2 text-sm font-medium text-neutral-900">
              {pdf.name}
              <button
                type="button"
                aria-label="Tirar o PDF"
                disabled={lendo}
                onClick={(e) => {
                  e.preventDefault();
                  setPdf(null);
                }}
                className="rounded p-0.5 text-neutral-500 hover:text-neutral-900"
              >
                <X className="size-4" />
              </button>
            </span>
          ) : (
            <>
              <span className="text-sm text-neutral-700">Arraste o PDF para cá</span>
              <span className="text-xs text-neutral-500">ou</span>
              <span className="rounded-lg bg-neutral-200 px-4 py-1.5 text-sm text-neutral-800 transition-colors hover:bg-neutral-300">
                Escolher arquivo
              </span>
            </>
          )}
          <input
            type="file"
            accept="application/pdf"
            disabled={lendo}
            onChange={(e) => escolher(e.target.files?.[0])}
            className="sr-only"
          />
        </label>

        <div className="my-3 flex items-center gap-3 text-xs text-neutral-500">
          <span className="h-px flex-1 bg-neutral-200" />
          ou cole o texto
          <span className="h-px flex-1 bg-neutral-200" />
        </div>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={5}
          disabled={lendo}
          placeholder="Cole aqui o texto da proposta ou o código do artifact…"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
        {erro ? (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {erro}
          </p>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            disabled={lendo}
            onClick={() => dialog.current?.close()}
            className="rounded-md px-3 py-2 text-sm text-neutral-600 hover:text-neutral-900"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={lendo || (!texto.trim() && !pdf)}
            onClick={enviar}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {lendo ? "Lendo…" : "Preencher"}
          </button>
        </div>
      </dialog>
    </>
  );
}
