"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "motion/react";
import { ArrowLeft, Clapperboard, Plus } from "lucide-react";
import { createGuideAction, deleteGuideAction } from "@/app/admin/guias/actions";
import { DeleteButton } from "@/components/admin/DeleteButton";
import {
  formatMonthLabel,
  formatShootDate,
  SEM_CLIENTE,
  type PastaCliente,
} from "@/lib/guideFolders";
import type { Guide } from "@/lib/guides";

// Criticamente amortecida: abrir uma pasta não carrega impulso de gesto,
// então não tem por que quicar.
const MOLA = { type: "spring", bounce: 0, duration: 0.45 } as const;

function contagem(pasta: PastaCliente) {
  const guias = `${pasta.total} ${pasta.total === 1 ? "guia" : "guias"}`;
  return pasta.proxima ? `${guias} · próxima ${formatShootDate(pasta.proxima)}` : guias;
}

/**
 * Pastas de cliente da home de guias. Abrir uma pasta é um shape morph: o
 * cartão cresce e vira o painel no mesmo lugar (layoutId compartilhado).
 * Fechar é só um fade: o painel some e os cartões voltam, sem encolher de
 * volta (testado e reprovado — o painel grande espremido no cartão pesava).
 * A pasta aberta mora na URL (?pasta=), então o Voltar do navegador fecha.
 */
export function PastasClientes({
  pastas,
  abrirSozinha,
}: {
  pastas: PastaCliente[];
  /** Resultado com uma pasta só (filtro): já abre, sem precisar de clique. */
  abrirSozinha: boolean;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const naUrl = searchParams.get("pasta");
  // Estado local muda no mesmo quadro do clique; a URL vem atrás. Derivar só
  // da URL deixava a troca numa transição do router, e o Motion media o
  // "antes" tarde demais: o morph partia do tamanho final, não do cartão.
  const [pedida, setPedida] = useState(naUrl);
  // Cada fechamento troca a "geração" dos layoutIds dos cartões: o painel que
  // sai fica com o id antigo e o cartão que volta não herda a forma dele, então
  // não há morph de volta. O próximo abrir usa o id novo dos dois lados.
  const [geracao, setGeracao] = useState(0);
  const fechadaRef = useRef<string | null>(null);
  // Sempre o valor atual: o listener de popstate é registrado uma vez só e
  // leria a pasta do primeiro render.
  const pedidaRef = useRef(pedida);
  useEffect(() => {
    pedidaRef.current = pedida;
  });

  const mudar = useCallback((cliente: string | null) => {
    if (!cliente && pedidaRef.current) {
      fechadaRef.current = pedidaRef.current;
      setGeracao((g) => g + 1);
    }
    pedidaRef.current = cliente;
    setPedida(cliente);
  }, []);

  // Ao fechar, o foco volta pro cartão de onde a pasta saiu.
  useEffect(() => {
    if (pedida || !fechadaRef.current) return;
    document
      .querySelector<HTMLButtonElement>(`[data-cliente="${CSS.escape(fechadaRef.current)}"]`)
      ?.focus({ preventScroll: true });
    fechadaRef.current = null;
  }, [pedida]);

  // Voltar/Avançar do navegador mudam a URL por fora: acompanha. Só no
  // popstate — comparar com a URL a cada render desfazia a abertura no
  // quadro em que a URL ainda tinha o valor antigo.
  useEffect(() => {
    function onPop() {
      mudar(new URLSearchParams(window.location.search).get("pasta"));
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [mudar]);
  const aberta =
    pastas.find((p) => p.cliente === pedida) ?? (abrirSozinha ? pastas[0] : null);

  const urlTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (urlTimer.current) clearTimeout(urlTimer.current);
  }, []);

  function ir(cliente: string | null) {
    mudar(cliente);
    const q = new URLSearchParams(window.location.search);
    if (cliente) q.set("pasta", cliente);
    else q.delete("pasta");
    const qs = q.toString();
    const empurrar = () => {
      // Abrir e fechar antes de a URL mudar: não cria entrada repetida.
      if (window.location.search.replace(/^\?/, "") === qs) return;
      window.history.pushState(null, "", qs ? `${pathname}?${qs}` : pathname);
    };

    if (urlTimer.current) clearTimeout(urlTimer.current);
    // O pushState faz o router do Next re-renderizar a página, e isso corta
    // o morph no segundo quadro. Na abertura a URL espera a forma assentar;
    // no fechamento (só fade) vai na hora. Abrir e fechar rápido cancela.
    if (cliente) urlTimer.current = setTimeout(empurrar, 500);
    else empurrar();
  }

  // Esc fecha, como qualquer painel que cresceu por cima do conteúdo.
  useEffect(() => {
    if (!aberta) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") ir(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <MotionConfig reducedMotion="user" transition={MOLA}>
      {/* Celular: um seletor nativo em vez da lista de pastas. O picker do
          sistema já é o jeito que o polegar espera escolher uma opção. */}
      <label className="mb-3 block sm:hidden">
        <span className="mb-1 block text-xs font-medium text-neutral-600">Cliente</span>
        <select
          value={aberta?.cliente ?? ""}
          onChange={(e) => ir(e.target.value || null)}
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2.5 text-sm font-medium text-neutral-900 focus:border-neutral-500 focus:outline-none"
        >
          <option value="">Escolha um cliente ({pastas.length})</option>
          {pastas.map((p) => (
            <option key={p.cliente} value={p.cliente}>
              {p.cliente} — {contagem(p)}
            </option>
          ))}
        </select>
      </label>

      <LayoutGroup>
        {/* Painel e grade dividem a mesma célula (grid-area 1/1): na troca
            um fica por cima do outro e nenhum empurra o outro. Em fluxo, o
            painel saindo segurava a grade 1 quadro embaixo e ela subia. */}
        <div className="grid items-start [&>*]:[grid-area:1/1]">
        <AnimatePresence initial={false}>
          {aberta ? (
            <Painel key="painel" pasta={aberta} geracao={geracao} fechar={() => ir(null)} />
          ) : (
            <motion.nav
              key="grade"
              aria-label="Clientes"
              className="hidden gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.2 } }}
              exit={{ opacity: 0 }}
            >
              {pastas.map((pasta) => (
                <motion.button
                  key={pasta.cliente}
                  type="button"
                  layoutId={`pasta-${pasta.cliente}-${geracao}`}
                  data-cliente={pasta.cliente}
                  onClick={() => ir(pasta.cliente)}
                  // borderRadius no style pra o Motion corrigir a curva durante
                  // o morph; em classe ela esticaria junto com a escala.
                  style={{ borderRadius: 8 }}
                  className="flex items-center gap-3 border border-neutral-200 bg-white p-4 text-left transition-colors hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none active:bg-neutral-100"
                  whileTap={{ scale: 0.98 }}
                >
                  <motion.span layoutId={`icone-${pasta.cliente}-${geracao}`} className="shrink-0">
                    <Clapperboard className="size-5 text-neutral-400" aria-hidden />
                  </motion.span>
                  <span className="min-w-0 flex-1">
                    <motion.span
                      layoutId={`nome-${pasta.cliente}-${geracao}`}
                      className={`line-clamp-2 block font-medium leading-snug break-words ${
                        pasta.cliente === SEM_CLIENTE ? "text-neutral-500" : "text-neutral-900"
                      }`}
                    >
                      {pasta.cliente}
                    </motion.span>
                    <span className="block text-xs text-neutral-500">{contagem(pasta)}</span>
                  </span>
                </motion.button>
              ))}
            </motion.nav>
          )}
        </AnimatePresence>
        </div>
      </LayoutGroup>
    </MotionConfig>
  );
}

function Painel({
  pasta,
  geracao,
  fechar,
}: {
  pasta: PastaCliente;
  geracao: number;
  fechar: () => void;
}) {
  const voltarRef = useRef<HTMLButtonElement>(null);
  const semCliente = pasta.cliente === SEM_CLIENTE;

  // Foco vai pro painel que apareceu, senão o leitor de tela fica num cartão
  // que não existe mais.
  useEffect(() => {
    voltarRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <motion.section
      layoutId={`pasta-${pasta.cliente}-${geracao}`}
      aria-label={`Guias de ${pasta.cliente}`}
      style={{ borderRadius: 8 }}
      className="overflow-hidden border border-neutral-200 bg-white"
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
    >
      <div className="flex items-center gap-3 border-b border-neutral-200 p-4">
        <button
          ref={voltarRef}
          type="button"
          onClick={fechar}
          aria-label="Voltar para todos os clientes"
          className="hidden size-8 shrink-0 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none active:scale-95 sm:flex"
        >
          <ArrowLeft className="size-4" aria-hidden />
        </button>
        <motion.span layoutId={`icone-${pasta.cliente}-${geracao}`} className="shrink-0">
          <Clapperboard className="size-5 text-neutral-900" aria-hidden />
        </motion.span>
        <h2 className="min-w-0 flex-1">
          <motion.span
            layoutId={`nome-${pasta.cliente}-${geracao}`}
            className="block font-medium leading-snug text-neutral-900"
          >
            {pasta.cliente}
          </motion.span>
          <span className="block text-xs text-neutral-500">{contagem(pasta)}</span>
        </h2>
      </div>

      {/* O conteúdo entra depois que a forma já cresceu: durante o morph a
          caixa está em escala, e texto em escala se deforma. */}
      <motion.div
        className="space-y-4 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { delay: 0.15, duration: 0.2 } }}
        exit={{ opacity: 0, transition: { duration: 0.1 } }}
      >
        {pasta.meses.map((mes) => (
          <section key={mes.chave}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {mes.chave === "sem-data" ? "Sem data de gravação" : formatMonthLabel(mes.chave)}
            </h3>
            <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {mes.guias.map((guide) => (
                <GuideCard key={guide.id} guide={guide} />
              ))}
            </ul>
          </section>
        ))}

        {semCliente ? null : (
          <form action={createGuideAction} className="flex gap-2 pt-1">
            <input type="hidden" name="client_name" value={pasta.cliente} />
            <input
              name="title"
              required
              aria-label={`Título do novo guia de ${pasta.cliente}`}
              placeholder={`Novo guia de ${pasta.cliente} (ex: Campanha Dezembro)`}
              className="min-w-0 flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            />
            <button
              type="submit"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 active:scale-[0.97]"
            >
              <Plus className="size-4" aria-hidden />
              Novo guia
            </button>
          </form>
        )}
      </motion.div>
    </motion.section>
  );
}

function GuideCard({ guide }: { guide: Guide }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white p-4">
      <div className="min-w-0">
        <Link
          href={`/admin/guias/${guide.id}`}
          className="font-medium text-neutral-900 hover:underline"
        >
          {guide.title}
        </Link>
        <p className="mt-0.5 text-sm text-neutral-500">
          {guide.shoot_date ? `Gravação ${formatShootDate(guide.shoot_date)}` : "Sem data"} ·{" "}
          <span className={guide.status === "published" ? "text-emerald-600" : "text-amber-600"}>
            {guide.status === "published" ? "Publicado" : "Rascunho"}
          </span>
        </p>
        {guide.tags.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {guide.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <Link
          href={`/admin/guias/${guide.id}`}
          className="text-sm text-neutral-600 hover:text-neutral-900"
        >
          Editar
        </Link>
        <form action={deleteGuideAction}>
          <input type="hidden" name="id" value={guide.id} />
          <DeleteButton
            confirmMessage={`Excluir o guia "${guide.title}"? Essa ação não pode ser desfeita.`}
          />
        </form>
      </div>
    </li>
  );
}
