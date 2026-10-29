import { RevealStagger, RevealItem } from "@/components/Reveal"
import { CONFIG, type MakingOfItem } from "./config"
import { BLOCK, Head, Media } from "./parts"

const SOON: MakingOfItem[] = [{}, {}, {}]

export function MakingOf() {
  const has = CONFIG.makingOf.length > 0
  const list = has ? CONFIG.makingOf : SOON

  return (
    <section id="making" className={BLOCK}>
      <Head left="Making Of" right="Por trás das câmeras" />
      <RevealStagger className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,320px),1fr))] gap-x-6 gap-y-10 pt-9">
        {list.map((k, i) => {
          const card = (
            <>
              <Media image={k.image} video={k.video} alt={k.title} soon={!has} ratio="aspect-video">
                <span
                  aria-hidden="true"
                  className="absolute bottom-4 left-4 grid h-11 w-11 place-items-center rounded-full bg-bg pl-[3px] text-[0.8rem] text-fg"
                >
                  ▶
                </span>
              </Media>
              <h3 className="mt-3.5 text-[1.2rem] font-semibold tracking-[-0.015em] transition-opacity group-hover:opacity-[.55]">
                {k.title || "Making of em breve"}
              </h3>
            </>
          )
          return (
            <RevealItem key={i} className="min-w-0">
              {k.url ? (
                <a href={k.url} target="_blank" rel="noopener noreferrer" className="group block min-w-0">
                  {card}
                </a>
              ) : (
                <div className="group block min-w-0">{card}</div>
              )}
            </RevealItem>
          )
        })}
      </RevealStagger>
    </section>
  )
}
