import { useSyncExternalStore } from "react"

// No servidor e na hidratação valem os valores de servidor (1280 e false); o
// navegador troca pelos reais logo em seguida, sem descompasso.

function assinarLargura(avisar: () => void) {
  let timer: number | undefined
  const onResize = () => {
    window.clearTimeout(timer)
    timer = window.setTimeout(avisar, 150)
  }
  window.addEventListener("resize", onResize)
  return () => {
    window.removeEventListener("resize", onResize)
    window.clearTimeout(timer)
  }
}

/** Largura da janela. Só muda quando a largura muda de fato, para a barra do navegador no celular não refazer a faixa. */
export function useViewportWidth() {
  return useSyncExternalStore(assinarLargura, () => window.innerWidth, () => 1280)
}

const MENOS_MOVIMENTO = "(prefers-reduced-motion: reduce)"

function assinarMovimento(avisar: () => void) {
  const media = window.matchMedia(MENOS_MOVIMENTO)
  media.addEventListener("change", avisar)
  return () => media.removeEventListener("change", avisar)
}

/** Verdadeiro quando a pessoa pediu menos movimento no sistema. */
export function useReducedMotion() {
  return useSyncExternalStore(assinarMovimento, () => window.matchMedia(MENOS_MOVIMENTO).matches, () => false)
}
