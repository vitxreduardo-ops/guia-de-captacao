"use client";

import { Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import { gerarDestaquesAction } from "@/app/admin/repertorio/actions";
import type { DestaquesDaSemana, NoticiaCitada } from "@/lib/repertorioIa";
import { haQuanto } from "@/lib/repertorioTypes";

const ROTULO = "text-[11px] font-semibold tracking-wide text-neutral-400 uppercase";

function Citadas({ noticias }: { noticias: NoticiaCitada[] }) {
  return (
    <ul className="mt-1.5 space-y-0.5">
      {noticias.map((n) => (
        <li key={n.id} className="text-xs text-neutral-500">
          <span className="font-medium text-neutral-600">{n.fonte}</span> ·{" "}
          <a
            href={n.url}
            target="_blank"
            rel="noreferrer"
            className="underline-offset-2 hover:text-neutral-900 hover:underline"
          >
            {n.titulo}
          </a>
        </li>
      ))}
    </ul>
  );
}

function semanaRotulo(semana: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "numeric", month: "short" }).format(
    new Date(`${semana}T12:00:00Z`)
  );
}

/**
 * Resumo da semana de um tema. Só é gerado quando alguém pede: cada geração
 * é uma chamada de IA, e tema que ninguém abriu não precisa de resumo.
 */
export function Destaques({
  tema,
  inicial,
  semanaAtual,
}: {
  tema: string;
  inicial: DestaquesDaSemana | null;
  semanaAtual: string;
}) {
  const [destaques, setDestaques] = useState(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const atual = destaques?.semana === semanaAtual;

  function gerar() {
    setErro(null);
    iniciar(async () => {
      const resultado = await gerarDestaquesAction(tema);
      if (resultado.ok) setDestaques(resultado.data);
      else setErro(resultado.error);
    });
  }

  return (
    <section aria-labelledby="destaques-titulo" className="mb-6 rounded-lg border border-neutral-200 bg-neutral-50/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 id="destaques-titulo" className="text-sm font-semibold text-neutral-900">
            Destaques da semana · {tema}
          </h2>
          {/* "gerado há X" é recalculado no navegador; na virada do minuto pode diferir. */}
          <p suppressHydrationWarning className="text-xs text-neutral-500">
            {destaques
              ? `${atual ? "Últimos 7 dias" : `Semana de ${semanaRotulo(destaques.semana)}`} · ${
                  destaques.totalNoticias
                } notícias lidas · gerado ${haQuanto(destaques.geradoEm)}`
              : `O que foi pauta em ${tema} nos últimos 7 dias, resumido por IA a partir das notícias daqui.`}
          </p>
        </div>
        <button
          type="button"
          onClick={gerar}
          disabled={pendente}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-md bg-neutral-900 px-3 text-sm font-medium text-white hover:bg-neutral-700 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60 sm:min-h-0 sm:py-1.5"
        >
          <Sparkles className="size-4" aria-hidden />
          {pendente ? "Lendo as notícias…" : destaques && atual ? "Gerar de novo" : "Gerar destaques"}
        </button>
      </div>

      {erro ? (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {erro}
        </p>
      ) : null}

      {destaques ? (
        <div className={`mt-3 space-y-4 ${pendente ? "opacity-50" : ""}`}>
          {destaques.panorama ? (
            <p className="max-w-[65ch] text-[15px] leading-relaxed text-neutral-800">{destaques.panorama}</p>
          ) : null}

          <ol className="space-y-4">
            {destaques.destaques.map((d, i) => (
              <li key={`${d.titulo}-${i}`} className="border-t border-neutral-200 pt-3">
                <h3 className="text-[15px] font-semibold text-balance text-neutral-900">{d.titulo}</h3>
                <dl className="mt-1 max-w-[65ch] space-y-1.5 text-sm leading-relaxed">
                  <div>
                    <dt className={ROTULO}>Fato · das notícias</dt>
                    <dd className="text-neutral-700">{d.fato}</dd>
                  </div>
                  {d.leitura ? (
                    <div>
                      <dt className={ROTULO}>Leitura · interpretação da IA</dt>
                      <dd className="text-neutral-600 italic">{d.leitura}</dd>
                    </div>
                  ) : null}
                </dl>
                <Citadas noticias={d.noticias} />
              </li>
            ))}
          </ol>

          {destaques.tendencias.length > 0 ? (
            <div className="border-t border-neutral-200 pt-3">
              <h3 className="text-sm font-semibold text-neutral-900">Tendências</h3>
              <ul className="mt-1 space-y-3">
                {destaques.tendencias.map((t, i) => (
                  <li key={`${t.nome}-${i}`} className="max-w-[65ch] text-sm leading-relaxed">
                    <p className="font-medium text-neutral-800">{t.nome}</p>
                    <p className="text-neutral-600 italic">{t.explicacao}</p>
                    <Citadas noticias={t.noticias} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="text-xs text-neutral-400">
            Feito a partir do título e do resumo de cada notícia, não da matéria inteira. Abra a matéria
            antes de usar um dado como fato.
          </p>
        </div>
      ) : null}
    </section>
  );
}
