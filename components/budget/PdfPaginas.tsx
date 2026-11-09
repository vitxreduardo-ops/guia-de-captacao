"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/** O menor encolhimento aceito: abaixo disso o texto fica pequeno demais para
 *  apresentar, e a seção prefere virar dois slides. */
const ZOOM_MINIMO = 0.72;

function soltar(conteudo: HTMLElement) {
  for (const prop of ["width", "maxWidth", "marginLeft", "marginBottom", "transform", "transformOrigin"] as const) {
    conteudo.style[prop] = "";
  }
}

/**
 * Encolhe o conteúdo até caber em `livre`, mantendo a largura visual e a
 * margem esquerda da coluna. É `transform: scale` e não `zoom`: o zoom muda o
 * layout, e a impressão do Chrome refaz esse layout diferente da tela (os
 * cards estouravam). O conteúdo é diagramado mais largo (largura / escala),
 * reflui e baixa a altura, por isso converge em poucas voltas; a margem de
 * baixo negativa devolve ao slide a altura já encolhida, para o centro bater.
 */
function encaixar(conteudo: HTMLElement, livre: number, largura: number) {
  soltar(conteudo);
  const pai = conteudo.parentElement!;
  const recuo = conteudo.offsetLeft - parseFloat(getComputedStyle(pai).paddingLeft);
  // Mede pela altura de layout vezes a escala, sem ler o retângulo já
  // transformado: há navegador que não reflete o transform na medição.
  let escala = 1;
  for (let volta = 0; volta < 6; volta++) {
    const h = conteudo.offsetHeight * escala;
    if (h <= livre) break;
    escala = (escala * livre * 0.99) / h;
    if (escala < ZOOM_MINIMO) {
      soltar(conteudo);
      return false;
    }
    conteudo.style.width = `${largura / escala}px`;
    conteudo.style.maxWidth = "none";
    conteudo.style.marginLeft = `${recuo}px`;
  }
  if (conteudo.offsetHeight * escala > livre) {
    soltar(conteudo);
    return false;
  }
  if (escala < 1) {
    conteudo.style.transformOrigin = "top left";
    conteudo.style.transform = `scale(${escala})`;
    conteudo.style.marginBottom = `${-conteudo.offsetHeight * (1 - escala)}px`;
    // A impressão fatia pela altura de layout, que o scale não muda: o slide
    // encaixado vira um bloco fechado de uma página só.
    const slide = conteudo.closest<HTMLElement>("[data-slide]")!;
    slide.style.height = getComputedStyle(slide).getPropertyValue("--pdf-h") || "720px";
    slide.style.overflow = "hidden";
    slide.style.contain = "strict";
  }
  return true;
}

/**
 * Paginação de designer, seção por seção, medida já no layout do PDF (a tela
 * usa as mesmas regras de .proposta-pdf):
 *   * cabe no slide: fica como está, centrada na altura;
 *   * passa um pouco: encolhe até caber;
 *   * passa muito: os cards (ou blocos) da grade se dividem entre slides
 *     seguidos, com o mesmo título, e o que vem depois da grade (as notas dos
 *     avulsos) vai para o último. Nada se parte no meio.
 */
function paginar(slide: HTMLElement) {
  const conteudo = slide.querySelector<HTMLElement>("[data-slide-content]");
  if (!conteudo) return;
  const estilo = getComputedStyle(slide);
  const livre =
    (parseFloat(estilo.getPropertyValue("--pdf-h")) || 720) -
    parseFloat(estilo.paddingTop) -
    parseFloat(estilo.paddingBottom);
  const largura = conteudo.getBoundingClientRect().width;
  if (encaixar(conteudo, livre, largura)) return;

  const grade = conteudo.querySelector<HTMLElement>(":scope > .grid");
  if (!grade || grade.children.length < 2) return;

  const molde = slide.cloneNode(true) as HTMLElement;
  const depois: Element[] = [];
  for (let el = grade.nextElementSibling; el; el = el.nextElementSibling) depois.push(el);
  depois.forEach((el) => el.remove());

  let ficam = grade.children.length;
  while (ficam > 1 && !encaixar(conteudo, livre, largura)) {
    grade.lastElementChild!.remove();
    ficam--;
  }

  // O próximo slide sai do molde, sem os itens que já ficaram neste.
  const gradeMolde = molde.querySelector<HTMLElement>("[data-slide-content] > .grid")!;
  for (let i = 0; i < ficam; i++) gradeMolde.firstElementChild!.remove();
  slide.after(molde);
  paginar(molde);
}

type Pagina = { el: HTMLElement; rotulo: string };

function rotuloDe(slide: HTMLElement) {
  if (slide.dataset.slide === "capa") return "Capa";
  if (slide.dataset.slide === "fim") return "Fecho";
  return slide.querySelector("h2")?.textContent?.trim() || "Seção";
}

/** Espera fontes e imagens: imprimir antes deixa buraco no portfólio. */
function carregado() {
  const imagens = Array.from(document.images).map((img) =>
    img.complete
      ? Promise.resolve()
      : new Promise<void>((pronto) => {
          img.addEventListener("load", () => pronto(), { once: true });
          img.addEventListener("error", () => pronto(), { once: true });
        })
  );
  // ponytail: teto fixo de 8s; imagem que não carregar até lá sai em branco.
  const teto = new Promise<void>((pronto) => setTimeout(pronto, 8000));
  return Promise.race([Promise.all([document.fonts.ready, ...imagens]), teto]);
}

function Carregando({ texto }: { texto: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-[var(--tatu-ink)]/85 text-[var(--tatu-cream)] backdrop-blur-sm print:hidden"
    >
      <span className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--tatu-cream)]/25 border-t-[var(--tatu-cream)] motion-reduce:animate-none" />
      <p className="text-xs font-bold uppercase tracking-[0.2em]">{texto}</p>
    </div>
  );
}

/**
 * O modo PDF da proposta: monta os slides, deixa escolher quais páginas entram
 * e só então abre a impressão ("Salvar como PDF" no Mac).
 *
 * As páginas são os próprios slides, em tamanho real: o que se marca aqui é o
 * que sai. Página desmarcada fica apagada na tela e some da impressão
 * (data-pdf-fora, ver globals.css).
 */
export function PdfPaginas() {
  const [paginas, setPaginas] = useState<Pagina[] | null>(null);
  const [fora, setFora] = useState<Set<number>>(new Set());
  const [gerando, setGerando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    carregado().then(() => {
      if (cancelado) return;
      document.querySelectorAll<HTMLElement>("[data-slide]").forEach(paginar);
      // Só depois de medir: as miniaturas encolhem os slides na tela.
      document.querySelector(".proposta-pdf")?.setAttribute("data-miniaturas", "");
      // Depois de paginar: os slides divididos já existem e entram na lista.
      setPaginas(
        Array.from(document.querySelectorAll<HTMLElement>("[data-slide]")).map((el) => ({
          el,
          rotulo: rotuloDe(el),
        }))
      );
    });
    const fim = () => setGerando(false);
    window.addEventListener("afterprint", fim);
    return () => {
      cancelado = true;
      window.removeEventListener("afterprint", fim);
    };
  }, []);

  useEffect(() => {
    paginas?.forEach((p, i) => p.el.toggleAttribute("data-pdf-fora", fora.has(i)));
  }, [paginas, fora]);

  if (!paginas) return <Carregando texto="Preparando as páginas…" />;

  const total = paginas.length;
  const escolhidas = total - fora.size;

  function alternar(i: number) {
    setFora((atual) => {
      const novo = new Set(atual);
      if (novo.has(i)) novo.delete(i);
      else novo.add(i);
      return novo;
    });
  }

  function gerar() {
    setGerando(true);
    // Dois quadros para o "Gerando…" aparecer antes da janela de impressão,
    // que trava a página enquanto está aberta.
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
  }

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-40 border-b border-black/10 bg-white/95 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-neutral-900">Escolha as páginas do PDF</p>
            <p className="text-xs text-neutral-500">
              {escolhidas} de {total} {total === 1 ? "página" : "páginas"} · clique numa página para tirar ou devolver
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFora(fora.size === 0 ? new Set(paginas.map((_, i) => i)) : new Set())}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
            >
              {fora.size === 0 ? "Desmarcar todas" : "Marcar todas"}
            </button>
            <button
              type="button"
              onClick={gerar}
              disabled={escolhidas === 0}
              className="rounded-md bg-neutral-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Gerar PDF
            </button>
          </div>
        </div>
      </div>

      {paginas.map((p, i) =>
        createPortal(
          <label className="absolute inset-0 z-30 cursor-pointer print:hidden">
            <input
              type="checkbox"
              checked={!fora.has(i)}
              onChange={() => alternar(i)}
              className="peer sr-only"
            />
            <span data-pdf-selo className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-neutral-900 shadow-md ring-2 ring-transparent peer-focus-visible:ring-neutral-900">
              <span
                aria-hidden
                className={`flex h-4 w-4 items-center justify-center rounded-[4px] border text-[10px] leading-none ${
                  fora.has(i) ? "border-neutral-400 bg-white text-transparent" : "border-neutral-900 bg-neutral-900 text-white"
                }`}
              >
                ✓
              </span>
              <span className="max-w-[260px] truncate">
                {String(i + 1).padStart(2, "0")} · {p.rotulo}
              </span>
            </span>
          </label>,
          p.el,
          `pagina-${i}`
        )
      )}

      {gerando ? <Carregando texto="Gerando o PDF…" /> : null}
    </>
  );
}
