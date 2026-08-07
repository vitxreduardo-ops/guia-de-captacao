const IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".avif",
  ".svg",
];

export function isLikelyImageUrl(url: string): boolean {
  try {
    const { pathname } = new URL(url);
    const lower = pathname.toLowerCase();
    return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
  } catch {
    return false;
  }
}
