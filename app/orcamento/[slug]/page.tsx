import { notFound } from "next/navigation";
import { getBudgetBySlugWithSections } from "@/lib/budgets";
import { PACKAGE_WHATSAPP_URL } from "@/lib/budgetCalc";
import { TatuLogo } from "@/components/TatuLogo";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

function money(n: number) {
  return "R$ " + (Number(n) || 0).toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
  });
}

/**
 * As cores de fundo dos blocos (seções full-width) são sempre uma destas
 * duas — nunca outra cor — alternando conforme os blocos aparecem na
 * página: #838059 (olive, texto claro) e #DBD5CA (bege claro, texto
 * escuro). O índice pula seções que não são renderizadas (ex: "Sobre"
 * vazio) pra manter a alternação visual mesmo quando uma proposta não usa
 * todas as seções.
 */
function blockTone(index: number) {
  const isDark = index % 2 === 0;
  return {
    isDark,
    bg: isDark ? "bg-[var(--tatu-olive)]" : "bg-[var(--tatu-beige)]",
    text: isDark ? "text-[var(--tatu-cream)]" : "text-[var(--tatu-ink)]",
    textMuted: isDark ? "text-[var(--tatu-cream)]/75" : "text-[var(--tatu-ink)]/70",
    divider: isDark ? "border-[var(--tatu-cream)]/20" : "border-[var(--tatu-ink)]/15",
    iconBorder: isDark ? "border-[var(--tatu-cream)]/30" : "border-[var(--tatu-olive)]/40",
    iconColor: isDark ? "text-[var(--tatu-cream)]" : "text-[var(--tatu-olive)]",
  };
}

function HeroBackground({ url }: { url: string }) {
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (/\.mp4($|\?)/i.test(trimmed)) {
    return (
      <video
        className="absolute inset-0 h-full w-full object-cover opacity-40"
        autoPlay
        muted
        loop
        playsInline
        src={trimmed}
      />
    );
  }

  const yt = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/embed\/)([\w-]+)/
  );
  const vm = trimmed.match(/vimeo\.com\/(\d+)/);

  let embed = "";
  if (yt) {
    embed = `https://www.youtube.com/embed/${yt[1]}?autoplay=1&mute=1&loop=1&playlist=${yt[1]}&controls=0&showinfo=0`;
  } else if (vm) {
    embed = `https://player.vimeo.com/video/${vm[1]}?autoplay=1&muted=1&loop=1&background=1`;
  }

  if (!embed) return null;

  return (
    <iframe
      className="absolute inset-0 h-full w-full opacity-40"
      src={embed}
      frameBorder={0}
      allow="autoplay"
      title="Vídeo de fundo"
    />
  );
}

export default async function PublicBudgetPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const budget = await getBudgetBySlugWithSections(slug);

  if (!budget) notFound();

  if (budget.status !== "published") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--tatu-beige)] px-4 text-center">
        <p className="text-sm text-[var(--tatu-ink)]/70">
          Este orçamento ainda não foi publicado.
        </p>
      </div>
    );
  }

  const highlights = budget.highlights;
  const packages = budget.packages;
  const faq = budget.faq;
  const hasAbout = Boolean(budget.about_title || budget.about_text);
  const hasVideo = Boolean(budget.hero_bg_video_url.trim());

  // Bloco 0 é sempre o hero (sempre escuro/olive). Os próximos índices só
  // avançam para seções que de fato existem, pra alternância continuar
  // certa mesmo quando alguma seção está vazia.
  let blockIndex = 0;
  const heroTone = blockTone(blockIndex);
  const aboutTone = hasAbout ? blockTone((blockIndex += 1)) : null;
  const highlightsTone =
    highlights.length > 0 ? blockTone((blockIndex += 1)) : null;
  const packagesTone =
    packages.length > 0 ? blockTone((blockIndex += 1)) : null;
  const faqTone = faq.length > 0 ? blockTone((blockIndex += 1)) : null;
  const footerTone = blockTone(blockIndex + 1);

  return (
    <div className="min-h-screen">
      <section
        className={`relative overflow-hidden px-4 py-20 sm:px-8 ${heroTone.bg} ${heroTone.text}`}
      >
        <HeroBackground url={budget.hero_bg_video_url} />
        {hasVideo ? <div className="absolute inset-0 bg-black/50" /> : null}
        <div className="relative mx-auto max-w-3xl">
          <TatuLogo className="mb-10 block h-8 w-auto" />
          {budget.hero_eyebrow ? (
            <p className="mb-4 text-xs font-bold uppercase tracking-widest">
              {budget.hero_eyebrow}
            </p>
          ) : null}
          <h1
            style={{ fontFamily: "Bootzy, sans-serif" }}
            className="mb-6 text-4xl leading-tight sm:text-6xl"
          >
            {budget.hero_title1}
            <br />
            <span className="font-bold">{budget.hero_title2}</span>
          </h1>
          {budget.hero_subtitle ? (
            <p className={`mb-8 max-w-lg text-base ${heroTone.textMuted}`}>
              {budget.hero_subtitle}
            </p>
          ) : null}
          {packages.length > 0 ? (
            <a
              href="#pacotes"
              className="inline-block rounded-md bg-[var(--tatu-ink)] px-6 py-3 text-sm font-bold text-[var(--tatu-cream)]"
            >
              {budget.hero_cta || "Conhecer a proposta"}
            </a>
          ) : null}
        </div>
      </section>

      {hasAbout && aboutTone ? (
        <section className={`px-4 py-16 sm:px-8 ${aboutTone.bg} ${aboutTone.text}`}>
          <div className="mx-auto max-w-3xl">
            {budget.about_title ? (
              <h2 className="mb-4 text-2xl font-bold sm:text-3xl">
                {budget.about_title}
              </h2>
            ) : null}
            {budget.about_text ? (
              <p
                className={`max-w-xl whitespace-pre-wrap text-base leading-relaxed ${aboutTone.textMuted}`}
              >
                {budget.about_text}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {highlights.length > 0 && highlightsTone ? (
        <section
          className={`px-4 py-16 sm:px-8 ${highlightsTone.bg} ${highlightsTone.text}`}
        >
          <div className="mx-auto max-w-3xl">
            {budget.highlights_title ? (
              <h2 className="mb-10 text-2xl font-bold sm:text-3xl">
                {budget.highlights_title}
              </h2>
            ) : null}
            <div className="grid gap-8 sm:grid-cols-2">
              {highlights.map((item, index) => (
                <div key={item.id}>
                  <div className="mb-3 flex items-center gap-2">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-md border text-sm ${highlightsTone.iconBorder} ${highlightsTone.iconColor}`}
                    >
                      ✦
                    </div>
                    <span className={`text-xs ${highlightsTone.textMuted}`}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <p className="max-w-sm text-lg font-bold leading-snug">
                    {item.title}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {packages.length > 0 && packagesTone ? (
        <section
          id="pacotes"
          className={`px-4 py-16 sm:px-8 ${packagesTone.bg} ${packagesTone.text}`}
        >
          <h2 className="mb-10 text-center text-2xl font-bold sm:text-3xl">
            Três formatos. Uma decisão de posicionamento.
          </h2>
          <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-3">
            {packages.map((pkg) => {
              const isHighlighted = Boolean(pkg.tag);
              const features = pkg.features
                .split("\n")
                .map((f) => f.trim())
                .filter(Boolean);

              return (
                <div
                  key={pkg.id}
                  className={`relative flex flex-col rounded-2xl bg-[var(--tatu-cream)] p-7 text-[var(--tatu-ink)] ${
                    isHighlighted
                      ? "border-[1.5px] border-[var(--tatu-olive)]"
                      : "border border-[var(--tatu-taupe)]"
                  }`}
                >
                  {pkg.tag ? (
                    <div className="absolute -top-3 left-6 rounded-md bg-[var(--tatu-ink)] px-2.5 py-1 text-[11px] font-bold tracking-wide text-[var(--tatu-cream)]">
                      {pkg.tag}
                    </div>
                  ) : null}
                  <p className="mb-2 text-lg font-semibold">{pkg.name}</p>
                  <p className="mb-5 text-2xl font-bold">
                    {money(pkg.price)}
                    <span className="text-sm font-medium text-[var(--tatu-ink)]/60">
                      /mês
                    </span>
                  </p>
                  <ul className="mb-6 flex-1 space-y-2">
                    {features.map((feature, i) => (
                      <li
                        key={i}
                        className="border-t border-[var(--tatu-taupe)] pt-2 text-sm text-[var(--tatu-ink)]/75"
                      >
                        — {feature}
                      </li>
                    ))}
                  </ul>
                  <a
                    href={PACKAGE_WHATSAPP_URL}
                    target="_blank"
                    rel="noreferrer"
                    className={`block rounded-md py-2.5 text-center text-sm font-bold ${
                      isHighlighted
                        ? "bg-[var(--tatu-ink)] text-[var(--tatu-cream)]"
                        : "border border-[var(--tatu-ink)]/40 text-[var(--tatu-ink)] hover:bg-[var(--tatu-taupe)]/30"
                    }`}
                  >
                    Escolher {pkg.name}
                  </a>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {faq.length > 0 && faqTone ? (
        <section className={`px-4 py-16 sm:px-8 ${faqTone.bg} ${faqTone.text}`}>
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-8 text-center text-2xl font-bold sm:text-3xl">
              Perguntas frequentes
            </h2>
            <div>
              {faq.map((item) => (
                <details
                  key={item.id}
                  className={`border-b py-4 ${faqTone.divider}`}
                >
                  <summary className="cursor-pointer list-none text-sm font-semibold marker:hidden [&::-webkit-details-marker]:hidden">
                    {item.question}
                  </summary>
                  <p className={`mt-2 text-sm leading-relaxed ${faqTone.textMuted}`}>
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <footer
        className={`flex flex-wrap items-center justify-between gap-2 px-4 py-6 text-xs sm:px-8 ${footerTone.bg} ${footerTone.text}`}
      >
        <span className="font-medium">{budget.client_name}</span>
        <span className="font-medium">Proposta gerada por Tatú Estúdio Criativo</span>
      </footer>
    </div>
  );
}
