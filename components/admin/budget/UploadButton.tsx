"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { uploadBudgetMediaAction } from "@/app/admin/orcamentos/[id]/actions";

/**
 * Manda um arquivo do computador para o bucket e devolve a URL a quem chamou.
 *
 * Não salva nada sozinho: entrega a URL, e quem recebe costura no lugar certo
 * da seção — o autosave do editor grava depois, como grava qualquer edição.
 */
export function UploadButton({
  budgetId,
  onUploaded,
  label = "Enviar do computador",
  accept = "image/*",
}: {
  budgetId: string;
  onUploaded: (url: string) => void;
  label?: string;
  accept?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(file: File) {
    setEnviando(true);
    setErro(null);

    const formData = new FormData();
    formData.append("file", file);

    const resultado = await uploadBudgetMediaAction(budgetId, formData);
    setEnviando(false);

    if ("error" in resultado) {
      setErro(resultado.error);
      return;
    }
    onUploaded(resultado.url);
  }

  return (
    <div>
      <input
        ref={input}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Limpa o valor para o mesmo arquivo poder ser escolhido de novo
          // depois de um erro — sem isto o segundo change nunca dispara.
          event.target.value = "";
          if (file) void enviar(file);
        }}
      />

      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={enviando}
        className="flex items-center gap-1.5 rounded-md border border-neutral-300 px-2.5 py-1.5 text-[11px] font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-1 focus-visible:outline-none"
      >
        {enviando ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Upload className="h-3.5 w-3.5" />
        )}
        {enviando ? "Enviando…" : label}
      </button>

      {erro ? (
        <p role="alert" className="mt-1.5 text-[11px] text-red-600">
          {erro}
        </p>
      ) : null}
    </div>
  );
}
