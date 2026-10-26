"use client";

import { RefreshCw } from "lucide-react";
import { useState, useTransition } from "react";
import { atualizarAgoraAction } from "@/app/admin/repertorio/actions";

function plural(n: number, um: string, varios: string) {
  return n === 1 ? `1 ${um}` : `${n} ${varios}`;
}

/** Coleta na hora, sem esperar o cron da manhã. */
export function AtualizarAgora() {
  const [pendente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pendente}
        onClick={() => {
          setAviso(null);
          iniciar(async () => {
            const resultado = await atualizarAgoraAction();
            if (!resultado.ok) {
              setAviso({ texto: resultado.error, erro: true });
              return;
            }
            const { novas, erros } = resultado.data;
            const parteNovas = novas === 0 ? "Nenhuma notícia nova" : plural(novas, "notícia nova", "notícias novas");
            const parteErros = erros.length
              ? `. ${plural(erros.length, "fonte não respondeu", "fontes não responderam")}: ${erros
                  .map((e) => e.nome)
                  .join(", ")}`
              : "";
            setAviso({ texto: `${parteNovas}${parteErros}.`, erro: erros.length > 0 });
          });
        }}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-neutral-300 px-3 text-sm text-neutral-700 hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none disabled:opacity-60 sm:min-h-0 sm:py-1.5"
      >
        <RefreshCw className={`size-4 ${pendente ? "motion-safe:animate-spin" : ""}`} aria-hidden />
        {pendente ? "Atualizando…" : "Atualizar agora"}
      </button>
      <p
        role="status"
        aria-live="polite"
        className={`text-right text-xs ${aviso?.erro ? "text-amber-700" : "text-neutral-500"}`}
      >
        {aviso?.texto}
      </p>
    </div>
  );
}
