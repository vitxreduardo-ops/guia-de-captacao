"use client";

import { Bookmark, BookmarkCheck, Check } from "lucide-react";
import { useState, useTransition } from "react";
import { marcarNoticiaAction } from "@/app/admin/repertorio/actions";
import { horaDe, quandoDe, type Noticia } from "@/lib/repertorioTypes";

const BOTAO =
  "inline-flex min-h-10 items-center gap-1.5 rounded-md px-2 text-xs text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none sm:min-h-0 sm:py-1";

/**
 * Uma notícia na lista. Guardar e lida mudam na hora e vão pro banco por
 * trás; se o banco recusar, o estado volta e o erro aparece no próprio item.
 */
export function NoticiaItem({
  noticia,
  mostrarTema,
  acoes,
}: {
  noticia: Noticia;
  /** Na aba "Tudo" o tema ajuda a situar; dentro de um tema é repetição. */
  mostrarTema: boolean;
  /** Ações extras vindas de fora (o atalho pro gerador de roteiros). */
  acoes?: React.ReactNode;
}) {
  const [guardada, setGuardada] = useState(noticia.guardada);
  const [lida, setLida] = useState(noticia.lida);
  const [erro, setErro] = useState<string | null>(null);
  const [, iniciar] = useTransition();

  function mudar(campo: "guardada" | "lida", valor: boolean) {
    const definir = campo === "guardada" ? setGuardada : setLida;
    const anterior = campo === "guardada" ? guardada : lida;
    definir(valor);
    setErro(null);
    iniciar(async () => {
      const resultado = await marcarNoticiaAction(noticia.id, { [campo]: valor });
      if (!resultado.ok) {
        definir(anterior);
        setErro(resultado.error);
      }
    });
  }

  return (
    <article className="py-4">
      <p className="mb-1 flex flex-wrap items-center gap-x-1.5 text-xs text-neutral-500">
        <span className="font-medium text-neutral-700">{noticia.fonte.nome}</span>
        {mostrarTema ? <span>· {noticia.fonte.tema}</span> : null}
        <span>
          · <time dateTime={quandoDe(noticia)}>{horaDe(quandoDe(noticia))}</time>
        </span>
      </p>

      <h3 className="text-[17px] leading-snug font-semibold text-balance">
        <a
          href={noticia.url}
          target="_blank"
          rel="noreferrer"
          // Abrir a matéria é ler: marca sozinho, sem um clique a mais.
          onClick={() => {
            if (!lida) mudar("lida", true);
          }}
          className={`rounded-sm hover:underline focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none ${
            lida ? "text-neutral-500" : "text-neutral-900"
          }`}
        >
          {noticia.titulo}
        </a>
      </h3>

      {noticia.resumo ? (
        <p className="mt-1 line-clamp-3 max-w-[65ch] text-sm leading-relaxed text-neutral-600">
          {noticia.resumo}
        </p>
      ) : null}

      <div className="-ml-2 mt-1.5 flex flex-wrap items-center gap-0.5">
        <button
          type="button"
          aria-pressed={guardada}
          onClick={() => mudar("guardada", !guardada)}
          className={`${BOTAO} ${guardada ? "font-medium text-neutral-900" : ""}`}
        >
          {guardada ? (
            <BookmarkCheck className="size-4" aria-hidden />
          ) : (
            <Bookmark className="size-4" aria-hidden />
          )}
          {guardada ? "Guardada" : "Guardar"}
        </button>
        <button type="button" aria-pressed={lida} onClick={() => mudar("lida", !lida)} className={BOTAO}>
          <Check className="size-4" aria-hidden />
          {lida ? "Lida" : "Marcar como lida"}
        </button>
        {acoes}
      </div>

      {erro ? (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {erro}
        </p>
      ) : null}
    </article>
  );
}
