"use client";

import { motion, useReducedMotion } from "motion/react";

export function ScrollHint({ className }: { className?: string }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className={`pointer-events-none absolute bottom-16 left-1/2 -translate-x-1/2 sm:bottom-20 ${className ?? ""}`}
      animate={prefersReducedMotion ? {} : { y: [0, 10, 0] }}
      transition={{
        duration: 1.6,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      aria-hidden="true"
    >
      <svg
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="opacity-70"
      >
        <path d="M12 5v14" />
        <path d="M5 12l7 7 7-7" />
      </svg>
    </motion.div>
  );
}
