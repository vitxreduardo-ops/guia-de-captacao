"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Search, X } from "lucide-react";

/**
 * Topo da home de guias: o bloco "Novo guia" (children) e, ao lado, um bloco
 * quadrado com a lupa. A lupa abre busca e filtros de uma vez: o bloco cresce
 * pro lado e vira o campo, e os filtros aparecem logo abaixo. Com busca ou
 * filtro ativo, já carrega aberto.
 *
 * Anima a largura de verdade, não escala: o "Novo guia" estreita junto sem
 * esticar o texto. No celular os dois não cabem, então a busca aberta toma a
 * linha e o "Novo guia" volta quando ela fecha.
 *
 * É um GET normal (?q=&month=…): os filtros ficam fora deste <form> mas
 * apontam pra ele com form="busca-guias", então Enter na busca ou "Filtrar"
 * mandam tudo junto.
 */
export function BuscaGuias({
  busca,
  ativo,
  manter,
  filtros,
  children,
}: {
  busca: string;
  /** Algum filtro ou busca aplicado: abre de início e o X vira "limpar". */
  ativo: boolean;
  /** Parâmetros que não são filtro (a pasta aberta) pra não perder ao buscar. */
  manter: Record<string, string>;
  filtros: ReactNode;
  children: ReactNode;
}) {
  const [aberta, setAberta] = useState(ativo);
  const inputRef = useRef<HTMLInputElement>(null);
  const lupaRef = useRef<HTMLButtonElement>(null);
  const primeiroRender = useRef(true);

  useEffect(() => {
    // Na carga com filtro ativo não rouba o foco; só quando a pessoa abre.
    if (primeiroRender.current) {
      primeiroRender.current = false;
      return;
    }
    if (aberta) inputRef.current?.focus({ preventScroll: true });
    else lupaRef.current?.focus({ preventScroll: true });
  }, [aberta]);

  const limparHref = `/admin/guias${
    Object.keys(manter).length ? `?${new URLSearchParams(manter)}` : ""
  }`;

  return (
    <div
      className="mb-8"
      onKeyDown={(e) => {
        // Esc fecha quando não há nada aplicado (aplicado, fechar esconderia
        // o motivo de a lista estar filtrada).
        if (e.key === "Escape" && aberta && !ativo) setAberta(false);
      }}
    >
      <div className="flex gap-3">
        <div className={`min-w-0 flex-1 ${aberta ? "max-sm:hidden" : ""}`}>{children}</div>

        <form
          id="busca-guias"
          method="get"
          action="/admin/guias"
          role="search"
          onSubmit={(e) => {
            // A pasta aberta muda a URL sem passar pelo servidor, então o
            // valor que veio de lá pode estar velho: lê da URL de agora.
            const form = e.currentTarget;
            const pasta = new URLSearchParams(window.location.search).get("pasta");
            let campo = form.querySelector<HTMLInputElement>('input[name="pasta"]');
            if (!pasta) return campo?.remove();
            if (!campo) {
              campo = document.createElement("input");
              campo.type = "hidden";
              campo.name = "pasta";
              form.appendChild(campo);
            }
            campo.value = pasta;
          }}
          className={`flex shrink-0 items-center overflow-hidden rounded-lg border border-neutral-200 bg-white transition-[width] duration-300 ease-out motion-reduce:transition-none ${
            aberta ? "w-full sm:w-80" : "w-[4.4rem]"
          }`}
        >
          {Object.entries(manter).map(([nome, valor]) => (
            <input key={nome} type="hidden" name={nome} value={valor} />
          ))}

          {aberta ? (
            <div className="flex w-full min-w-0 items-center gap-2 p-4">
              <Search className="size-4 shrink-0 text-neutral-400" aria-hidden />
              <input
                ref={inputRef}
                type="search"
                name="q"
                defaultValue={busca}
                aria-label="Buscar guias"
                placeholder="Título, cliente, local ou tag"
                className="min-w-0 flex-1 bg-transparent py-2 text-sm focus:outline-none [&::-webkit-search-cancel-button]:hidden"
              />
              {ativo ? (
                // Aplicado: o X limpa busca e filtros (a pasta aberta fica).
                <a
                  href={limparHref}
                  aria-label="Limpar busca e filtros"
                  className="flex size-8 shrink-0 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
                >
                  <X className="size-4" aria-hidden />
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => setAberta(false)}
                  aria-label="Fechar busca e filtros"
                  className="flex size-8 shrink-0 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
                >
                  <X className="size-4" aria-hidden />
                </button>
              )}
            </div>
          ) : (
            <button
              ref={lupaRef}
              type="button"
              onClick={() => setAberta(true)}
              aria-label="Buscar e filtrar guias"
              aria-expanded={false}
              aria-controls="filtros-guias"
              // Mesma altura do bloco do Novo guia: p-4 + campo de 38px.
              className="flex h-[4.4rem] w-full items-center justify-center text-neutral-500 transition-transform hover:bg-neutral-50 hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none focus-visible:ring-inset active:scale-95"
            >
              <Search className="size-5" aria-hidden />
            </button>
          )}
        </form>
      </div>

      {/* Sempre montado, só recolhido: abre e fecha pelo mesmo caminho
          (altura + opacidade + 4px), em vez de entrar animado e sumir seco.
          E como não monta de novo, não anima ao carregar com filtro ativo.
          inert tira os campos recolhidos do Tab e do leitor de tela. */}
      <div
        id="filtros-guias"
        inert={!aberta}
        className={`grid transition-[grid-template-rows,opacity,translate] duration-200 ease-out motion-reduce:transition-none ${
          aberta ? "grid-rows-[1fr] opacity-100" : "-translate-y-1 grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="pt-3">{filtros}</div>
        </div>
      </div>
    </div>
  );
}
