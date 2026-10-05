"use client";

import { usePathname } from "next/navigation";

/**
 * Caminho como o app enxerga por dentro. No subdomínio a barra mostra
 * `/agenda`, mas os links e o "estou aqui" do menu falam `/admin/agenda`.
 */
export function usePathnameInterno(prefixo: "/admin" | "/cliente"): string {
  const pathname = usePathname();
  if (pathname === prefixo || pathname.startsWith(`${prefixo}/`)) return pathname;
  return prefixo + (pathname === "/" ? "" : pathname);
}
