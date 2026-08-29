"use client";

import { Component, useSyncExternalStore, type ReactNode } from "react";
import { LetteringStudio } from "@/components/admin/LetteringStudio";
import { limparRascunho } from "@/lib/letteringStorage";

const semInscricao = () => () => {};

/**
 * Se o editor quebrar durante o desenho, recarregar traria o mesmo rascunho de
 * volta e quebraria de novo — a pessoa ficaria presa num laço, sem saída e sem
 * explicação. Esta barreira segura o erro e oferece o botão que corta o laço.
 */
class BarreiraDoEstudio extends Component<
  { children: ReactNode },
  { quebrou: boolean }
> {
  state = { quebrou: false };

  static getDerivedStateFromError() {
    return { quebrou: true };
  }

  render() {
    if (!this.state.quebrou) return this.props.children;

    return (
      <div className="mx-auto max-w-md space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
        <p className="text-sm font-medium text-neutral-900">
          O estúdio parou de responder.
        </p>
        <p className="text-sm text-neutral-600">
          Isso costuma vir de um rascunho que ficou inconsistente. Descartar o
          rascunho abre o editor limpo — a peça que estava aberta se perde, mas
          o editor volta a funcionar.
        </p>
        <button
          type="button"
          onClick={() => {
            limparRascunho();
            window.location.reload();
          }}
          className="w-full rounded-md bg-neutral-900 px-4 py-3 text-sm font-medium text-white"
        >
          Descartar rascunho e recomeçar
        </button>
      </div>
    );
  }
}

/**
 * O estúdio só existe no navegador: canvas, fontes carregadas na hora e
 * eventos de toque. Renderizar no servidor não adianta nada e ainda abre a
 * porta pra divergência de hidratação — que no celular aparecia como campos
 * respondendo e botão nenhum funcionando.
 *
 * O import é estático de propósito. Com `next/dynamic` o estúdio virava um
 * chunk à parte, e quando esse chunk não chegava a tela ficava presa no
 * "carregando" pra sempre, sem erro nenhum.
 */
export function LetteringStudioClient() {
  const noNavegador = useSyncExternalStore(
    semInscricao,
    () => true,
    () => false,
  );

  if (!noNavegador) {
    return <p className="p-4 text-sm text-neutral-500">Carregando o estúdio…</p>;
  }

  return (
    <BarreiraDoEstudio>
      <LetteringStudio />
    </BarreiraDoEstudio>
  );
}
