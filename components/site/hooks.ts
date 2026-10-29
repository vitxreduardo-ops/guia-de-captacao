import { useEffect, useState } from "react"

/** Largura da janela. Só muda quando a largura muda de fato, para a barra do navegador no celular não refazer a faixa. */
export function useViewportWidth() {
  const [width, setWidth] = useState(() => (typeof window === "undefined" ? 1280 : window.innerWidth))

  useEffect(() => {
    let timer: number | undefined
    let last = window.innerWidth
    const onResize = () => {
      if (window.innerWidth === last) return
      last = window.innerWidth
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setWidth(window.innerWidth), 150)
    }
    window.addEventListener("resize", onResize)
    return () => {
      window.removeEventListener("resize", onResize)
      window.clearTimeout(timer)
    }
  }, [])

  return width
}

/** Verdadeiro quando a pessoa pediu menos movimento no sistema. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const onChange = () => setReduced(media.matches)
    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [])

  return reduced
}
