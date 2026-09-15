"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { startTransition, useOptimistic, type ReactNode } from "react";
import { toggleSidebar } from "@/app/admin/sidebarActions";

export const LARGURA_ABERTA = 220;
export const LARGURA_FECHADA = 64;

/**
 * A moldura que abre e fecha a barra.
 *
 * O estado mora num cookie no servidor — assim a barra já nasce na largura
 * certa, sem piscar, e não há um segundo lugar pra discordar. Mas esperar a
 * resposta do servidor pra mexer um pixel custava 393ms de tela parada
 * depois do clique, medidos. `useOptimistic` paga isso: a largura muda no
 * quadro seguinte ao toque e o servidor só confirma depois.
 *
 * A largura anima por mola em vez de salto. Mola crítica (`bounce: 0`)
 * porque não houve gesto nenhum aqui — foi um clique, e repique sem impulso
 * físico lê como enfeite.
 */
export function SidebarFrame({
  colapsadaNoServidor,
  logo,
  children,
  rodape,
}: {
  colapsadaNoServidor: boolean;
  logo: ReactNode;
  children: ReactNode;
  rodape: ReactNode;
}) {
  const [colapsada, setColapsada] = useOptimistic(colapsadaNoServidor);
  const prefereMenosMovimento = useReducedMotion();

  function alternar() {
    startTransition(async () => {
      setColapsada(!colapsada);
      await toggleSidebar();
    });
  }

  return (
    <motion.aside
      data-colapsada={colapsada}
      // `initial={false}`: na primeira pintura a barra assume a largura do
      // servidor em vez de animar de zero até ela.
      initial={false}
      animate={{ width: colapsada ? LARGURA_FECHADA : LARGURA_ABERTA }}
      transition={
        prefereMenosMovimento
          ? { duration: 0 }
          : { type: "spring", bounce: 0, duration: 0.3 }
      }
      className="group/barra hidden shrink-0 lg:block"
    >
      {/* `sticky` em vez de `fixed`: assim a barra ocupa lugar no fluxo e o
          conteúdo não precisa de margem esquerda combinada na mão. Só a lista
          rola — logo e conta ficam parados nas pontas. */}
      <div className="sticky top-0 flex h-svh flex-col">
        <div className="flex shrink-0 items-center gap-2 p-4 group-data-[colapsada=true]/barra:justify-center group-data-[colapsada=true]/barra:px-0">
          {logo}

          <button
            type="button"
            onClick={alternar}
            aria-expanded={!colapsada}
            aria-label={colapsada ? "Expandir atalhos" : "Recolher atalhos"}
            className="ml-auto grid size-8 shrink-0 place-items-center rounded-md text-neutral-500 transition-[color,background-color,transform] hover:bg-neutral-100 hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95 group-data-[colapsada=true]/barra:mx-auto"
          >
            {colapsada ? (
              <PanelLeftOpen aria-hidden="true" className="size-4" />
            ) : (
              <PanelLeftClose aria-hidden="true" className="size-4" />
            )}
          </button>
        </div>

        {children}

        <div className="shrink-0 p-3">{rodape}</div>
      </div>
    </motion.aside>
  );
}
