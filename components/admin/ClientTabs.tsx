"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";

const TABS = [
  { href: "/admin/clientes/entregas", label: "Entregas" },
  { href: "/admin/clientes/faturamento", label: "Faturamento" },
  { href: "/admin/clientes/resumo", label: "Resumo" },
  { href: "/admin/clientes/cadastro", label: "Cadastro" },
];

/**
 * Navegação da seção Clientes. A aba atual sai do caminho, não de prop.
 *
 * O fundo escuro é um só, compartilhado entre as abas pelo `layoutId`: ele
 * desliza da aba antiga para a nova em vez de piscar de lugar, então o olho
 * acompanha para onde foi. Mola sem repique (`bounce: 0`) porque nada aqui
 * vem de um gesto com inércia — é um toque, não um arremesso.
 */
export function ClientTabs() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  return (
    <nav
      aria-label="Seções de clientes"
      // No celular as quatro abas não cabem numa linha e quebrando custavam
      // uma faixa inteira de altura antes do conteúdo: viram uma faixa que
      // rola. No desktop cabem e ficam todas à vista.
      className="flex items-center gap-1 overflow-x-auto rounded-lg border border-neutral-200 bg-white/90 p-1 backdrop-blur-md [scrollbar-width:none] sm:flex-wrap sm:overflow-visible"
    >
      {TABS.map((tab) => {
        const current = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={current ? "page" : undefined}
            className={`relative shrink-0 rounded-md px-3 py-1.5 text-sm transition-transform focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.97] pointer-coarse:min-h-11 pointer-coarse:flex pointer-coarse:items-center ${
              current
                ? "font-medium text-white"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            {current ? (
              <motion.span
                layoutId="client-tab-indicator"
                aria-hidden
                className="absolute inset-0 rounded-md bg-neutral-900"
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: "spring", bounce: 0, duration: 0.35 }
                }
              />
            ) : null}
            <span className="relative">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
