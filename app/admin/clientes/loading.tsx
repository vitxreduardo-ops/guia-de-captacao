/**
 * As quatro telas são `force-dynamic` e consultam o Supabase a cada visita.
 * Sem isto, trocar de aba no celular não dá sinal nenhum de que algo está
 * acontecendo até a página inteira aparecer.
 */
export default function ClientesLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl pb-10 pt-4 lg:pt-2">
      <div className="h-8 w-40 animate-pulse rounded bg-neutral-200" />
      <div className="mt-6 h-11 w-full max-w-md animate-pulse rounded-lg bg-neutral-100" />
      <div className="mt-6 h-40 w-full animate-pulse rounded-lg bg-neutral-100" />
      <span className="sr-only">Carregando…</span>
    </div>
  );
}
