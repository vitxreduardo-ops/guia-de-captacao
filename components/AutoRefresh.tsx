"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const INTERVAL_MS = 30_000;

/**
 * Traz o que foi salvo no admin sem o cliente recarregar a página: ao voltar
 * pra aba e a cada 30 s enquanto ela está visível.
 */
export function AutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    function refresh() {
      if (document.visibilityState === "visible") router.refresh();
    }
    const timer = setInterval(refresh, INTERVAL_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router]);

  return null;
}
