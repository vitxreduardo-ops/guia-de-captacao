"use client";

// Adaptado de 21st.dev/@odysseyui/components-ai-thought-chain. O original usa
// Collapsible e Badge do Radix; aqui o projeto é Base UI, então o recolher é
// um botão com aria-expanded e o selo é um span — sem dependência nova.

import React, { createContext, useContext, useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, ChevronDown, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "done" | "active" | "pending";

type StepContextType = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  status: Status;
  contentId: string;
};

const StepContext = createContext<StepContextType | null>(null);

function useStep() {
  const ctx = useContext(StepContext);
  if (!ctx) throw new Error("ThoughtChain: use dentro de <ThoughtChainStep>.");
  return ctx;
}

const statusStyles: Record<Status, { label: string; line: string }> = {
  done: { label: "text-neutral-500", line: "bg-green-600/30" },
  active: { label: "text-neutral-900", line: "bg-blue-500/25" },
  pending: { label: "text-neutral-400", line: "bg-neutral-200" },
};

function StatusIcon({ status }: { status: Status }) {
  if (status === "done") {
    return (
      <span className="flex size-5 items-center justify-center rounded-full bg-green-600">
        <Check className="size-3 text-white" strokeWidth={3} aria-hidden />
      </span>
    );
  }
  if (status === "active") {
    return (
      <Loader2
        className="size-5 animate-spin text-blue-500 motion-reduce:animate-none"
        aria-hidden
      />
    );
  }
  return <Circle className="size-5 text-neutral-300" aria-hidden />;
}

function ShimmerText({ text }: { text: string }) {
  const reduzir = useReducedMotion();
  if (reduzir) return <>{text}</>;
  return (
    <motion.span
      className="bg-[linear-gradient(90deg,#a3a3a3_0%,#171717_50%,#a3a3a3_100%)] bg-[length:200%_100%] bg-clip-text text-transparent"
      animate={{ backgroundPosition: ["100% 0%", "-100% 0%"] }}
      transition={{ repeat: Infinity, duration: 1.6, ease: "linear" }}
    >
      {text}
    </motion.span>
  );
}

export function ThoughtChain({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

export function ThoughtChainStep({
  children,
  status = "pending",
  defaultOpen = true,
}: {
  children: React.ReactNode;
  status?: Status;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <StepContext.Provider value={{ open, setOpen, status, contentId }}>
      <div className="group/step flex gap-3.5">
        <div className="flex shrink-0 flex-col items-center">
          <span className="mt-0.5">
            <StatusIcon status={status} />
          </span>
          <span
            className={cn(
              // O último passo não tem pra onde ligar: sem linha.
              "mt-1.5 min-h-5 w-0.5 flex-1 rounded-sm group-last/step:invisible",
              statusStyles[status].line
            )}
          />
        </div>
        <div className="flex-1 pb-2">{children}</div>
      </div>
    </StepContext.Provider>
  );
}

export function ThoughtChainTrigger({
  children,
  collapsible = true,
}: {
  children: React.ReactNode;
  /** false = passo sem conteúdo: só o rótulo, sem seta nem botão. */
  collapsible?: boolean;
}) {
  const { open, setOpen, status, contentId } = useStep();
  const reduzir = useReducedMotion();

  const rotulo = (
    <span className={cn("text-[13.5px] font-semibold tracking-tight", statusStyles[status].label)}>
      {status === "active" && typeof children === "string" ? (
        <ShimmerText text={children} />
      ) : (
        children
      )}
    </span>
  );
  const selo = status === "active" && (
    <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-600">
      Em andamento
    </span>
  );

  if (!collapsible) {
    return (
      <div className="flex items-center gap-1.5">
        {rotulo}
        {selo}
      </div>
    );
  }

  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={contentId}
      onClick={() => setOpen((v) => !v)}
      className="flex cursor-pointer select-none items-center gap-1.5 rounded text-left focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      {rotulo}

      <motion.span
        animate={{ rotate: open ? 180 : 0 }}
        transition={{ duration: reduzir ? 0 : 0.2, ease: "easeInOut" }}
        className="flex items-center text-neutral-400"
      >
        <ChevronDown className="size-3.5" aria-hidden />
      </motion.span>

      {selo}
    </button>
  );
}

export function ThoughtChainContent({ children }: { children: React.ReactNode }) {
  const { open, contentId } = useStep();
  const reduzir = useReducedMotion();

  return (
    <div id={contentId}>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: reduzir ? 0 : 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-1 pl-0.5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ThoughtChainItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-1.25">
      <span className="mt-1.75 size-1 shrink-0 rounded-full bg-neutral-300" />
      <span className="text-[13px] leading-[1.55] text-neutral-500">{children}</span>
    </div>
  );
}
