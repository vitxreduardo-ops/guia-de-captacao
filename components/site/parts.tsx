import { useRef, type ReactNode } from "react"
import { cn } from "@/lib/utils"

/** Espaçamento entre seções */
export const BLOCK = "mt-[140px] max-[860px]:mt-[100px]"

/** Linha de título de seção: nome à esquerda, legenda à direita, filete embaixo */
export function Head({ left, right }: { left: string; right: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-fg pb-3.5 text-sm font-medium text-mute">
      <span>{left}</span>
      <span>{right}</span>
    </div>
  )
}

interface RowProps {
  href: string
  title: string
  desc: string
  small?: boolean
  inheritDesc?: boolean
  external?: boolean
}

/** Linha grande que inverte de cor ao passar o mouse (etapas e contato) */
export function Row({ href, title, desc, small, inheritDesc, external }: RowProps) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={cn(
        "group grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_2rem] items-center gap-6 border-b border-rule pb-[26px] pt-[22px]",
        "transition-[background-color,color,padding] duration-[250ms] motion-reduce:transition-none",
        "hover:bg-fg hover:px-5 hover:text-bg",
        "max-[860px]:grid-cols-[minmax(0,1fr)_2rem] max-[860px]:gap-x-4 max-[860px]:gap-y-1.5 max-[860px]:hover:px-0"
      )}
    >
      <span
        className={cn(
          // o tamanho vem primeiro: tailwind-merge descarta o leading que vier antes de um text-[...]
          small ? "text-[clamp(2rem,6vw,5rem)]" : "text-[clamp(3rem,11vw,9.5rem)]",
          "font-bold leading-[0.9] tracking-[-0.055em]"
        )}
      >
        {title}
      </span>
      <span
        className={cn(
          "max-w-[22em] text-[1.05rem] transition-colors duration-[250ms] motion-reduce:transition-none",
          "max-[860px]:col-start-1 max-[860px]:row-start-2",
          inheritDesc ? "text-inherit" : "text-mute group-hover:text-bg"
        )}
      >
        {desc}
      </span>
      <span
        aria-hidden="true"
        className="justify-self-end text-[1.8rem] max-[860px]:col-start-2 max-[860px]:row-start-1"
      >
        ↗
      </span>
    </a>
  )
}

interface MediaProps {
  image?: string
  video?: string
  alt?: string
  soon?: boolean
  ratio?: string
  children?: ReactNode
}

/** Quadro de mídia: imagem, vídeo que toca ao passar o mouse, ou espaço "Em breve" */
export function Media({ image, video, alt = "", soon, ratio = "aspect-[16/10]", children }: MediaProps) {
  const ref = useRef<HTMLVideoElement>(null)
  const zoom =
    "absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03] motion-reduce:transition-none"

  return (
    <div
      className={cn("relative max-w-full overflow-hidden bg-surface", ratio)}
      onMouseEnter={() => ref.current?.play().catch(() => {})}
      onMouseLeave={() => ref.current?.pause()}
    >
      {video ? (
        <video ref={ref} src={video} poster={image} muted loop playsInline preload="metadata" aria-label={alt} className={zoom} />
      ) : image ? (
        <img src={image} alt={alt} loading="lazy" className={zoom} />
      ) : (
        <div className="absolute inset-0 grid place-items-center text-[0.78rem] uppercase tracking-[0.3em] text-mute">
          {soon ? "Em breve" : ""}
        </div>
      )}
      {children}
    </div>
  )
}
