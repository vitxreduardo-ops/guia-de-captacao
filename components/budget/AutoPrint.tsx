"use client";

import { useEffect } from "react";

/** O menor encolhimento aceito: abaixo disso o texto fica pequeno demais para
 *  apresentar, e a seção prefere virar dois slides. */
const ZOOM_MINIMO = 0.72;

function altura(el: HTMLElement) {
  return el.getBoundingClientRect().height;
}

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
  let escala = 1;
  for (let volta = 0; volta < 5; volta++) {
    const h = altura(conteudo);
    if (h <= livre) break;
    escala = (escala * livre * 0.99) / h;
    if (escala < ZOOM_MINIMO) {
      soltar(conteudo);
      return false;
    }
    conteudo.style.width = `${largura / escala}px`;
    conteudo.style.maxWidth = "none";
    conteudo.style.marginLeft = `${recuo}px`;
    conteudo.style.transformOrigin = "top left";
    conteudo.style.transform = `scale(${escala})`;
  }
  if (altura(conteudo) > livre) {
    soltar(conteudo);
    return false;
  }
  if (escala < 1) {
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

/**
 * Abre a janela de impressão assim que fontes e imagens carregaram — no Mac,
 * "Salvar como PDF" sai com a proposta. Esperar as imagens evita PDF com
 * buraco no lugar do portfólio.
 */
export function AutoPrint() {
  useEffect(() => {
    let cancelado = false;
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
    Promise.race([
      Promise.all([document.fonts.ready, ...imagens]),
      teto,
    ]).then(() => {
      if (cancelado) return;
      document.querySelectorAll<HTMLElement>("[data-slide]").forEach(paginar);
      window.print();
    });
    return () => {
      cancelado = true;
    };
  }, []);

  return null;
}
