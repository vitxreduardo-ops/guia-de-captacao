// Tudo que muda no site fica aqui. Deixe vazio o que não for usar.

const base = "/"

export interface CaseItem {
  cat?: string // categoria, ex.: "Manifesto"
  client?: string // nome do cliente
  text?: string // uma ou duas frases
  url?: string // link do resultado
  image?: string // capa, ex.: `${base}trabalhos/capa.jpg`
  video?: string // teaser que toca ao passar o mouse
}

export interface Partner {
  name: string
  logo: string // PNG ou SVG com fundo transparente, de qualquer cor
}

export interface MakingOfItem {
  title?: string
  url?: string
  image?: string
  video?: string
}

export const CONFIG = {
  // Contato e redes
  whatsapp: "https://wa.me/message/EUGPJKECKJANF1", // link pronto do WhatsApp Business, ou só números com DDI e DDD. Ex.: "5577999999999"
  email: "", // e-mail público do estúdio
  instagram: "", // usuário, sem @. Ex.: "tatuestudio"
  youtube: "", // link do canal
  vimeo: "", // link do perfil

  // Hero: link do reel no YouTube ou Vimeo. Ex.: "https://youtu.be/XXXXXXXXXXX"
  hero: "",

  // Vídeo de fundo da primeira tela: arquivo em public/ (sem áudio, leve). Ex.: "/video/fundo.mp4"
  fundo: "/video/fundo.mp4",
  fundoOpacidade: 0.2, // de 0 a 1

  // Cases. Um por trabalho.
  cases: [] as CaseItem[],

  // Parceiros. As logos ficam em public/marcas. O site deixa todas em branco, com 20% de opacidade, sobre fundo preto.
  partners: [
    { name: "Aube Agroindustrial", logo: `${base}marcas/aube.png` },
    { name: "GWM Infinity", logo: `${base}marcas/gwm-infinity.png` },
    { name: "a Raiz da Solução", logo: `${base}marcas/raiz-da-solucao.png` },
    { name: "Eudora", logo: `${base}marcas/eudora.png` },
    { name: "Carmen Steffens", logo: `${base}marcas/carmen-steffens.png` },
    { name: "Santa Lolla", logo: `${base}marcas/santa-lolla.png` },
    { name: "Divinazzi", logo: `${base}marcas/divinazzi.png` },
  ] as Partner[],

  // Making of. Cada card leva ao vídeo.
  makingOf: [] as MakingOfItem[],

  // true mostra espaços "Em breve" nas seções vazias. Antes de publicar, troque para false.
  showEmpty: true,
}

// Faixa de parceiros
export const MARQUEE = {
  speed: 30, // segundos para passar uma lista inteira. Maior é mais lento.
  direction: "left" as "left" | "right", // "left" anda da direita para a esquerda
  pauseOnHover: true, // para quando o mouse está em cima
  // false: a faixa sempre anda. true: quem desligou as animações no sistema (Windows, macOS, iOS, Android)
  // vê as logos paradas. Se a faixa não anda no seu computador, confira essa opção do sistema.
  respectReducedMotion: false,
  // Opacidade das logos, de 0 a 1. Em branco sobre o verde do fundo:
  // 0.2 dá contraste de 1,9:1 (bem discreta), 0.4 dá 3,7:1, 0.5 dá 5:1.
  logoOpacity: 0.2,
}

export function whatsappUrl() {
  if (CONFIG.whatsapp.startsWith("http")) return CONFIG.whatsapp
  const digits = CONFIG.whatsapp.replace(/\D/g, "")
  if (!digits) return ""
  const text = encodeURIComponent("Olá! Vi o site do Tatu Estúdio e gostaria de conversar sobre o meu projeto.")
  return `https://wa.me/${digits}?text=${text}`
}

// Efeitos da seção Cases (moldura que abre no scroll, preview que segue o mouse)
export const MOTION = {
  // false: os efeitos rodam sempre. true: quem ligou "reduzir movimento" no sistema vê a seção parada.
  // Se o efeito não aparece no seu computador, confira essa opção do sistema (macOS: Acessibilidade > Monitor).
  respectReducedMotion: false,
}
