"use client";

import { useEffect, useState } from "react";

/**
 * Capa de um vídeo tirada do próprio arquivo, pra quando o Drive não gerou
 * miniatura (acontece com alguns vídeos e nunca se resolve sozinho). Carrega o
 * começo do vídeo, vai a meio segundo e desenha um quadro num canvas. O vídeo
 * vem do mesmo domínio (proxy do Drive), então o canvas não fica bloqueado.
 * Só roda quando `enabled`, pra não baixar vídeo à toa.
 */
export function useVideoPoster(src: string, enabled: boolean): string | null {
  const [poster, setPoster] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = src;

    function draw() {
      const width = video.videoWidth;
      const height = video.videoHeight;
      if (!width || !height) return;
      const scale = Math.min(1, 480 / width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      try {
        canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
        if (!cancelled) setPoster(canvas.toDataURL("image/jpeg", 0.75));
      } catch {
        // canvas bloqueado: fica sem capa, o quadro de reserva cobre.
      }
    }

    video.addEventListener("loadedmetadata", () => {
      try {
        video.currentTime = Math.min(0.5, (video.duration || 1) / 2);
      } catch {
        draw();
      }
    });
    video.addEventListener("seeked", draw, { once: true });

    return () => {
      cancelled = true;
      video.removeAttribute("src");
      video.load();
    };
  }, [src, enabled]);

  return poster;
}
