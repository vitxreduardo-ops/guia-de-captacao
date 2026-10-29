import { useRef, useState } from "react"
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "motion/react"
import { CONFIG, MOTION, type CaseItem } from "./config"
import { useViewportWidth } from "./hooks"
import { GlowShader } from "./GlowShader"
import { BLOCK, Head } from "./parts"

// Enquanto não há cases, a lista mostra os serviços do estúdio
const SOON: CaseItem[] = [{ cat: "Vídeo" }, { cat: "Arte" }, { cat: "Estratégia" }]

const ease = [0.22, 1, 0.36, 1] as const
const SIZE = 240

const iconProps = { viewBox: "0 0 24 24", className: "h-full w-full", "aria-hidden": true } as const

/** Ícone do centro do preview, um por categoria */
function CatIcon({ cat }: { cat?: string }) {
  const c = (cat || "").toLowerCase()
  if (c.startsWith("arte") || c.startsWith("design")) {
    return (
      <svg {...iconProps} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-.8 2-1.8 0-1.2-1-1.6-1-2.7 0-.9.7-1.5 1.6-1.5H17a4 4 0 0 0 4-4C21 6.7 17 3 12 3Z" />
        <circle cx="7.5" cy="11" r="1" fill="currentColor" />
        <circle cx="10.5" cy="7.5" r="1" fill="currentColor" />
        <circle cx="15" cy="7.5" r="1" fill="currentColor" />
      </svg>
    )
  }
  if (c.startsWith("estrat")) {
    return (
      <svg {...iconProps} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
      </svg>
    )
  }
  return (
    <svg {...iconProps} fill="currentColor">
      <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" />
    </svg>
  )
}

/** Conteúdo do preview: vídeo, imagem ou, sem mídia, brilho em shader com o ícone da categoria */
function PreviewFace({ c, i }: { c: CaseItem; i: number }) {
  const pointer = useRef({ x: 0.3 + ((i * 0.23) % 0.45), y: 0.35 + ((i * 0.31) % 0.4) })
  if (c.video) return <video src={c.video} muted loop autoPlay playsInline className="h-full w-full object-cover" />
  if (c.image) return <img src={c.image} alt="" className="h-full w-full object-cover" />
  return (
    <div className="relative h-full w-full">
      <GlowShader pointer={pointer} />
      <div className="absolute inset-0 grid place-items-center text-fg">
        <span className="block h-9 w-9 drop-shadow">
          <CatIcon cat={c.cat} />
        </span>
      </div>
    </div>
  )
}

export function Cases() {
  const has = CONFIG.cases.length > 0
  const list = has ? CONFIG.cases : SOON
  const vw = useViewportWidth()
  // Sempre o layout de computador; em tela estreita o quadro só encolhe.
  const size = Math.min(SIZE, Math.round(vw * 0.3))
  const reduce = useReducedMotion() && MOTION.respectReducedMotion

  const [active, setActive] = useState<number | null>(null)
  const [inside, setInside] = useState(false)
  const [y, setY] = useState(0)
  const rows = useRef<(HTMLElement | null)[]>([])

  // Moldura que abre com o scroll: começa recortada, com cantos redondos, e termina ocupando a tela inteira
  const track = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: track, offset: ["start 85%", "start start"] })
  const clip = useTransform(
    scrollYProgress,
    [0, 1],
    ["inset(12% 1.4% 12% 1.4% round 28px)", "inset(0% 0% 0% 0% round 0px)"]
  )
  const inner = useTransform(scrollYProgress, [0, 1], [0.9, 1])

  // Desktop: o preview acompanha a linha sob o mouse. Celular: mostra o item tocado, começando pelo primeiro.
  const shown = active
  const visible = inside && active !== null

  const enter = (i: number) => {
    setActive(i)
    setInside(true)
    const el = rows.current[i]
    if (el) setY(Math.max(0, el.offsetTop + el.offsetHeight / 2 - size / 2))
  }

  const preview = (
    <motion.div
      className="overflow-hidden rounded-2xl border border-rule bg-bg"
      style={{ width: size, height: size }}
      animate={{ opacity: visible ? 1 : 0, scale: visible || reduce ? 1 : 0.92 }}
      transition={{ duration: 0.3, ease }}
    >
      <div className="relative h-full w-full">
        <AnimatePresence initial={false}>
          {shown !== null && (
            <motion.div
              key={shown}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <PreviewFace c={list[shown]} i={shown} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )

  const frame = (
    <div className="relative mx-auto w-full max-w-[1600px] px-[var(--gutter-l)]">
        <div className="relative grid grid-cols-[min(288px,calc(30vw+48px))_minmax(0,1fr)] pt-12">
          <motion.div
              className="pointer-events-none absolute left-0 top-0 z-10"
              initial={false}
              animate={{ y }}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 30 }}
            >
              {preview}
            </motion.div>
          <div className="col-start-2" onPointerLeave={() => setInside(false)}>
            {list.map((c, i) => {
              const on = active === i && inside
              const dim = inside && active !== i
              const title = c.client || c.cat || "Em breve"
              const inner = (
                <>
                  <span>{title}</span>
                  {c.client && c.cat && <span className="ml-4 text-sm font-medium tracking-normal text-mute max-[860px]:hidden">{c.cat}</span>}
                  {c.url && <span className="ml-3 text-[0.6em]">↗</span>}
                </>
              )
              const cls = "block w-fit max-w-full py-1 text-[clamp(2.2rem,5.2vw,4.6rem)] font-semibold leading-[1.08] tracking-[-0.04em] outline-none"
              const common = {
                ref: (el: HTMLElement | null) => {
                  rows.current[i] = el
                },
                onPointerEnter: (e: React.PointerEvent) => {
                  if (e.pointerType === "mouse") enter(i)
                },
                onClick: () => enter(i),
                onFocus: () => enter(i),
                onBlur: () => setInside(false),
              }
              return (
                <motion.div
                  key={i}
                  animate={{ opacity: dim && !reduce ? 0.45 : 1, x: on && !reduce ? 24 : 0 }}
                  transition={{ duration: 0.35, ease }}
                >
                  {c.url ? (
                    <a href={c.url} target="_blank" rel="noopener noreferrer" className={cls} {...common}>
                      {inner}
                    </a>
                  ) : (
                    <div tabIndex={0} className={cls} {...common}>
                      {inner}
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>
    </div>
  )

  return (
    <section id="cases" className={BLOCK}>
      <Head left="Cases" right="Trabalhos recentes" />
      {reduce ? (
        <div className="mt-9 rounded-3xl bg-surface py-12">{frame}</div>
      ) : (
        <div ref={track} className="ml-[calc(50%-50vw)] mr-[calc(50%-50vw)] h-[230vh]">
          <div className="sticky top-0 h-screen">
            <motion.div className="h-full w-full overflow-hidden bg-surface" style={{ clipPath: clip }}>
              <motion.div className="grid h-full w-full place-items-center overflow-y-auto" style={{ scale: inner }}>
                <div className="w-full">{frame}</div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      )}
    </section>
  )
}
