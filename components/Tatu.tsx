'use client'

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react'
import { useEffect, type RefObject } from 'react'

// Springs (Apple): damping crítico por padrão; bounce só onde há momento físico.
export const suave = { bounce: 0, visualDuration: 0.4 } as const
export const elastico = { bounce: 0.25, visualDuration: 0.3 } as const

/** Olhar que segue o ponteiro, com springs independentes em X e Y. */
export function useOlhar(cenaRef: RefObject<HTMLElement | null>, travado: boolean, baixo: boolean) {
  const reduzido = useReducedMotion()
  const alvoX = useMotionValue(0)
  const alvoY = useMotionValue(0)
  const olhoX = useSpring(alvoX, suave)
  const olhoY = useSpring(alvoY, suave)

  useEffect(() => {
    if (reduzido) return
    const mover = (e: PointerEvent) => {
      const r = cenaRef.current?.getBoundingClientRect()
      if (!r) return
      const clamp = (v: number) => Math.max(-1, Math.min(1, v))
      alvoX.set(clamp((e.clientX - (r.left + r.width / 2)) / (r.width / 2)) * 8)
      alvoY.set(clamp((e.clientY - (r.top + r.height / 2)) / (r.height * 1.2)) * 6)
    }
    window.addEventListener('pointermove', mover)
    return () => window.removeEventListener('pointermove', mover)
  }, [alvoX, alvoY, cenaRef, reduzido])

  useEffect(() => {
    if (travado) {
      alvoX.set(0)
      alvoY.set(0)
    } else if (baixo) {
      alvoY.set(5)
    }
  }, [travado, baixo, alvoX, alvoY])

  return { olhoX, olhoY }
}

export function Tatu({
  olhoX,
  olhoY,
  tapando,
  feliz,
}: {
  olhoX: ReturnType<typeof useSpring>
  olhoY: ReturnType<typeof useSpring>
  tapando: boolean
  feliz: boolean
}) {
  // a cabeça acompanha o ponteiro; os olhos deslizam um pouco mais dentro dela
  const cabecaX = useTransform(olhoX, (v) => v * 0.9)
  const cabecaY = useTransform(olhoY, (v) => v * 0.8)
  const cabecaGiro = useTransform(olhoX, (v) => v * 0.45)
  const pupilaX = useTransform(olhoX, (v) => v * 0.5)
  const pupilaY = useTransform(olhoY, (v) => v * 0.5)

  return (
    <svg viewBox="0 0 300 210" className="w-full">
      <defs>
        <linearGradient id="casco" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a9805e" />
          <stop offset="100%" stopColor="#7d5a3f" />
        </linearGradient>
        <linearGradient id="pele" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f3d6b3" />
          <stop offset="100%" stopColor="#dfb488" />
        </linearGradient>
        <filter id="sombraTatu" x="-30%" y="-30%" width="160%" height="180%">
          <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#6b4a30" floodOpacity="0.28" />
        </filter>
      </defs>

      {/* sombra no chão */}
      <ellipse cx="150" cy="196" rx="78" ry="9" fill="#7d5a3f" opacity="0.16" />

      <g filter="url(#sombraTatu)">
        {/* rabo */}
        <path
          d="M232 176c22-4 30-20 26-38"
          fill="none"
          stroke="#a9805e"
          strokeWidth="13"
          strokeLinecap="round"
        />


        {/* casco */}
        <path d="M46 186a104 82 0 01208 0z" fill="url(#casco)" />
        <path d="M46 186a104 82 0 01208 0z" fill="none" stroke="#6d4d35" strokeOpacity="0.5" strokeWidth="3" />
        {/* faixas do casco */}
        <g fill="none" stroke="#6d4d35" strokeOpacity="0.35" strokeWidth="4" strokeLinecap="round">
          <path d="M68 172a82 64 0 01164 0" />
          <path d="M84 156a66 52 0 01132 0" />
          <path d="M100 142a50 40 0 01100 0" />
          <path d="M116 132a34 27 0 0168 0" />
        </g>

        {/* cabeça — espiando pela lateral esquerda do casco */}
        <g transform="translate(-66 44) rotate(-14 150 100)">
          <motion.g style={{ x: cabecaX, y: cabecaY, rotate: cabecaGiro, originX: '150px', originY: '128px' }}>
          {/* orelhas — grandes e eretas, como as do tatu */}
          <path d="M112 60c-6-24 2-34 12-32s12 14 8 32z" fill="#c79a72" />
          <path d="M188 60c6-24-2-34-12-32s-12 14-8 32z" fill="#c79a72" />

          {/* cabeça */}
          <ellipse cx="150" cy="88" rx="46" ry="40" fill="url(#pele)" />

          {/* focinho comprido */}
          <path d="M150 96c14 0 20 10 20 24s-8 22-20 22-20-8-20-22 6-24 20-24z" fill="#c79a72" />
          <ellipse cx="150" cy="136" rx="11" ry="8" fill="#8a6247" />
          <circle cx="146" cy="135" r="2.2" fill="#3b2a1d" />
          <circle cx="154" cy="135" r="2.2" fill="#3b2a1d" />

          {/* olhos */}
          <motion.g style={{ x: pupilaX, y: pupilaY }}>
            {[126, 161].map((cx) => (
              <motion.rect
                key={cx}
                x={cx}
                y={70}
                width={13}
                height={28}
                rx="6.5"
                fill="#3b2a1d"
                initial={false}
                animate={{ attrY: tapando ? 84 : feliz ? 76 : 70, height: tapando ? 5 : feliz ? 15 : 28 }}
                transition={{ type: 'spring', ...suave }}
              />
            ))}
            </motion.g>
          </motion.g>
        </g>

        {/* patinha dianteira: descansa na frente do corpo, sobe até a bochecha */}
        <motion.ellipse
          cx="128"
          cy="189"
          rx="16"
          ry="10"
          fill="#c79a72"
          initial={false}
          animate={{ y: tapando ? -104 : 0, x: tapando ? 2 : 0, rotate: tapando ? -28 : 0 }}
          style={{ originX: '128px', originY: '189px' }}
          transition={{ type: 'spring', ...elastico }}
        />
      </g>
    </svg>
  )
}

/** Cena completa: tatu respirando + balão que reage. */
export function Cena({
  cenaRef,
  olhoX,
  olhoY,
  tapando,
  feliz,
  fala,
}: {
  cenaRef: RefObject<HTMLDivElement | null>
  olhoX: ReturnType<typeof useSpring>
  olhoY: ReturnType<typeof useSpring>
  tapando: boolean
  feliz: boolean
  fala: string
}) {
  return (
    <div ref={cenaRef} className="mb-6 flex flex-col items-center">
      <div className="respira w-64">
        <Tatu olhoX={olhoX} olhoY={olhoY} tapando={tapando} feliz={feliz} />
      </div>
      <p
        key={fala}
        className="fala mt-3 rounded-full bg-white px-4 py-2 text-[13px] font-medium tracking-[0.005em] text-neutral-700 shadow-[0_1px_2px_rgba(0,0,0,.06),0_8px_24px_rgba(0,0,0,.06)]"
      >
        {fala}
      </p>
      <style>{`
        .respira { animation: respira 5s ease-in-out infinite; transform-origin: 50% 100% }
        @keyframes respira { 50% { transform: scale(1.02) translateY(-3px) } }
        .fala { animation: falaEntra .34s cubic-bezier(.22,1,.36,1) }
        @keyframes falaEntra { from { opacity: 0; transform: translateY(6px) scale(.96) } }
        @media (prefers-reduced-motion: reduce) {
          .respira { animation: none }
          .fala { animation: falaFade .2s ease }
          @keyframes falaFade { from { opacity: 0 } }
        }
      `}</style>
    </div>
  )
}

export function Campo({
  label,
  hint,
  value,
  onChange,
  ...props
}: {
  label: string
  hint?: string
  value: string
  onChange: (v: string) => void
  type?: string
  autoComplete?: string
  onFocus?: () => void
  onBlur?: () => void
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-neutral-600">{label}</span>
      <input
        {...props}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-[15px] outline-none transition-[border-color,box-shadow] duration-150 focus:border-neutral-900 focus:shadow-[0_0_0_3px_rgba(0,0,0,.06)]"
      />
      {hint && <span className="mt-1 block text-[12px] text-neutral-400">{hint}</span>}
    </label>
  )
}

export function Botao({ children, ...props }: React.ComponentProps<typeof motion.button>) {
  return (
    <motion.button
      {...props}
      whileTap={props.disabled ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', ...suave }}
      className="mt-2 w-full rounded-2xl bg-neutral-900 py-3.5 text-[15px] font-medium text-white transition-opacity disabled:opacity-25"
    >
      {children}
    </motion.button>
  )
}
