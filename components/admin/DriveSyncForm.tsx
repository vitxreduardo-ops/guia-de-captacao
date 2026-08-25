"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

/**
 * Formulário de sincronização com o Drive.
 *
 * A action roda inteira no servidor e não tem como reportar progresso real
 * (a listagem recursiva do Drive é uma chamada só, do ponto de vista do
 * cliente). Então o que se mostra aqui é progresso estimado: a barra avança
 * sozinha em direção a 90% enquanto a action está pendente e só completa
 * quando ela volta. O objetivo é responder ao clique — deixar claro que a
 * sincronização começou e ainda está rodando —, não cronometrar o servidor.
 */

const STAGES = [
  { at: 0, label: "Abrindo a pasta no Drive…" },
  { at: 15, label: "Listando arquivos e subpastas…" },
  { at: 45, label: "Lendo as fotos e vídeos encontrados…" },
  { at: 75, label: "Gravando os itens na galeria…" },
];

function stageLabel(progress: number) {
  let label = STAGES[0].label;
  for (const stage of STAGES) {
    if (progress >= stage.at) label = stage.label;
  }
  return label;
}

function formatElapsed(ms: number) {
  const total = Math.floor(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}min ${String(seconds).padStart(2, "0")}s`;
}

function SyncProgress() {
  const { pending } = useFormStatus();
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    if (!pending) {
      // Fecha a barra em 100% antes de sumir, para o clique não terminar
      // no vazio quando a sincronização é rápida.
      if (progress > 0) {
        setProgress(100);
        setFinishing(true);
        const timeout = setTimeout(() => {
          setFinishing(false);
          setProgress(0);
          setElapsed(0);
        }, 900);
        return () => clearTimeout(timeout);
      }
      return;
    }

    const startedAt = Date.now();
    setProgress(4);
    setElapsed(0);

    const interval = setInterval(() => {
      setElapsed(Date.now() - startedAt);
      // Avanço desacelerando: rápido no começo, quase parado perto de 90%,
      // que é onde a barra espera a resposta real do servidor.
      setProgress((current) => current + Math.max(0.4, (90 - current) / 22));
    }, 250);

    return () => clearInterval(interval);
    // `progress` é lido só no ramo de encerramento; incluí-lo reiniciaria o
    // intervalo a cada tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  const visible = pending || finishing;
  const value = Math.min(100, Math.round(progress));

  return (
    <>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-500"
      >
        {pending ? (
          <span
            aria-hidden
            className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white"
          />
        ) : null}
        {pending ? "Sincronizando…" : "Sincronizar fotos"}
      </button>

      {visible ? (
        <div className="w-full" aria-live="polite">
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={value}
            aria-label="Progresso da sincronização com o Drive"
            className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200"
          >
            <div
              className="h-full rounded-full bg-neutral-900 transition-[width] duration-300 ease-out"
              style={{ width: `${value}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-neutral-500">
            {pending ? (
              <>
                {stageLabel(progress)} ({formatElapsed(elapsed)}) — pastas
                grandes podem levar alguns minutos. Não feche a página.
              </>
            ) : (
              "Sincronização concluída — atualizando a lista de arquivos."
            )}
          </p>
        </div>
      ) : null}
    </>
  );
}

export function DriveSyncForm({
  action,
  clientId,
  defaultFolderUrl,
}: {
  action: (formData: FormData) => void | Promise<void>;
  clientId: string;
  defaultFolderUrl: string;
}) {
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="guide_id" value={clientId} />
      <input
        name="drive_folder_url"
        placeholder="https://drive.google.com/drive/folders/..."
        defaultValue={defaultFolderUrl}
        className="min-w-[220px] flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
      />
      <SyncProgress />
    </form>
  );
}
