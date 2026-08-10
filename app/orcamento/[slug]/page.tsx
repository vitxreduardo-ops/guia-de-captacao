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
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 text-center">
        <p className="text-sm text-neutral-500">
          Este orçamento ainda não foi publicado.
        </p>
      </div>
    );
  }

  const highlights = budget.highlights;
  const packages = budget.packages;
  const faq = budget.faq;
  const hasAbout = Boolean(budget.about_title || budget.about_text);

  return (
    <div className="min-h-screen bg-white">
      <section className="relative overflow-hidden border-b border-neutral-200 bg-neutral-50 px-4 py-20 sm:px-8">
        <HeroBackground url={budget.hero_bg_video_url} />
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-white/70 to-white" />
        <div className="relative mx-auto max-w-3xl">
          <TatuLogo className="mb-10 block h-8 w-auto text-black" />
          {budget.hero_eyebrow ? (
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-neutral-500">
              {budget.hero_eyebrow}
            </p>
          ) : null}
          <h1
            style={{ fontFamily: "Bootzy, sans-serif" }}
            className="mb-6 text-4xl leading-tight text-neutral-900 sm:text-6xl"
          >
            {budget.hero_title1}
            <br />
            <span className="font-bold">{budget.hero_title2}</span>
          </h1>
          {budget.hero_subtitle ? (
            <p className="mb-8 max-w-lg text-base text-neutral-600">
              {budget.hero_subtitle}
            </p>
          ) : null}
          {packages.length > 0 ? (
            <a
              href="#pacotes"
              className="inline-block rounded-md bg-neutral-900 px-6 py-3 text-sm font-semibold text-white hover:bg-neutral-800"
            >
              {budget.hero_cta || "Conhecer a proposta"}
            </a>
          ) : null}
        </div>
      </section>

      {hasAbout ? (
        <section className="mx-auto max-w-3xl px-4 py-16 sm:px-8">
          {budget.about_title ? (
            <h2 className="mb-4 text-2xl font-semibold text-neutral-900 sm:text-3xl">
              {budget.about_title}
            </h2>
          ) : null}
          {budget.about_text ? (
            <p className="max-w-xl whitespace-pre-wrap text-base leading-relaxed text-neutral-600">
              {budget.about_text}
            </p>
          ) : null}
        </section>
      ) : null}

      {highlights.length > 0 ? (
        <section className="border-y border-neutral-200 bg-neutral-50 px-4 py-16 sm:px-8">
          <div className="mx-auto max-w-3xl">
            {budget.highlights_title ? (
              <h2 className="mb-10 text-2xl font-semibold text-neutral-900 sm:text-3xl">
                {budget.highlights_title}
              </h2>
            ) : null}
            <div className="grid gap-8 sm:grid-cols-2">
              {highlights.map((item, index) => (
                <div key={item.id}>
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-300 text-sm">
                      ✦
                    </div>
                    <span className="text-xs text-neutral-400">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <p className="max-w-sm text-lg font-semibold leading-snug text-neutral-900">
                    {item.title}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {packages.length > 0 ? (
        <section id="pacotes" className="px-4 py-16 sm:px-8">
          <h2 className="mb-10 text-center text-2xl font-semibold text-neutral-900 sm:text-3xl">
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
                  className={`relative flex flex-col rounded-2xl border p-7 ${
                    isHighlighted
                      ? "border-neutral-900"
                      : "border-neutral-200"
                  }`}
                >
                  {pkg.tag ? (
                    <div className="absolute -top-3 left-6 rounded-md bg-neutral-900 px-2.5 py-1 text-[11px] font-bold tracking-wide text-white">
                      {pkg.tag}
                    </div>
                  ) : null}
                  <p className="mb-2 text-lg font-semibold text-neutral-900">
                    {pkg.name}
                  </p>
                  <p className="mb-5 text-2xl font-bold text-neutral-900">
                    {money(pkg.price)}
                    <span className="text-sm font-medium text-neutral-500">
                      /mês
                    </span>
                  </p>
                  <ul className="mb-6 flex-1 space-y-2">
                    {features.map((feature, i) => (
                      <li
                        key={i}
                        className="border-t border-neutral-200 pt-2 text-sm text-neutral-600"
                      >
                        — {feature}
                      </li>
                    ))}
                  </ul>
                  <a
                    href={PACKAGE_WHATSAPP_URL}
                    target="_blank"
                    rel="noreferrer"
                    className={`block rounded-md py-2.5 text-center text-sm font-semibold ${
                      isHighlighted
                        ? "bg-neutral-900 text-white hover:bg-neutral-800"
                        : "border border-neutral-300 text-neutral-900 hover:bg-neutral-50"
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

      {faq.length > 0 ? (
        <section className="mx-auto max-w-3xl px-4 py-16 sm:px-8">
          <h2 className="mb-8 text-center text-2xl font-semibold text-neutral-900 sm:text-3xl">
            Perguntas frequentes
          </h2>
          <div className="divide-y divide-neutral-200">
            {faq.map((item) => (
              <details key={item.id} className="group py-4">
                <summary className="cursor-pointer list-none text-sm font-semibold text-neutral-900 marker:hidden [&::-webkit-details-marker]:hidden">
                  {item.question}
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </section>
      ) : null}

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-200 px-4 py-6 text-xs text-neutral-500 sm:px-8">
        <span>{budget.client_name}</span>
        <span>Proposta gerada por Tatú Estúdio Criativo</span>
      </footer>
    </div>
  );
}
