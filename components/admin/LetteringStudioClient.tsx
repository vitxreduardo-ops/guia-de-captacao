"use client";

import { useSyncExternalStore } from "react";
import { LetteringStudio } from "@/components/admin/LetteringStudio";

const semInscricao = () => () => {};

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

  return <LetteringStudio />;
}
