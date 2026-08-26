"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Entrada suave da grade a cada período.
 *
 * Trocar de semana troca o HTML inteiro da grade: sem isso o conteúdo novo
 * aparece de um quadro para o outro, e a troca lê como um corte em vez de
 * uma transição. O fade é curto de propósito — mais que isso faria a tela
 * parecer mais lenta do que é.
 */
export function GridFade({ children }: { children: ReactNode }) {
  const prefersReducedMotion = useReducedMotion();
  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
