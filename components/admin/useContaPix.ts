"use client";

import { useSyncExternalStore } from "react";
import { INVOICE_PAYMENT_PRESETS, pixKeyOf } from "@/lib/billingTypes";

const KEY = "dinheiro-conta-pix";
const EVENTO = "dinheiro-conta-pix-mudou";

// Guarda também em memória: com o armazenamento do navegador bloqueado a
// escolha ainda vale até recarregar a página.
let memoria = 0;

function ler(): number {
  try {
    const n = Number(window.localStorage.getItem(KEY));
    if (Number.isInteger(n) && n >= 0 && n < INVOICE_PAYMENT_PRESETS.length) return n;
  } catch {
    return memoria;
  }
  return memoria;
}

function assinar(aviso: () => void) {
  window.addEventListener("storage", aviso);
  window.addEventListener(EVENTO, aviso);
  return () => {
    window.removeEventListener("storage", aviso);
    window.removeEventListener(EVENTO, aviso);
  };
}

/**
 * A conta que recebe o Pix, escolhida uma vez e lembrada: vale pro PDF e pra
 * mensagem de cobrança, em todas as telas e linhas ao mesmo tempo.
 */
export function useContaPix() {
  const index = useSyncExternalStore(assinar, ler, () => 0);
  const conta = INVOICE_PAYMENT_PRESETS[index];
  return {
    index,
    conta,
    /** Chave Pix da conta escolhida, no formato do link de cobrança. */
    pix: (() => {
      const chave = pixKeyOf(conta.text);
      return chave ? { label: conta.label, chave } : null;
    })(),
    escolher(novo: number) {
      memoria = novo;
      try {
        window.localStorage.setItem(KEY, String(novo));
      } catch {
        /* sem armazenamento: fica só em memória */
      }
      window.dispatchEvent(new Event(EVENTO));
    },
  };
}
