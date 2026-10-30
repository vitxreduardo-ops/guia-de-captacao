import { RevealStagger, RevealItem, Reveal } from "@/components/Reveal"
import { CONFIG, whatsappUrl } from "./config"
import { cn } from "@/lib/utils"
import { TatuIcon, TatuWordmark } from "./Logo"
import { BLOCK, Head, Row, ScrubText } from "./parts"

const hover = "transition-opacity hover:opacity-[.55]"
const hideSmall = "max-[860px]:hidden"

interface NavFlags {
  showCases: boolean
  showPartners: boolean
  showMaking: boolean
}

export function Header({ showCases, showPartners, showMaking }: NavFlags) {
  return (
    <header className="flex items-center justify-between gap-5 py-[22px] text-[0.95rem] font-medium">
      <a href="#" aria-label="Tatu Estúdio Criativo, início" className={cn(hover, "flex items-center gap-3")}>
        <TatuIcon className="h-7 w-auto" />
        <TatuWordmark className="h-7 w-auto max-[520px]:hidden" />
      </a>
      <nav aria-label="Principal" className="flex gap-7 max-[860px]:gap-5">
        {showCases && (
          <a href="#cases" className={hover}>
            Cases
          </a>
        )}
        <a href="#sobre" className={cn(hover, hideSmall)}>
          Sobre
        </a>
        {showPartners && (
          <a href="#parceiros" className={cn(hover, hideSmall)}>
            Parceiros
          </a>
        )}
        {showMaking && (
          <a href="#making" className={cn(hover, hideSmall)}>
            Making Of
          </a>
        )}
        <a href="#contato" className={cn(hover, hideSmall)}>
          Contato
        </a>
        <button type="button" popoverTarget="entrar" className={cn(hover, "cursor-pointer")}>
          Entrar
        </button>
      </nav>
    </header>
  )
}

/** Converte link do YouTube ou Vimeo no endereço de incorporação, mudo e em loop */
function embedUrl(url: string) {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/)
  if (yt) {
    const id = yt[1]
    return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&modestbranding=1&rel=0&playsinline=1`
  }
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}?background=1&autoplay=1&muted=1&loop=1`
  return url
}

export function Hero() {
  return (
    <div
      role="group"
      aria-label="Reel do estúdio"
      className="relative mt-2 aspect-video max-w-full overflow-hidden bg-surface"
    >
      {CONFIG.hero ? (
        <iframe
          src={embedUrl(CONFIG.hero)}
          title="Reel do Tatu Estúdio Criativo"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center text-[0.78rem] uppercase tracking-[0.3em] text-mute">
          Em breve
        </div>
      )}
    </div>
  )
}

export function Intro({ showCases }: { showCases: boolean }) {
  const wa = whatsappUrl()
  const link = "border-b border-current pb-px text-fg hover:opacity-[.55]"
  return (
    // No celular: título no meio da tela, cidade logo abaixo e os links no pé (o pai é flex-col de altura da tela).
    <section className="grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] items-start gap-8 pt-12 max-[860px]:flex max-[860px]:flex-1 max-[860px]:flex-col max-[860px]:items-center max-[860px]:gap-3.5 max-[860px]:pb-10 max-[860px]:text-center">
      <p className="text-sm font-medium text-mute max-[860px]:order-2">Luís Eduardo Magalhães, Bahia</p>
      <div className="max-[860px]:contents">
        <h1 className="max-w-[21em] text-balance max-[860px]:order-1 max-[860px]:mt-auto text-[clamp(2rem,5.2vw,4.8rem)] font-medium leading-[1.08] tracking-[-0.03em]">
          Estúdio de vídeo, arte e estratégia.
        </h1>
        <p className="mt-7 flex flex-wrap gap-x-7 gap-y-2 text-[1.15rem] text-mute max-[860px]:order-3 max-[860px]:mt-auto max-[860px]:justify-center">
          {showCases && (
            <a href="#cases" className={link}>
              Ver cases ↗
            </a>
          )}
          <a
            href={wa || "#contato"}
            className={link}
            {...(wa ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            Fale com a gente ↗
          </a>
        </p>
      </div>
    </section>
  )
}

const ETAPAS = [
  { title: "Estratégia", desc: "Diagnóstico · Posicionamento · Planejamento · Leitura do atendimento e das vendas" },
  { title: "Criação", desc: "Conceito · Roteiro · Direção de arte · Identidade visual · Landing pages e sites" },
  { title: "Produção", desc: "Captação de vídeo e foto · Direção no set · Locução · Cobertura de eventos" },
  { title: "Pós-produção", desc: "Edição · Motion · Cortes para redes · Finalização e entrega" },
]

export function Sobre() {
  return (
    <section id="sobre" className={BLOCK}>
      <Head left="Sobre" right="Do diagnóstico à entrega" />
      <RevealStagger>
        {ETAPAS.map((e) => (
          <RevealItem key={e.title}>
            <Row href="#contato" title={e.title} desc={e.desc} />
          </RevealItem>
        ))}
      </RevealStagger>
    </section>
  )
}

const FACTS = [
  { title: "Equipe pequena", text: "Quem conversa com você é quem produz." },
  { title: "Escopo sob medida", text: "Montado com a sua empresa, item por item." },
  { title: "Parceria contínua", text: "Resultado em comunicação vem de repetição." },
]

export function Studio() {
  return (
    <section
      id="estudio"
      className={cn(
        BLOCK,
        "grid grid-cols-[minmax(0,1fr)_minmax(0,3fr)] gap-8 max-[860px]:grid-cols-1 max-[860px]:gap-3.5"
      )}
    >
      <p className="text-sm font-medium text-mute">Estúdio</p>
      <div>
        <ScrubText className="text-pretty text-[clamp(1.5rem,2.6vw,2.5rem)] font-medium leading-[1.15] tracking-[-0.025em]">
          Conteúdo bom não resolve atendimento ruim. Antes de filmar ou desenhar, olhamos o caminho inteiro do cliente:
          como ele chega, quem atende e como a venda acontece. Às vezes a resposta é um vídeo. Às vezes é outra coisa, e
          a gente diz.
        </ScrubText>
        <RevealStagger className="mt-[72px] grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-8">
          {FACTS.map((f) => (
            <RevealItem key={f.title} className="border-t border-fg pt-3.5">
              <h3 className="mb-2 text-[1.1rem] font-semibold tracking-[-0.01em]">{f.title}</h3>
              <p className="text-mute">{f.text}</p>
            </RevealItem>
          ))}
        </RevealStagger>
      </div>
    </section>
  )
}

export function Contact() {
  const wa = whatsappUrl()
  const hasAny = Boolean(wa || CONFIG.email)
  return (
    <section id="contato" className={BLOCK}>
      <Reveal>
      <h2 className="mb-14 text-[clamp(3.4rem,14vw,13rem)] font-extrabold leading-[0.85] tracking-[-0.06em]">
        {wa ? (
          <a href={wa} target="_blank" rel="noopener noreferrer" className="underline decoration-[0.04em] underline-offset-[0.08em] transition-opacity hover:opacity-[.55]">
            Vamos conversar?
          </a>
        ) : (
          "Vamos conversar?"
        )}
      </h2>
      </Reveal>
      <div>
        {wa && (
          <Row href={wa} title="WhatsApp" desc="Resposta de quem vai trabalhar no projeto" small inheritDesc external />
        )}
        {CONFIG.email && <Row href={`mailto:${CONFIG.email}`} title="E-mail" desc={CONFIG.email} small inheritDesc />}
        {!hasAny && <p className="border-t border-fg py-[22px] text-mute">Canais de contato em atualização.</p>}
      </div>
    </section>
  )
}

export function Footer() {
  const social = [
    { name: "Instagram", url: CONFIG.instagram ? `https://instagram.com/${encodeURIComponent(CONFIG.instagram)}` : "" },
    { name: "YouTube", url: CONFIG.youtube },
    { name: "Vimeo", url: CONFIG.vimeo },
  ].filter((s) => s.url)

  return (
    <footer className="mt-[140px] flex flex-wrap justify-between gap-x-7 gap-y-2.5 border-t border-fg pb-8 pt-6 text-[0.9rem] font-medium max-[860px]:mt-[100px]">
      <div className="mb-10 flex w-full flex-wrap items-center gap-x-6 gap-y-4">
        <TatuIcon className="h-[clamp(36px,5vw,72px)] w-auto" />
        <TatuWordmark className="h-[clamp(36px,5vw,72px)] w-auto" />
      </div>
      <span>© 2026 Tatu Estúdio Criativo</span>
      <span className="text-mute">Luís Eduardo Magalhães, BA</span>
      <span className="flex flex-wrap gap-x-[22px] gap-y-1.5">
        {social.map((s) => (
          <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer" className={hover}>
            {s.name} ↗
          </a>
        ))}
      </span>
      <button type="button" popoverTarget="entrar" className={cn(hover, "cursor-pointer")}>
        Entrar no sistema
      </button>
    </footer>
  )
}
