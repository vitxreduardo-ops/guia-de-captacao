"use client";

import { Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";

const CHAVE = "financeiro-ocultar-valores";
const DINHEIRO = /R\$\s?-?[\d.]+(?:,\d+)?(?:\s?(?:mil|mi))?/g;
const MASCARA = "R$ ••••";

/**
 * Olho que esconde todo valor em reais do Financeiro (a escolha fica salva).
 * Troca o texto "R$ …" já na tela, então vale para qualquer cartão, lista ou
 * gráfico sem cada um precisar saber disso.
 * ponytail: só texto visível; rótulos de leitor de tela e dicas de gráfico continuam com o valor.
 */
export function OcultarValores({ alvo }: { alvo: string }) {
  const [oculto, setOculto] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- lê a preferência salva só no navegador
    setOculto(localStorage.getItem(CHAVE) === "1");
  }, []);

  useEffect(() => {
    const raiz = document.querySelector(alvo);
    if (!raiz || !oculto) return;
    const originais = new Map<Text, string>();
    const mascarar = (no: Text) => {
      const texto = no.data;
      // Os centavos de "R$ 7.330<small>,00</small>" ficam num nó à parte.
      const novo = /^,\d{2}$/.test(texto) ? "" : texto.replace(DINHEIRO, MASCARA);
      if (novo === texto) return;
      originais.set(no, texto);
      no.data = novo;
    };
    const varrer = (no: Node) => {
      const it = document.createTreeWalker(no, NodeFilter.SHOW_TEXT);
      for (let n = it.nextNode(); n; n = it.nextNode()) mascarar(n as Text);
    };
    varrer(raiz);
    const obs = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === "characterData") mascarar(m.target as Text);
        else m.addedNodes.forEach((n) => (n.nodeType === Node.TEXT_NODE ? mascarar(n as Text) : varrer(n)));
      }
    });
    obs.observe(raiz, { childList: true, characterData: true, subtree: true });
    return () => {
      obs.disconnect();
      originais.forEach((texto, no) => {
        if (no.isConnected) no.data = texto;
      });
    };
  }, [oculto, alvo]);

  const Icone = oculto ? EyeOff : Eye;
  return (
    <button
      type="button"
      aria-pressed={oculto}
      aria-label={oculto ? "Mostrar valores" : "Ocultar valores"}
      title={oculto ? "Mostrar valores" : "Ocultar valores"}
      onClick={() => {
        localStorage.setItem(CHAVE, oculto ? "0" : "1");
        setOculto(!oculto);
      }}
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--tatu-ink)"
    >
      <Icone aria-hidden className="size-5" strokeWidth={1.75} />
    </button>
  );
}
