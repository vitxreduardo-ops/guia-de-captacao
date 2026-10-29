import * as React from "react"
import { cn } from "@/lib/utils"

interface MarqueeProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  pauseOnHover?: boolean
  direction?: "left" | "right"
  speed?: number
  respectReducedMotion?: boolean
}

// Componente Marquee do shadcn. Três ajustes sobre o original:
// - max-w-full no lugar de max-w-[90vw], para a faixa ocupar a largura toda;
// - a segunda cópia fica com aria-hidden, para leitores de tela não lerem a lista duas vezes;
// - prop respectReducedMotion (padrão true): para a animação de quem pediu menos movimento no sistema.
export function Marquee({
  children,
  pauseOnHover = false,
  direction = "left",
  speed = 30,
  respectReducedMotion = true,
  className,
  ...props
}: MarqueeProps) {
  return (
    <div
      className={cn(
        "w-full overflow-hidden sm:mt-24 mt-10 z-10",
        className
      )}
      {...props}
    >
      <div className="relative flex max-w-full overflow-hidden py-5">
        <div
          className={cn(
            "flex w-max animate-marquee",
            respectReducedMotion && "motion-reduce:animate-none",
            pauseOnHover && "hover:[animation-play-state:paused]",
            direction === "right" && "animate-marquee-reverse"
          )}
          style={{ "--duration": `${speed}s` } as React.CSSProperties}
        >
          {children}
          <div className="contents" aria-hidden="true">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
