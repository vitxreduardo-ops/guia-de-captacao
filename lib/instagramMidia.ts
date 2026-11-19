// Regras de mídia do Instagram que rodam no servidor e no navegador.
// Imagem só JPEG (exigência da API de publicação); vídeo MP4 ou MOV.

export const IG_MEDIA_PREFIX = "instagram";

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
};

/** Extensão do arquivo aceito, ou null quando o Instagram não publica. */
export function igExtensionFor(contentType: string): string | null {
  return EXTENSION_BY_TYPE[contentType.split(";")[0].trim().toLowerCase()] ?? null;
}

export const IG_FORMAT_ERROR =
  "O Instagram só aceita imagem JPEG e vídeo MP4 ou MOV. Converta o arquivo e tente de novo.";

const DRIVE_FILE_PATTERNS = [
  /\/file\/d\/([a-zA-Z0-9_-]+)/, // drive.google.com/file/d/ID/view
  /[?&]id=([a-zA-Z0-9_-]+)/, // drive.google.com/open?id=ID ou uc?id=ID
];

export function extractDriveFileId(url: string): string | null {
  for (const pattern of DRIVE_FILE_PATTERNS) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

export const isVideoUrl = (url: string) => /\.(mp4|mov)(\?|$)/i.test(url);

/** Só http(s) válido, sem repetir (o mesmo link colado duas vezes vira post duplicado). */
export function cleanMediaUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  for (const raw of urls) {
    try {
      const url = new URL(raw.trim());
      if (url.protocol === "https:" || url.protocol === "http:") seen.add(url.href);
    } catch {
      // link quebrado: some da lista
    }
  }
  return [...seen];
}

/** Quantas mídias cada formato aceita; "card" com 2+ sai como carrossel. */
export function igMediaLimits(format: string): { min: number; max: number } {
  if (format === "carrossel") return { min: 2, max: 20 };
  if (format === "card") return { min: 1, max: 20 };
  return { min: 1, max: 1 };
}

/** Texto do problema (ou null) pra esta lista de mídias neste formato. */
export function igMediaProblem(format: string, urls: string[]): string | null {
  const { min, max } = igMediaLimits(format);
  const count = urls.length;
  if (count < min || count > max) {
    return min === max
      ? `Este formato leva exatamente 1 mídia (tem ${count}). Para várias, use Carrossel.`
      : `Este formato leva de ${min} a ${max} mídias (tem ${count}).`;
  }
  if (format === "reel" && !isVideoUrl(urls[0])) {
    return "Reel precisa de vídeo (MP4 ou MOV).";
  }
  return null;
}

/** Faixa que o feed do Instagram aceita sem cortar: de 4:5 (retrato) a 1,91:1. */
export const IG_FEED_RATIO = { min: 0.8, max: 1.91 };

const br = (n: number) => n.toFixed(2).replace(".", ",");

/**
 * Problema de proporção (ou null). `ratios` segue a ordem das mídias, com
 * `undefined` pra quem ainda não carregou. Reel e story são verticais e ficam
 * fora: o Instagram aceita lá o que o feed corta.
 */
export function igRatioProblem(format: string, ratios: (number | undefined)[]): string | null {
  if (format === "reel" || format === "story") return null;
  const out = ratios.findIndex(
    (r) => r !== undefined && (r < IG_FEED_RATIO.min - 0.01 || r > IG_FEED_RATIO.max + 0.01)
  );
  if (out >= 0) {
    return `A mídia ${out + 1} tem proporção ${br(ratios[out]!)}: o feed aceita de 0,80 (4:5) a 1,91. Fora disso o Instagram corta ou recusa.`;
  }
  const isCarousel = format === "carrossel" || (format === "card" && ratios.length > 1);
  const first = ratios[0];
  if (!isCarousel || first === undefined) return null;
  const odd = ratios.findIndex((r) => r !== undefined && Math.abs(r / first - 1) > 0.02);
  if (odd > 0) {
    return `A mídia ${odd + 1} tem proporção diferente da primeira (${br(ratios[odd]!)} contra ${br(first)}): o Instagram corta todas na da primeira. Use a mesma proporção (ex.: todas 4:5).`;
  }
  return null;
}

/** "qua., 26/11 às 10:00" no horário de Brasília. */
export function formatPublishAt(iso: string): string {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(d);
  const time = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(d);
  return `${day} às ${time}`;
}

/** "em 6 dias", "em 3 h", "em 20 min"; "agora" quando já passou. */
export function publishCountdown(iso: string, now = Date.now()): string {
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return "agora";
  const min = Math.round(ms / 60_000);
  if (min < 60) return `em ${Math.max(min, 1)} min`;
  const hours = Math.round(min / 60);
  if (hours < 24) return `em ${hours} h`;
  const days = Math.round(hours / 24);
  return `em ${days} ${days === 1 ? "dia" : "dias"}`;
}

/** PNG/WebP o navegador converte pra JPEG; o resto o Instagram não publica. */
export const IG_CONVERTIBLE_TYPES = ["image/png", "image/webp"];
