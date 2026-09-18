import { TatuLogo } from "@/components/TatuLogo";
import { ScrollHint } from "@/components/ScrollHint";
import type { BlockTone, SectionData } from "@/lib/budgetSections";

/**
 * A mídia de fundo da capa: imagem, vídeo de arquivo, YouTube ou Vimeo.
 *
 * O desfoque come as bordas — um blur de 20px deixa 20px translúcidos em volta
 * — então a mídia cresce o bastante para o borrado morrer fora da tela.
 */
function HeroBackground({ url, blur }: { url: string; blur: number }) {
  const trimmed = url.trim();
  if (!trimmed) return null;

  const desfoque = blur > 0
    ? { filter: `blur(${blur}px)`, transform: `scale(${1 + blur / 100})` }
    : undefined;

  if (/\.(mp4|webm|mov|m4v)($|\?)/i.test(trimmed)) {
    return (
      <video
        className="absolute inset-0 h-full w-full object-cover opacity-40"
        style={desfoque}
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

  if (!embed) {
    // Sobrou imagem. Detectar imagem por extensão não serve: as URLs que mais
    // chegam aqui vêm de CDN e de storage, sem extensão nenhuma. Então o que é
    // vídeo a gente reconhece, e todo o resto é foto.
    return (
      // <img> cru: a URL pode ser de qualquer domínio colado no editor, e a
      // otimização do Next exige domínio declarado na config.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={trimmed}
        alt=""
        aria-hidden
        style={desfoque}
        className="absolute inset-0 h-full w-full object-cover opacity-40"
      />
    );
  }

  return (
    <iframe
      className="absolute inset-0 h-full w-full opacity-40"
      style={desfoque}
      src={embed}
      frameBorder={0}
      allow="autoplay"
      title="Vídeo de fundo"
    />
  );
}

/**
 * A capa: logo no topo, nome do cliente em corpo grande e o botão que desce
 * para os valores. Ocupa a altura toda da tela e não leva número — é o bloco
 * que abre a proposta.
 */
export function CoverSection({
  data,
  tone,
  hasPricing,
}: {
  data: SectionData["cover"];
  tone: BlockTone;
  /** Sem seção de valores visível o botão não teria para onde levar. */
  hasPricing: boolean;
}) {
  // A capa não confia que quem chama normalizou: um campo faltando não pode
  // derrubar a proposta inteira do cliente.
  const midia = (data.mediaUrl ?? "").trim();

  return (
    <section
      // A altura vem de --budget-vh para a capa caber no espaço que tem: na
      // página é a janela, e dentro do preview do editor é a altura do painel.
      className={`relative flex min-h-[var(--budget-vh,100svh)] flex-col overflow-hidden px-4 py-8 sm:px-8 sm:py-10 ${tone.bg} ${tone.text}`}
    >
      <HeroBackground url={midia} blur={data.blur ?? 0} />
      {midia ? <div className="absolute inset-0 bg-black/50" /> : null}

      <div className="relative mx-auto w-full max-w-5xl">
        <TatuLogo className="h-8 w-auto" />
      </div>

      <div className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center">
        {data.eyebrow ? (
          <p
            className={`mb-6 inline-flex w-fit border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.2em] ${
              tone.isDark
                ? "border-[var(--tatu-cream)]/30"
                : "border-[var(--tatu-ink)]/25"
            }`}
          >
            {data.eyebrow}
          </p>
        ) : null}

        <h1
          style={{ fontFamily: "Bootzy, sans-serif" }}
          className="mb-6 text-5xl leading-[0.95] tracking-wide sm:text-8xl"
        >
          {data.title}
        </h1>

        {data.subtitle ? (
          <p className={`mb-10 max-w-lg text-base leading-relaxed ${tone.textMuted}`}>
            {data.subtitle}
          </p>
        ) : null}

        {hasPricing && data.cta ? (
          <a
            href="#pacotes"
            className="inline-block w-fit bg-[var(--tatu-ink)] px-7 py-3.5 text-sm font-bold uppercase tracking-widest text-[var(--tatu-cream)]"
          >
            {data.cta} ↓
          </a>
        ) : null}
      </div>

      <ScrollHint className={tone.text} />
    </section>
  );
}
