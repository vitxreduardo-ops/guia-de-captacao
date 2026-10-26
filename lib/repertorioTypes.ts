// Tipos e regras do Repertório que valem nos dois lados (servidor e tela).

export type Fonte = {
  id: string;
  nome: string;
  feed_url: string;
  tema: string;
  ativa: boolean;
  ultima_coleta_em: string | null;
  ultimo_erro: string | null;
  created_at: string;
};

export type Noticia = {
  id: string;
  url: string;
  titulo: string;
  resumo: string;
  publicadoEm: string | null;
  coletadoEm: string;
  guardada: boolean;
  lida: boolean;
  fonte: { id: string; nome: string; tema: string };
};

export const VISOES = ["todas", "nao-lidas", "guardadas"] as const;
export type Visao = (typeof VISOES)[number];

export const VISAO_ROTULO: Record<Visao, string> = {
  todas: "Todas",
  "nao-lidas": "Não lidas",
  guardadas: "Guardadas",
};

export type FiltroNoticias = {
  tema?: string;
  visao: Visao;
  busca?: string;
  pagina: number;
};

export type ResultadoColeta = {
  fontes: number;
  novas: number;
  erros: { nome: string; erro: string }[];
};

/** Sugestões do campo tema. A lista é aberta: qualquer texto vale. */
export const TEMAS_SUGERIDOS = ["Marketing", "Mercado", "Tecnologia", "Fisioterapia", "Cultura"];

export const POR_PAGINA = 30;

export function lerVisao(valor: unknown): Visao {
  return VISOES.includes(valor as Visao) ? (valor as Visao) : "todas";
}

export function lerPagina(valor: unknown): number {
  const n = Number(valor);
  return Number.isInteger(n) && n > 1 ? Math.min(n, 500) : 1;
}

/**
 * Termos da busca prontos pro filtro do PostgREST. Vírgula, parênteses e
 * curinga mudam o sentido do `or=(...)`: saem antes de virar consulta.
 */
export function termosDaBusca(busca: string | undefined): string[] {
  return (busca ?? "")
    .replace(/[,()*%\\:"']/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
    .slice(0, 5);
}

/** Fuso das datas na tela: o servidor roda em UTC e "hoje" é o daqui. */
export const FUSO = "America/Sao_Paulo";

/** Dia (AAAA-MM-DD) de um instante, no fuso do estúdio. */
export function diaDe(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

/** "Hoje", "Ontem" ou "23 de out." — o título de cada grupo da lista. */
export function rotuloDoDia(dia: string, hoje: string): string {
  if (dia === hoje) return "Hoje";
  const ontem = new Date(`${hoje}T12:00:00Z`);
  ontem.setUTCDate(ontem.getUTCDate() - 1);
  if (dia === ontem.toISOString().slice(0, 10)) return "Ontem";
  const mesmoAno = dia.slice(0, 4) === hoje.slice(0, 4);
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    ...(mesmoAno ? {} : { year: "numeric" }),
  }).format(new Date(`${dia}T12:00:00Z`));
}

/** Hora da notícia ("09:03") para a linha de cima do item. */
export function horaDe(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Instante usado pra ordenar e agrupar: a data do feed, ou a da coleta. */
export const quandoDe = (n: Pick<Noticia, "publicadoEm" | "coletadoEm">) =>
  n.publicadoEm ?? n.coletadoEm;

/** Agrupa por dia, mantendo a ordem que veio do banco. */
export function agruparPorDia<T extends Pick<Noticia, "publicadoEm" | "coletadoEm">>(
  noticias: T[]
): { dia: string; noticias: T[] }[] {
  const grupos: { dia: string; noticias: T[] }[] = [];
  for (const noticia of noticias) {
    const dia = diaDe(quandoDe(noticia));
    const ultimo = grupos.at(-1);
    if (ultimo?.dia === dia) ultimo.noticias.push(noticia);
    else grupos.push({ dia, noticias: [noticia] });
  }
  return grupos;
}

/** "há 3 h", "há 2 dias": quanto tempo faz a última coleta. */
export function haQuanto(iso: string, agora = new Date()): string {
  const minutos = Math.max(0, Math.round((agora.getTime() - new Date(iso).getTime()) / 60000));
  if (minutos < 1) return "agora";
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.round(horas / 24);
  return dias === 1 ? "há 1 dia" : `há ${dias} dias`;
}
