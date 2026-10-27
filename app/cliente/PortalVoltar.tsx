"use client";

import { VoltarButton } from "@/components/VoltarButton";
import { usePathnameInterno } from "@/lib/usePathnameInterno";

/** Voltar em toda tela do portal menos o Início, que é o fim do caminho. */
export function PortalVoltar() {
  const pathname = usePathnameInterno("/cliente");
  if (pathname === "/cliente") return null;
  return <VoltarButton fallback="/cliente" className="-ml-1 mb-2 px-1" />;
}
