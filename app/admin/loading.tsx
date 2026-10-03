import { TatuLogo } from "@/components/TatuLogo";

/**
 * O painel consulta o banco antes de aparecer. No app instalado no iPhone,
 * sem isto a tela ficava vazia entre a abertura e o conteúdo.
 */
export default function AdminLoading() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 py-24">
      <TatuLogo className="h-6 w-auto text-neutral-900" />
      {/* O giro é o que diz "está vindo". Com menos movimento pedido nos
          ajustes, a regra global de globals.css corta toda animação e o
          círculo ficaria parado, parecendo travado — aqui ele só gira mais
          devagar. O `!` é pra vencer o `!important` daquela regra. */}
      <div
        aria-hidden="true"
        className="size-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900 motion-reduce:[animation-duration:2s]! motion-reduce:[animation-iteration-count:infinite]!"
      />
      <span className="sr-only">Carregando…</span>
    </div>
  );
}
