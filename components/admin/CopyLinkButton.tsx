"use client";

import { useState } from "react";
import { encurtarLinkAction } from "@/app/admin/links/actions";

export function CopyLinkButton({
  text,
  className = "border-neutral-300 text-neutral-700 hover:border-neutral-500",
  rotulo,
}: {
  text: string;
  className?: string;
  /** Nome do link na tela Links curtos ("Proposta 14Bis"); sem ele aparece o endereço. */
  rotulo?: string;
}) {
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

  const [curto, setCurto] = useState<"idle" | "busy" | "copied" | "failed">("idle");

  // Mesmo link, em versão curta (tatuestudio.com.br/abc): cria na hora, ou
  // reaproveita o que já existe pro mesmo destino, e copia.
  async function copiarCurto() {
    setCurto("busy");
    try {
      const r = await encurtarLinkAction(text, rotulo);
      if ("erro" in r) throw new Error(r.erro);
      await navigator.clipboard.writeText(r.curto);
      setCurto("copied");
    } catch {
      setCurto("failed");
    }
    setTimeout(() => setCurto("idle"), 2000);
  }

  const botao = `rounded-md border px-3 py-1.5 text-sm transition-transform active:scale-[0.97] ${className}`;
  return (
    <>
      <button type="button" onClick={copy} className={botao}>
        {status === "copied"
          ? "Copiado!"
          : status === "failed"
            ? "Selecione e copie"
            : "Copiar link"}
      </button>
      {/* Só link http(s): o do app do Mac ou relativo não encurta. */}
      {/^https?:\/\//.test(text) && (
        <button type="button" onClick={copiarCurto} disabled={curto === "busy"} className={botao}>
          {curto === "copied" ? "Curto copiado!" : curto === "failed" ? "Não deu" : curto === "busy" ? "Encurtando…" : "Copiar curto"}
        </button>
      )}
    </>
  );
}
