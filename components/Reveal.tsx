"use client";

import { MotionConfig, motion, type Variants } from "motion/react";
import type { ReactNode } from "react";

const DISTANCE = 28;

// Quem pediu menos movimento fica só com o fade: o MotionConfig corta o
// deslocamento no navegador. Ler useReducedMotion aqui mudava o `initial`
// entre servidor e navegador e a hidratação reclamava.

export function Reveal({
  children,
  className,
  delay = 0,
  y = DISTANCE,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        className={className}
        initial={{ opacity: 0, y }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, amount: 0.3, margin: "-10% 0px -10% 0px" }}
        transition={{ type: "spring", bounce: 0, duration: 0.6, delay }}
      >
        {children}
      </motion.div>
    </MotionConfig>
  );
}

/**
 * Stagger container: reveals its direct children one after another as it
 * scrolls into view. Children should be plain elements — the stagger
 * timing comes from the parent variants, not individual motion props.
 */
export function RevealStagger({
  children,
  className,
  staggerDelay = 0.08,
}: {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}) {
  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: staggerDelay } },
  };

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        className={className}
        initial="hidden"
        whileInView="show"
        viewport={{ once: false, amount: 0.2, margin: "-10% 0px -10% 0px" }}
        variants={container}
      >
        {children}
      </motion.div>
    </MotionConfig>
  );
}

export function RevealItem({
  children,
  className,
  y = DISTANCE,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
}) {
  const item: Variants = {
    hidden: { opacity: 0, y },
    show: { opacity: 1, y: 0, transition: { type: "spring", bounce: 0, duration: 0.5 } },
  };

  return (
    <MotionConfig reducedMotion="user">
      <motion.div className={className} variants={item}>
        {children}
      </motion.div>
    </MotionConfig>
  );
}
