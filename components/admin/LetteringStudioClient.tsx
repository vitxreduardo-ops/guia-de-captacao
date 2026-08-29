"use client";

import dynamic from "next/dynamic";

/**
 * O estúdio só existe no navegador: canvas, fontes carregadas na hora e
 * eventos de toque. Renderizar no servidor não adianta nada e ainda abre a
 * porta pra divergência de hidratação — que no celular aparecia como campos
 * respondendo e botão nenhum funcionando.
 */
export const LetteringStudioClient = dynamic(
  () => import("@/components/admin/LetteringStudio").then((m) => m.LetteringStudio),
  {
    ssr: false,
    loading: () => (
      <p className="p-4 text-sm text-neutral-500">Carregando o estúdio…</p>
    ),
  },
);
