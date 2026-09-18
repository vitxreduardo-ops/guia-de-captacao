import { RevealStagger, RevealItem } from "@/components/Reveal";
import { LightboxImage, type GalleryItem } from "@/components/LightboxImage";
import { SectionBlock, SectionHeading } from "@/components/budget/SectionShell";
import type { BlockTone, SectionData } from "@/lib/budgetSections";

/**
 * Os trabalhos já entregues. Cada projeto é uma imagem ou um vídeo, na
 * orientação que o material pede; as imagens abrem em lightbox e navegam entre
 * si, os vídeos tocam mudos em loop, como um portfólio de parede.
 */
export function PortfolioSection({
  data,
  tone,
  number,
}: {
  data: SectionData["portfolio"];
  tone: BlockTone;
  number: string;
}) {
  const images = data.projects.filter((p) => p.mediaType === "image");
  const gallery: GalleryItem[] = images.map((p, index) => ({
    id: `${p.url}-${index}`,
    src: p.url,
    alt: p.name || "Projeto",
    sourceUrl: null,
  }));

  return (
    <SectionBlock tone={tone}>
      <SectionHeading
        number={number}
        eyebrow={data.eyebrow}
        title={data.title}
        subtitle={data.subtitle}
        tone={tone}
        className="mb-12"
      />
      <RevealStagger className="grid gap-5 sm:grid-cols-3">
        {data.projects.map((project, index) => {
          const ratio =
            project.orientation === "vertical" ? "aspect-[9/16]" : "aspect-video";
          const imageIndex = images.indexOf(project);

          return (
            <RevealItem key={`${project.url}-${index}`}>
              <div
                className={`relative overflow-hidden border ${ratio} ${
                  tone.isDark
                    ? "border-[var(--tatu-cream)]/20"
                    : "border-[var(--tatu-ink)]/15"
                }`}
              >
                {project.mediaType === "video" ? (
                  <video
                    className="h-full w-full object-cover"
                    src={project.url}
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                ) : (
                  <LightboxImage
                    id={`${project.url}-${index}`}
                    src={project.url}
                    alt={project.name || "Projeto"}
                    sourceUrl={null}
                    className="h-full w-full object-cover"
                    gallery={gallery}
                    index={imageIndex}
                  />
                )}
              </div>
              <div className="mt-3 flex items-baseline justify-between gap-3">
                <p className="flex items-baseline gap-2 text-sm font-bold">
                  <span className={`text-xs tabular-nums ${tone.textMuted}`}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {project.name || "Sem título"}
                </p>
                {project.tag ? (
                  <span className={`text-xs ${tone.textMuted}`}>{project.tag}</span>
                ) : null}
              </div>
            </RevealItem>
          );
        })}
      </RevealStagger>
    </SectionBlock>
  );
}
