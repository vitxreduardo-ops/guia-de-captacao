"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/**
 * A entrada do Painel: os blocos sobem 8px e aparecem em sequência, e os
 * números dos cartões contam até o valor. Acontece uma vez, quando a página
 * monta — o refresh em tempo real do admin não remonta isto, então nada
 * pisca quando outro usuário mexe em alguma coisa.
 *
 * Quem pediu menos movimento recebe tudo no lugar, sem animação (o CSS que
 * esconde os blocos antes do JS só vale quando a animação vai rodar).
 */
export function PainelMotion({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(
        el.querySelectorAll("[data-anim]"),
        { opacity: 0, y: 8 },
        {
          opacity: 1,
          y: 0,
          duration: 0.45,
          ease: "power3.out",
          stagger: 0.06,
          clearProps: "transform",
        }
      );

      el.querySelectorAll<HTMLElement>("[data-count]").forEach((node) => {
        const target = Number(node.dataset.count);
        if (!target) return;
        const brl = node.dataset.countKind === "brl";
        const state = { value: 0 };
        node.textContent = brl ? BRL.format(0) : "0";
        gsap.to(state, {
          value: target,
          duration: 0.7,
          delay: 0.15,
          ease: "power3.out",
          onUpdate: () => {
            node.textContent = brl
              ? BRL.format(state.value / 100)
              : String(Math.round(state.value));
          },
          // Termina no texto que o servidor já tinha escrito.
          onComplete: () => {
            node.textContent = brl ? BRL.format(target / 100) : String(target);
          },
        });
      });
    });

    return () => mm.revert();
  }, []);

  return (
    <div ref={root} className="painel-motion">
      {children}
    </div>
  );
}
