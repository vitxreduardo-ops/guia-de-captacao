"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

type Campo = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
type Passo = { campo: Campo; antes: string; depois: string; em: number };

function ehCampo(alvo: EventTarget | null): alvo is Campo {
  if (alvo instanceof HTMLTextAreaElement || alvo instanceof HTMLSelectElement) return true;
  return (
    alvo instanceof HTMLInputElement &&
    !["hidden", "file", "submit", "button", "checkbox", "radio"].includes(alvo.type)
  );
}

/**
 * Escreve o valor como se fosse digitado: o setter nativo e um evento de
 * input/change. Assim o onChange do React roda, e quem salva sozinho (dados
 * gerais) ou recalcula (calculadoras) reage como a uma tecla.
 */
function escrever(campo: Campo, valor: string) {
  const proto = Object.getPrototypeOf(campo) as object;
  Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(campo, valor);
  campo.dispatchEvent(new Event(campo instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
}

/**
 * Histórico de desfazer dos campos dentro de `raiz`, separado do histórico
 * das seções. Funciona com qualquer formulário de dentro sem ele saber: anota
 * o valor de antes e o de depois de cada campo, e uma rajada de digitação no
 * mesmo campo vira um passo só.
 *
 * ponytail: guarda o elemento do campo; se um bloco da aba desmontar, os passos
 * dele são pulados. Se a aba passar a recriar campos, guardar por `name`.
 */
export function useHistoricoCampos(raiz: RefObject<HTMLElement | null>) {
  const passado = useRef<Passo[]>([]);
  const futuro = useRef<Passo[]>([]);
  const conhecido = useRef(new WeakMap<Campo, string>());
  const aplicando = useRef(false);
  const [pilhas, setPilhas] = useState({ passado: 0, futuro: 0 });
  const contar = useCallback(
    () => setPilhas({ passado: passado.current.length, futuro: futuro.current.length }),
    []
  );

  useEffect(() => {
    const el = raiz.current;
    if (!el) return;
    const aoFocar = (e: Event) => {
      if (ehCampo(e.target)) conhecido.current.set(e.target, e.target.value);
    };
    const aoMudar = (e: Event) => {
      if (aplicando.current || !ehCampo(e.target)) return;
      const campo = e.target;
      const antes = conhecido.current.get(campo) ?? "";
      if (antes === campo.value) return;
      const agora = Date.now();
      const topo = passado.current.at(-1);
      if (topo && topo.campo === campo && agora - topo.em < 800) {
        topo.depois = campo.value;
        topo.em = agora;
      } else {
        passado.current.push({ campo, antes, depois: campo.value, em: agora });
        if (passado.current.length > 100) passado.current.shift();
      }
      conhecido.current.set(campo, campo.value);
      futuro.current = [];
      contar();
    };
    el.addEventListener("focusin", aoFocar);
    el.addEventListener("input", aoMudar);
    el.addEventListener("change", aoMudar);
    return () => {
      el.removeEventListener("focusin", aoFocar);
      el.removeEventListener("input", aoMudar);
      el.removeEventListener("change", aoMudar);
    };
  }, [raiz, contar]);

  const mover = useCallback(
    (de: RefObject<Passo[]>, para: RefObject<Passo[]>, valor: (p: Passo) => string) => {
      let passo = de.current.pop();
      while (passo && !passo.campo.isConnected) passo = de.current.pop();
      if (!passo) return contar();
      aplicando.current = true;
      escrever(passo.campo, valor(passo));
      aplicando.current = false;
      conhecido.current.set(passo.campo, passo.campo.value);
      passo.em = 0;
      para.current.push(passo);
      passo.campo.focus();
      contar();
    },
    [contar]
  );

  const desfazer = useCallback(() => mover(passado, futuro, (p) => p.antes), [mover]);
  const refazer = useCallback(() => mover(futuro, passado, (p) => p.depois), [mover]);

  return { desfazer, refazer, pilhas };
}
