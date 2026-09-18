import { Reveal } from "@/components/Reveal";
import type { BlockTone, SectionData } from "@/lib/budgetSections";

/** Só os canais preenchidos viram link — um rodapé com campo vazio fica com
 *  buraco, e a proposta termina mal. */
function contacts(data: SectionData["footer"]) {
  const list: { label: string; href: string }[] = [];
  if (data.instagram) list.push({ label: "Instagram", href: data.instagram });
  if (data.youtube) list.push({ label: "YouTube", href: data.youtube });
  if (data.email) list.push({ label: data.email, href: `mailto:${data.email}` });
  if (data.phone) {
    list.push({
      label: data.phone,
      href: `https://wa.me/${data.phone.replace(/\D/g, "")}`,
    });
  }
  return list;
}

/**
 * O fecho da proposta: a frase que resume o estúdio e por onde falar com ele.
 * Não leva número — é o bloco que encerra a página.
 */
export function FooterSection({
  data,
  tone,
  clientName,
}: {
  data: SectionData["footer"];
  tone: BlockTone;
  clientName: string;
}) {
  const links = contacts(data);

  return (
    <footer className={`px-4 py-20 sm:px-8 sm:py-24 ${tone.bg} ${tone.text}`}>
      <div className="mx-auto w-full max-w-5xl">
        <div
          className={`flex flex-wrap items-center justify-between gap-2 border-b pb-6 text-xs font-medium uppercase tracking-[0.2em] ${tone.divider} ${tone.textMuted}`}
        >
          <span>Fim da proposta</span>
          {clientName ? <span>{clientName}</span> : null}
        </div>

        {data.phrase ? (
          <Reveal>
            <p
              style={{ fontFamily: "Bootzy, sans-serif" }}
              className="mt-12 max-w-3xl text-3xl leading-[1.1] tracking-wide sm:text-5xl"
            >
              {data.phrase}
            </p>
          </Reveal>
        ) : null}

        {links.length > 0 ? (
          <Reveal>
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-bold underline underline-offset-4"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </Reveal>
        ) : null}

        <p className={`mt-14 text-xs ${tone.textMuted}`}>
          Proposta gerada por Tatú Estúdio Criativo
        </p>
      </div>
    </footer>
  );
}
