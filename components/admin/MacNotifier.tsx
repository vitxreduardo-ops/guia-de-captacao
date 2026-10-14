"use client";

import { useEffect } from "react";

type TatuMac = {
  notify: (n: { title: string; body: string; url: string }) => void;
};

/**
 * Só faz algo dentro do app do Mac (`window.tatuMac`, exposto pelo preload).
 * No navegador não renderiza nada e não consulta nada. Começa a contar a
 * partir de agora: o que já estava na campainha não vira enxurrada de avisos.
 */
export function MacNotifier() {
  useEffect(() => {
    const mac = (window as unknown as { tatuMac?: TatuMac }).tatuMac;
    if (!mac) return;

    let since = new Date().toISOString();
    async function poll() {
      try {
        const res = await fetch(
          `/api/notificacoes/novas?since=${encodeURIComponent(since)}`,
          { cache: "no-store" }
        );
        if (!res.ok) return;
        const { items } = (await res.json()) as {
          items: { title: string; body: string; link: string | null; created_at: string }[];
        };
        for (const n of items) {
          mac!.notify({ title: n.title, body: n.body, url: n.link ?? "/admin" });
          since = n.created_at;
        }
      } catch {
        // sem rede: tenta de novo no próximo ciclo
      }
    }
    const timer = setInterval(poll, 30_000);
    return () => clearInterval(timer);
  }, []);

  return null;
}
