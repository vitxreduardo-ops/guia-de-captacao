"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "motion/react";
import { ArrowLeft, Cloud, HardDrive, TriangleAlert } from "lucide-react";

// Mesma mola das pastas de cliente do Guia de Captação: abrir não carrega
// impulso de gesto, então não quica.
const MOLA = { type: "spring", bounce: 0, duration: 0.45 } as const;

export interface EspacoCard {
  id: string;
  nome: string;
  tipo: "disco" | "nuvem";
  cor: string;
  papel: string;
  etiqueta: string;
  pct: number;
  cheio: boolean;
  uso: string;
  livre: string;
  lido: string;
  /** O que aparece quando o espaço abre: materiais, subpastas, sincronizar. Vem pronto do servidor. */
  conteudo: ReactNode;
}

function Icone({ tipo, cor, grande }: { tipo: EspacoCard["tipo"]; cor: string; grande?: boolean }) {
  const I = tipo === "disco" ? HardDrive : Cloud;
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-xl ${grande ? "size-12" : "size-11"}`}
      style={{ backgroundColor: `${cor}1a`, color: cor }}
    >
      <I aria-hidden="true" className="size-5" />
    </span>
  );
}

function Barra({ pct, cheio, nome }: { pct: number; cheio: boolean; nome: string }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.min(pct, 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${nome} ${pct}% cheio`}
      className="h-2 w-full overflow-hidden rounded-full bg-neutral-100"
    >
      <div
        className={`h-full rounded-full ${cheio ? "bg-red-500" : "bg-neutral-800"}`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

/**
 * Espaços em grade de ícones, como as pastas de cliente do Guia de Captação:
 * tocar num cartão faz ele crescer e virar o painel no mesmo lugar. O espaço
 * aberto mora na URL (?espaco=), então o Voltar do navegador fecha, e Esc também.
 */
export function EspacosGrade({ espacos }: { espacos: EspacoCard[] }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [pedida, setPedida] = useState<string | null>(searchParams.get("espaco"));
  // Cada fechamento troca a "geração" dos layoutIds: sem morph de volta.
  const [geracao, setGeracao] = useState(0);
  const fechadaRef = useRef<string | null>(null);
  const pedidaRef = useRef(pedida);
  useEffect(() => {
    pedidaRef.current = pedida;
  });

  const mudar = useCallback((id: string | null) => {
    if (!id && pedidaRef.current) {
      fechadaRef.current = pedidaRef.current;
      setGeracao((g) => g + 1);
    }
    pedidaRef.current = id;
    setPedida(id);
  }, []);

  // Ao fechar, o foco volta pro cartão de onde o painel saiu.
  useEffect(() => {
    if (pedida || !fechadaRef.current) return;
    document
      .querySelector<HTMLButtonElement>(`[data-espaco="${CSS.escape(fechadaRef.current)}"]`)
      ?.focus({ preventScroll: true });
    fechadaRef.current = null;
  }, [pedida]);

  useEffect(() => {
    function onPop() {
      mudar(new URLSearchParams(window.location.search).get("espaco"));
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [mudar]);

  const aberto = espacos.find((e) => e.id === pedida) ?? null;

  function ir(id: string | null) {
    mudar(id);
    const q = new URLSearchParams(window.location.search);
    if (id) q.set("espaco", id);
    else q.delete("espaco");
    const qs = q.toString();
    if (window.location.search.replace(/^\?/, "") === qs) return;
    // pushState do navegador, não o do Next: o do Next re-renderiza a página
    // e cortava o morph (mesma razão das pastas do Guia de Captação).
    History.prototype.pushState.call(
      window.history,
      window.history.state,
      "",
      qs ? `${pathname}?${qs}` : pathname
    );
  }

  useEffect(() => {
    if (!aberto) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") ir(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <MotionConfig reducedMotion="user" transition={MOLA}>
      <LayoutGroup>
        {/* Painel e grade dividem a mesma célula: um fica por cima do outro e nenhum empurra o outro. */}
        <div className="grid items-start [&>*]:[grid-area:1/1]">
          <AnimatePresence initial={false}>
            {aberto ? (
              <Painel key="painel" espaco={aberto} geracao={geracao} fechar={() => ir(null)} />
            ) : (
              <motion.nav
                key="grade"
                aria-label="Espaços de armazenamento"
                className="grid grid-cols-2 gap-3 lg:grid-cols-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.2 } }}
                exit={{ opacity: 0 }}
              >
                {espacos.map((e) => (
                  <motion.button
                    key={e.id}
                    type="button"
                    layoutId={`espaco-${e.id}-${geracao}`}
                    data-espaco={e.id}
                    onClick={() => ir(e.id)}
                    style={{ borderRadius: 16 }}
                    className="flex min-w-0 flex-col items-start gap-3 border border-neutral-200 bg-white p-4 text-left shadow-[0_1px_2px_rgba(30,28,24,0.04)] transition-colors hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none active:bg-neutral-100"
                    whileTap={{ scale: 0.98 }}
                  >
                    <motion.span layoutId={`icone-${e.id}-${geracao}`}>
                      <Icone tipo={e.tipo} cor={e.cor} grande />
                    </motion.span>
                    <span className="block w-full min-w-0">
                      <motion.span
                        layoutId={`nome-${e.id}-${geracao}`}
                        className="line-clamp-2 block font-semibold leading-snug break-words text-neutral-900"
                      >
                        {e.nome}
                      </motion.span>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${e.etiqueta}`}>{e.papel}</span>
                        {e.cheio ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                            <TriangleAlert aria-hidden="true" className="size-3" /> Quase cheio
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <span className="block w-full">
                      <Barra pct={e.pct} cheio={e.cheio} nome={e.nome} />
                      <span className="mt-2 block text-sm font-medium text-neutral-900 tabular-nums">{e.uso}</span>
                      <span className="block text-xs text-neutral-500 tabular-nums">{e.livre}</span>
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

function Painel({ espaco, geracao, fechar }: { espaco: EspacoCard; geracao: number; fechar: () => void }) {
  const voltarRef = useRef<HTMLButtonElement>(null);

  // O foco vai pro painel que apareceu, senão o leitor de tela fica num cartão que sumiu.
  useEffect(() => {
    voltarRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <motion.section
      layoutId={`espaco-${espaco.id}-${geracao}`}
      aria-label={`Espaço ${espaco.nome}`}
      style={{ borderRadius: 16 }}
      className="overflow-hidden border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(30,28,24,0.04)]"
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-3 border-b border-neutral-200 p-4">
        <button
          ref={voltarRef}
          type="button"
          onClick={fechar}
          aria-label="Voltar para todos os espaços"
          className="flex size-9 shrink-0 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none active:scale-95 pointer-coarse:size-11"
        >
          <ArrowLeft className="size-4" aria-hidden />
        </button>
        <motion.span layoutId={`icone-${espaco.id}-${geracao}`}>
          <Icone tipo={espaco.tipo} cor={espaco.cor} />
        </motion.span>
        <h2 className="min-w-0 flex-1 basis-40">
          <motion.span
            layoutId={`nome-${espaco.id}-${geracao}`}
            className="block font-semibold leading-snug text-neutral-900"
          >
            {espaco.nome}
          </motion.span>
          <span className="block text-sm text-neutral-500">{espaco.lido}</span>
        </h2>
        <div className="w-full sm:w-56">
          <Barra pct={espaco.pct} cheio={espaco.cheio} nome={espaco.nome} />
          <p className="mt-1 text-sm text-neutral-600 tabular-nums">
            <span className="font-medium text-neutral-900">{espaco.uso}</span> · {espaco.livre}
          </p>
        </div>
      </div>

      {/* O conteúdo entra depois que a forma já cresceu: durante o morph a caixa está em escala, e texto em escala se deforma. */}
      <motion.div
        className="p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { delay: 0.15, duration: 0.2 } }}
        exit={{ opacity: 0, transition: { duration: 0.1 } }}
      >
        {espaco.conteudo}
      </motion.div>
    </motion.section>
  );
}
