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
