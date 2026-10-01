"use client";

import { useRef, useState } from "react";
import { ClipboardPaste, TriangleAlert } from "lucide-react";
import {
  organizarRoteiroAction,
  salvarVideosNoGuiaAction,
} from "@/app/admin/roteiros/actions";
import type { VideoImportado } from "@/lib/roteiroTypes";

type Previa = { videos: VideoImportado[]; alterados: string[]; deFora: string[] };

const botao =
  "inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50";
const botaoPrimario =
  "rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50";

/**
 * Roteiro que o cliente já aprovou, colado do jeito que veio: a IA só recorta
 * em vídeos e cenas, a prévia mostra o que ela mudou ou deixou de fora, e só
 * grava no guia quando a pessoa confirma.
 */
export function ColarRoteiro({ guideId }: { guideId: string }) {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [adicionados, setAdicionados] = useState<number | null>(null);
  const raiz = useRef<HTMLDivElement>(null);

  function fechar() {
    setAberto(false);
    setTexto("");
    setPrevia(null);
    setErro(null);
  }

  async function organizar() {
    setErro(null);
    setCarregando(true);
    try {
      const res = await organizarRoteiroAction(texto);
      if (!res.ok) return setErro(res.error);
      setPrevia(res.data);
    } finally {
      setCarregando(false);
    }
  }

  async function adicionar() {
    if (!previa) return;
    setErro(null);
    setCarregando(true);
    try {
      const res = await salvarVideosNoGuiaAction(guideId, previa.videos);
      if (!res.ok) return setErro(res.error);
      setAdicionados(res.data.videos);
      fechar();
      // A prévia some e a página encolhe: traz de volta pro vídeo novo, que
      // entra logo acima deste bloco.
      requestAnimationFrame(() =>
        raiz.current?.scrollIntoView({ block: "end", behavior: "smooth" })
      );
    } finally {
      setCarregando(false);
    }
  }

  if (!aberto) {
    return (
      <div ref={raiz} className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setAdicionados(null);
            setAberto(true);
          }}
          className={botao}
        >
          <ClipboardPaste className="size-3.5" aria-hidden />
          Colar roteiro pronto
        </button>
        {adicionados !== null ? (
          <p className="text-xs text-neutral-600" role="status">
            {adicionados === 1 ? "1 vídeo adicionado" : `${adicionados} vídeos adicionados`} ao guia.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
      {previa === null ? (
        <>
          <label className="block text-xs font-medium text-neutral-600">
            Cole o roteiro do jeito que veio. A IA só separa em vídeos e cenas, sem
            mudar nenhuma palavra.
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={10}
              autoFocus
              className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-normal text-neutral-900 focus:border-neutral-500 focus:outline-none"
            />
          </label>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={organizar}
              disabled={carregando || !texto.trim()}
              className={botaoPrimario}
            >
              {carregando ? "Organizando..." : "Organizar"}
            </button>
            <button type="button" onClick={fechar} disabled={carregando} className={botao}>
              Cancelar
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="mb-3 text-xs font-medium text-neutral-600">
            Prévia: {previa.videos.length === 1 ? "1 vídeo" : `${previa.videos.length} vídeos`}.
            Nada foi salvo ainda.
          </p>

          {previa.alterados.length > 0 ? (
            <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900" role="alert">
              <p className="flex items-center gap-1.5 font-semibold">
                <TriangleAlert className="size-3.5" aria-hidden />
                A IA alterou {previa.alterados.length === 1 ? "este trecho" : "estes trechos"}. Confira antes de adicionar:
              </p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5">
                {previa.alterados.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {previa.deFora.length > 0 ? (
            <div className="mb-3 rounded-md border border-neutral-200 bg-white p-3 text-xs text-neutral-600">
              <p className="font-medium text-neutral-800">
                Ficou de fora (normalmente marcadores como &ldquo;Cena 1&rdquo;):
              </p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5">
                {previa.deFora.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="space-y-3">
            {previa.videos.map((video, v) => (
              <div key={v} className="rounded-md border border-neutral-200 bg-white p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Vídeo — {video.titulo}
                </p>
                <ol className="space-y-2">
                  {video.cenas.map((cena, c) => (
                    <li key={c} className="rounded-md bg-neutral-50 p-2 text-sm">
                      <span className="text-xs font-medium text-neutral-500">Cena {c + 1}</span>
                      {cena.script ? (
                        <p className="whitespace-pre-line text-neutral-900">{cena.script}</p>
                      ) : null}
                      {cena.description ? (
                        <p className="mt-1 whitespace-pre-line text-xs text-neutral-500">
                          Descrição: {cena.description}
                        </p>
                      ) : null}
                      {cena.hooks_alternativos.length > 0 ? (
                        <p className="mt-1 text-xs text-neutral-500">
                          Hooks alternativos: {cena.hooks_alternativos.join(" / ")}
                        </p>
                      ) : null}
                      {cena.ctas_alternativos.length > 0 ? (
                        <p className="mt-1 text-xs text-neutral-500">
                          CTAs alternativos: {cena.ctas_alternativos.join(" / ")}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ol>
                {video.notas_producao ? (
                  <p className="mt-2 whitespace-pre-line text-xs text-neutral-600">
                    <span className="font-medium">Notas de produção:</span> {video.notas_producao}
                  </p>
                ) : null}
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={adicionar} disabled={carregando} className={botaoPrimario}>
              {carregando
                ? "Adicionando..."
                : previa.alterados.length > 0
                  ? "Adicionar mesmo assim"
                  : "Adicionar ao guia"}
            </button>
            <button
              type="button"
              onClick={() => setPrevia(null)}
              disabled={carregando}
              className={botao}
            >
              Voltar ao texto
            </button>
            <button type="button" onClick={fechar} disabled={carregando} className={botao}>
              Cancelar
            </button>
          </div>
        </>
      )}
      {erro ? <p className="mt-2 text-xs text-red-700">{erro}</p> : null}
    </div>
  );
}
