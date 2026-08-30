"use client";

import { useState } from "react";

export function CopyLinkButton({ text }: { text: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
    } catch {
      // Safari e navegadores mais restritos podem recusar a escrita na área
      // de transferência mesmo em resposta a um clique. Sem plano B o clique
      // simplesmente não faz nada, e ninguém entende por quê.
      setStatus("failed");
    }
    setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 transition-transform hover:border-neutral-500 active:scale-[0.97]"
    >
      {status === "copied"
        ? "Copiado!"
        : status === "failed"
          ? "Selecione e copie"
          : "Copiar link"}
    </button>
  );
}
