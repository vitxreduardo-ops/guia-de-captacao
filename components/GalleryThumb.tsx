"use client";

import { useState } from "react";

/**
 * Miniatura de item da galeria com estado de erro visível.
 *
 * O proxy do Drive devolve 500 quando o acesso expira ou o arquivo sai da
 * pasta. Sem tratamento, o <img> quebrado renderiza uma caixa vazia e a
 * galeria parece não ter conteúdo — o cliente não tem como saber que houve
 * falha. Aqui a falha vira um bloco com o nome do arquivo, preservando a
 * altura do card e explicando o que aconteceu.
 */
export function GalleryThumb({
  src,
  alt,
  className,
  caption,
  onFailed,
}: {
  src: string;
  alt: string;
  className?: string;
  caption?: string;
  /** Avisa o card ao redor que a prévia falhou, pra ele esconder o que
   * ficaria sobreposto ao aviso (o ▶ do vídeo, por exemplo). */
  onFailed?: () => void;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`${className ?? ""} flex aspect-[4/3] w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-neutral-300 bg-neutral-100 px-3 text-center`}
      >
        <span aria-hidden className="text-lg text-neutral-400">
          ⚠
        </span>
        <span className="text-[11px] font-medium text-neutral-500">
          Prévia indisponível
        </span>
        {caption ? (
          <span className="line-clamp-2 text-[10px] text-neutral-400">
            {caption}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => {
        setFailed(true);
        onFailed?.();
      }}
      className={className}
    />
  );
}
