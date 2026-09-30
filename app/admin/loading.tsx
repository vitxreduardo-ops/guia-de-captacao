import { TatuLogo } from "@/components/TatuLogo";

/**
 * O painel consulta o banco antes de aparecer. No app instalado no iPhone,
 * sem isto a tela ficava vazia entre a abertura e o conteúdo.
 */
export default function AdminLoading() {
  return (
    <div className="flex flex-1 items-center justify-center py-24">
      <TatuLogo className="h-6 w-auto animate-pulse text-neutral-900 motion-reduce:animate-none" />
      <span className="sr-only">Carregando…</span>
    </div>
  );
}
