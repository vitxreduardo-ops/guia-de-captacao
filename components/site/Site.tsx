"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { CONFIG } from "./config"
import { Cases } from "./Cases"
import { MakingOf } from "./MakingOf"
import { Partners } from "./Partners"
import { Contact, Footer, Header, Hero, Intro, Sobre, Studio } from "./sections"

/**
 * O site do estúdio, que é também a tela de login: "Entrar" abre o bloco
 * `#entrar` (popover nativo, fecha com Esc ou clicando fora) com o formulário.
 */
export default function Site({ login, abrirLogin }: { login: ReactNode; abrirLogin: boolean }) {
  const bloco = useRef<HTMLDivElement>(null)

  // Senha errada volta pra cá com ?error: o bloco já abre com a mensagem.
  useEffect(() => {
    if (abrirLogin) bloco.current?.showPopover()
  }, [abrirLogin])

  // Com showEmpty desligado, as seções sem conteúdo e os links delas somem
  // O Hero só aparece com o reel: um "Em breve" do tamanho da tela era a primeira coisa vista.
  const showHero = Boolean(CONFIG.hero)
  const showCases = CONFIG.cases.length > 0 || CONFIG.showEmpty
  const showPartners = CONFIG.partners.length > 0 || CONFIG.showEmpty
  const showMaking = CONFIG.makingOf.length > 0 || CONFIG.showEmpty

  return (
    <div className="wrap">
      {CONFIG.fundo && (
        // Atrás só da primeira tela, de ponta a ponta; o degradê embaixo funde no fundo da página.
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-svh overflow-hidden">
          <video
            src={CONFIG.fundo}
            autoPlay
            muted
            loop
            playsInline
            disablePictureInPicture
            disableRemotePlayback
            preload="auto"
            className="h-full w-full object-cover"
            style={{ opacity: CONFIG.fundoOpacidade }}
          />
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-b from-transparent to-bg" />
        </div>
      )}
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
