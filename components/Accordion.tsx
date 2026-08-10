"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

export function Accordion({
  summary,
  children,
  defaultOpen = false,
  className,
  buttonClassName = "p-4",
  showChevron = true,
}: {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  buttonClassName?: string;
  showChevron?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={`flex w-full cursor-pointer select-none items-center justify-between text-left transition-transform active:scale-[0.99] ${buttonClassName}`}
      >
        {summary}
        {showChevron ? (
          <motion.span
            className="shrink-0 text-neutral-400"
            animate={{ rotate: open ? 180 : 0 }}
            transition={
              prefersReducedMotion
                ? { duration: 0.15 }
                : { type: "spring", bounce: 0, duration: 0.3 }
            }
          >
            ▾
          </motion.span>
        ) : null}
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={
              prefersReducedMotion
                ? { duration: 0.15 }
                : { type: "spring", bounce: 0, duration: 0.35 }
            }
            style={{ overflow: "hidden" }}
          >
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
