"use client";

import { confirmar } from "@/components/ConfirmHost";
export function DeleteButton({
  label = "Excluir",
  confirmMessage,
}: {
  label?: string;
  confirmMessage: string;
}) {
  return (
    <button
      type="submit"
      className="text-sm text-red-500 hover:text-red-700"
      onClick={async (event) => {
        // O envio espera a resposta: barra agora, reenvia se confirmar.
        event.preventDefault();
        const botao = event.currentTarget;
        if (await confirmar(confirmMessage, label)) botao.form?.requestSubmit(botao);
      }}
    >
      {label}
    </button>
  );
}
