"use client";

import { useRef, useState, useTransition } from "react";
import { confirmar } from "@/components/ConfirmHost";
import {
  apagarFonteAction,
  atualizarFonteAction,
  coletarFonteAction,
  criarFonteAction,
} from "@/app/admin/repertorio/actions";
import { haQuanto, type Fonte } from "@/lib/repertorioTypes";

const CAMPO =
  "w-full rounded border border-neutral-300 bg-white px-2 py-2.5 text-base focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none sm:py-1.5 sm:text-[13px]";

const CELULA =
  "w-full rounded border border-transparent bg-transparent px-2 py-2 text-base hover:border-neutral-200 focus:border-neutral-900 focus:bg-white focus-visible:outline-none sm:py-1 sm:text-[13px]";

const BOTAO_PEQUENO =
  "min-h-10 rounded px-2 text-sm text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none disabled:opacity-50 sm:min-h-0 sm:py-1 sm:text-xs";

function NovaFonte() {
  const form = useRef<HTMLFormElement>(null);
  const [pendente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);

  return (
    <form
      ref={form}
      action={(formData) => {
        setAviso(null);
        iniciar(async () => {
          const resultado = await criarFonteAction(formData);
          if (!resultado.ok) {
            setAviso({ texto: resultado.error, erro: true });
            return;
          }
          form.current?.reset();
          const { novas, erro } = resultado.data;
          setAviso(
            erro
              ? { texto: `Fonte salva, mas a leitura falhou: ${erro}`, erro: true }
              : {
                  texto: `Fonte salva. ${
                    novas === 1 ? "Trouxe 1 notícia." : `Trouxe ${novas} notícias.`
                  }`,
                  erro: false,
                }
          );
        });
      }}
      className="mb-6 space-y-2 rounded-lg border border-neutral-200 p-3"
    >
      <h2 className="text-sm font-semibold text-neutral-900">Nova fonte</h2>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,0.9fr)]">
        <input id="fonte-nova-nome" name="nome" required placeholder="Nome (ex.: GKPB)" aria-label="Nome da fonte" className={CAMPO} />
        <input
          id="fonte-nova-feed"
          name="feed_url"
          type="url"
          required
          placeholder="Endereço do feed RSS (https://…/feed)"
          aria-label="Endereço do feed RSS"
          className={CAMPO}
        />
        <input
          id="fonte-nova-tema"
          name="tema"
          list="repertorio-temas"
          placeholder="Tema"
          aria-label="Tema"
          className={CAMPO}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pendente}
          className="min-h-11 rounded-md bg-neutral-900 px-3 text-sm font-medium text-white hover:bg-neutral-700 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-60 sm:min-h-0 sm:py-1.5"
        >
          {pendente ? "Salvando e lendo o feed…" : "Adicionar e buscar notícias"}
        </button>
        <p role="status" aria-live="polite" className={`text-xs ${aviso?.erro ? "text-amber-700" : "text-neutral-500"}`}>
          {aviso?.texto}
        </p>
      </div>
    </form>
  );
}

function LinhaFonte({ fonte }: { fonte: Fonte }) {
  const form = useRef<HTMLFormElement>(null);
  const [pendente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<{ texto: string; erro: boolean } | null>(null);

  const salvar = () => form.current?.requestSubmit();

  function rodar<T>(
    acao: () => Promise<{ ok: true; data: T } | { ok: false; error: string }>,
    sucesso: (data: T) => string
  ) {
    setAviso(null);
    iniciar(async () => {
      const resultado = await acao();
      setAviso(
        resultado.ok
          ? { texto: sucesso(resultado.data), erro: false }
          : { texto: resultado.error, erro: true }
      );
    });
  }

  return (
    <li className="py-3">
      {/* Salva ao sair do campo ou ao marcar: lista de fontes muda pouco e
          um botão de salvar por linha seria clique que ninguém lembra de dar. */}
      <form
        ref={form}
        action={(formData) => rodar(() => atualizarFonteAction(formData), () => "Salvo.")}
        className="grid gap-x-2 gap-y-1 sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,0.7fr)] sm:items-center"
      >
        <input type="hidden" name="id" value={fonte.id} />
        <label className="flex min-h-10 items-center gap-2 text-xs text-neutral-500 sm:min-h-0">
          <input
            id={`fonte-ativa-${fonte.id}`}
            type="checkbox"
            name="ativa"
            defaultChecked={fonte.ativa}
            onChange={salvar}
            className="size-4 accent-neutral-900"
          />
          <span className="sm:sr-only">Ativa</span>
        </label>
        <input
          id={`fonte-nome-${fonte.id}`}
          name="nome"
          defaultValue={fonte.nome}
          onBlur={(e) => e.currentTarget.value !== fonte.nome && salvar()}
          aria-label="Nome da fonte"
          className={`${CELULA} font-semibold ${fonte.ativa ? "" : "text-neutral-400"}`}
        />
        <input
          id={`fonte-tema-${fonte.id}`}
          name="tema"
          list="repertorio-temas"
          defaultValue={fonte.tema}
          onBlur={(e) => e.currentTarget.value !== fonte.tema && salvar()}
          aria-label="Tema"
          className={CELULA}
        />
      </form>

      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 pl-0 sm:pl-8">
        <a
          href={fonte.feed_url}
          target="_blank"
          rel="noreferrer"
          className="min-w-0 truncate text-xs text-neutral-400 hover:text-neutral-900 hover:underline"
        >
          {fonte.feed_url}
        </a>
        {/* "há X min" é calculado de novo no navegador: na virada do minuto
            pode diferir do servidor, e tudo bem. */}
        <span
          suppressHydrationWarning
          className={`text-xs ${fonte.ultimo_erro ? "text-amber-700" : "text-neutral-400"}`}
        >
          {fonte.ultimo_erro
            ? `Erro na última leitura: ${fonte.ultimo_erro}`
            : fonte.ultima_coleta_em
              ? `Lida ${haQuanto(fonte.ultima_coleta_em)}`
              : "Ainda não lida"}
        </span>
        <span className="ml-auto flex gap-1">
          <button
            type="button"
            disabled={pendente}
            onClick={() =>
              rodar(
                () => coletarFonteAction(fonte.id),
                (data) =>
                  data.novas === 1 ? "1 notícia nova." : `${data.novas} notícias novas.`
              )
            }
            className={BOTAO_PEQUENO}
          >
            {pendente ? "Lendo…" : "Buscar agora"}
          </button>
          <button
            type="button"
            disabled={pendente}
            onClick={async () => {
              const ok = await confirmar(
                `Apagar ${fonte.nome}? As notícias dela saem do Repertório, inclusive as guardadas.`,
                "Apagar"
              );
              if (ok) rodar(() => apagarFonteAction(fonte.id), () => "Apagada.");
            }}
            className={`${BOTAO_PEQUENO} hover:bg-red-50 hover:text-red-700`}
          >
            Apagar
          </button>
        </span>
      </div>

      {aviso ? (
        <p role="status" className={`mt-1 text-xs sm:pl-8 ${aviso.erro ? "text-red-700" : "text-neutral-500"}`}>
          {aviso.texto}
        </p>
      ) : null}
    </li>
  );
}

export function FontesManager({ fontes, temas }: { fontes: Fonte[]; temas: string[] }) {
  return (
    <>
      <datalist id="repertorio-temas">
        {temas.map((tema) => (
          <option key={tema} value={tema} />
        ))}
      </datalist>

      <NovaFonte />

      {fontes.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-500">
          Nenhuma fonte ainda. Cole acima o feed RSS de um portal que você acompanha.
        </p>
      ) : (
        <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 px-3">
          {fontes.map((fonte) => (
            <LinhaFonte key={fonte.id} fonte={fonte} />
          ))}
        </ul>
      )}
    </>
  );
}
