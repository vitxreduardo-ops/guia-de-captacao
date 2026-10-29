"use client"

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react"
import { CONFIG } from "./config"
import { Cases } from "./Cases"
import { MakingOf } from "./MakingOf"
import { Partners } from "./Partners"
import { Contact, Footer, Header, Hero, Intro, Sobre, Studio } from "./sections"

const nada = () => () => {}

/**
 * O site do estúdio, que é também a tela de login: "Entrar" abre o bloco
 * `#entrar` (popover nativo, fecha com Esc ou clicando fora) com o formulário.
 */
export default function Site({ login, abrirLogin }: { login: ReactNode; abrirLogin: boolean }) {
  const bloco = useRef<HTMLDivElement>(null)
  // O site foi feito pra rodar só no navegador (mede a janela já no primeiro
  // render): renderizado no servidor, Cases e Parceiros não batiam na hidratação.
  const noNavegador = useSyncExternalStore(nada, () => true, () => false)

  // Senha errada volta pra cá com ?error: o bloco já abre com a mensagem.
  useEffect(() => {
    if (abrirLogin) bloco.current?.showPopover()
  }, [abrirLogin, noNavegador])

  // Com showEmpty desligado, as seções sem conteúdo e os links delas somem
  const showHero = Boolean(CONFIG.hero) || CONFIG.showEmpty
  const showCases = CONFIG.cases.length > 0 || CONFIG.showEmpty
  const showPartners = CONFIG.partners.length > 0 || CONFIG.showEmpty
  const showMaking = CONFIG.makingOf.length > 0 || CONFIG.showEmpty

  if (!noNavegador) return null

  return (
    <div className="wrap">
      <Header showCases={showCases} showPartners={showPartners} showMaking={showMaking} />
      {showHero && <Hero />}
      <Intro showCases={showCases} />
      <Sobre />
      {showPartners && <Partners />}
      {showCases && <Cases />}
      <Studio />
      {showMaking && <MakingOf />}
      <Contact />
      <Footer />

      <div
        ref={bloco}
        id="entrar"
        popover="auto"
        aria-labelledby="entrar-titulo"
        // O popover não puxa o foco sozinho: vai pro primeiro campo vazio.
        onToggle={(e) => {
          if ((e as unknown as ToggleEvent).newState !== "open") return
          const campos = bloco.current?.querySelectorAll<HTMLInputElement>("#username, #password")
          ;[...(campos ?? [])].find((c) => !c.value)?.focus()
        }}
        className="m-auto w-[min(24rem,calc(100vw-40px))] rounded-lg bg-[#fff6e3] p-8 text-[#2f3b1e] shadow-2xl backdrop:bg-black/60"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <h2 id="entrar-titulo" className="text-xl font-semibold">
            Entrar no sistema
          </h2>
          <button
            type="button"
            popoverTarget="entrar"
            popoverTargetAction="hide"
            aria-label="Fechar"
            className="-mr-2 -mt-1 cursor-pointer px-2 text-2xl leading-none opacity-60 hover:opacity-100"
          >
            ×
          </button>
        </div>
        {login}
      </div>
    </div>
  )
}
