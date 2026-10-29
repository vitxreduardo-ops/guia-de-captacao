import { useEffect, useMemo, useState } from "react"
import { CONFIG, MARQUEE, type Partner } from "./config"
import { Marquee } from "./Marquee"
import { useReducedMotion, useViewportWidth } from "./hooks"
import { BLOCK, Head } from "./parts"

interface Loaded {
  partner: Partner
  ratio: number
}

/** Carrega as logos para saber a proporção de cada uma */
function useLoadedLogos(partners: Partner[]) {
  const [loaded, setLoaded] = useState<Loaded[]>([])

  useEffect(() => {
    let alive = true
    Promise.all(
      partners.map(
        (partner) =>
          new Promise<Loaded | null>((resolve) => {
            const img = new Image()
            img.onload = () => resolve({ partner, ratio: img.naturalWidth / img.naturalHeight })
            img.onerror = () => resolve(null)
            img.src = partner.logo
          })
      )
    ).then((res) => {
      if (alive) setLoaded(res.filter((r): r is Loaded => r !== null))
    })
    return () => {
      alive = false
    }
  }, [partners])

  return loaded
}

// Margem de 4rem de cada lado, como no componente original
const MARGIN = 128

function LogoItem({ name, src, width, hidden }: { name: string; src: string; width: number; hidden?: boolean }) {
  return (
    <div className="mx-16 flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      <img
        src={src}
        alt={hidden ? "" : name}
        style={{ width, opacity: MARQUEE.logoOpacity }}
        className="block h-auto max-w-none brightness-0 invert"
      />
    </div>
  )
}

function Row({ items, direction, vw, area }: { items: Loaded[]; direction: "left" | "right"; vw: number; area: number }) {
  const sized = items.map((d) => ({ ...d, width: Math.round(Math.sqrt(area * d.ratio)) }))
  // Uma metade da faixa precisa cobrir a tela, senão aparece um vazio no fim do loop
  const listWidth = sized.reduce((sum, d) => sum + d.width + MARGIN, 0)
  const reps = listWidth > 0 ? Math.max(1, Math.ceil(vw / listWidth)) : 1
  // Mesma velocidade por pixel nas duas linhas, mesmo com quantidades diferentes
  const duration = Math.round((MARQUEE.speed * reps * listWidth) / 1200) || MARQUEE.speed
  return (
    <Marquee
      className="mt-0 sm:mt-0"
      speed={duration}
      direction={direction}
      pauseOnHover={MARQUEE.pauseOnHover}
      respectReducedMotion={MARQUEE.respectReducedMotion}
    >
      {Array.from({ length: reps }, (_, k) =>
        sized.map((d) => (
          <LogoItem key={`${k}-${d.partner.name}`} name={d.partner.name} src={d.partner.logo} width={d.width} hidden={k > 0} />
        ))
      )}
    </Marquee>
  )
}

export function Partners() {
  const loaded = useLoadedLogos(CONFIG.partners)
  const vw = useViewportWidth()
  const reduced = useReducedMotion() && MARQUEE.respectReducedMotion
  const area = vw < 700 ? 8000 : 13000

  // Divide em duas linhas, alternando para equilibrar o peso visual
  const rowA = loaded.filter((_, i) => i % 2 === 0)
  const rowB = loaded.filter((_, i) => i % 2 === 1)
  const other = MARQUEE.direction === "left" ? "right" : "left"

  let body
  if (CONFIG.partners.length === 0) {
    body = (
      <div className="flex flex-wrap gap-y-9 px-[var(--gutter-l)] py-9">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className="mx-16 text-[0.78rem] uppercase tracking-[0.3em] text-mute">
            Em breve
          </span>
        ))}
      </div>
    )
  } else if (reduced) {
    body = (
      <div className="flex flex-wrap gap-y-9 px-[var(--gutter-l)] py-9">
        {loaded.map((d) => (
          <LogoItem key={d.partner.name} name={d.partner.name} src={d.partner.logo} width={Math.round(Math.sqrt(area * d.ratio))} />
        ))}
      </div>
    )
  } else {
    body = (
      <div className="flex flex-col gap-2">
        <Row items={rowA} direction={MARQUEE.direction} vw={vw} area={area} />
        <Row items={rowB} direction={other} vw={vw} area={area} />
      </div>
    )
  }

  return (
    <section id="parceiros" className={BLOCK}>
      <Head left="Parceiros" right="Marcas que atendemos" />
      <div className="ml-[calc(50%-50vw)] mr-[calc(50%-50vw)] mt-9 min-h-[9rem] overflow-hidden py-4">
        {body}
      </div>
    </section>
  )
}
