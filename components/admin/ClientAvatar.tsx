import { creatorColor } from "@/lib/editorialMonths";

/** Logo do cliente (quando está no acervo) ou a inicial sobre a cor dele. */
export function ClientAvatar({
  name,
  logoUrl,
  lightLogo = false,
  size = 56,
}: {
  name: string;
  logoUrl: string | null;
  /** Logo branca: vai sobre a tinta da marca, não sobre o branco. */
  lightLogo?: boolean;
  size?: number;
}) {
  const box = { width: size, height: size };
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt=""
        style={box}
        className={`shrink-0 rounded-xl border object-contain p-1.5 ${
          lightLogo ? "border-[var(--tatu-ink)] bg-[var(--tatu-ink)]" : "border-neutral-200 bg-white"
        }`}
      />
    );
  }
  return (
    <span
      aria-hidden
      style={{ ...box, backgroundColor: creatorColor(name) }}
      className="grid shrink-0 place-items-center rounded-xl text-xl font-semibold text-white"
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}
