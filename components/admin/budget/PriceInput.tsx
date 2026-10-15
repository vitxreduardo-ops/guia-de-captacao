"use client";

import { useState } from "react";
import { FIELD_CLASS } from "@/components/admin/budget/RepeatableList";

/**
 * Campo de preço. Guarda o texto digitado à parte do número: um input numérico
 * controlado direto pelo número não deixa apagar o 0 nem digitar "0,5" (o valor
 * parcial volta a 0 a cada tecla). Aceita "2.500,50" e "2500.50"; negativo e
 * texto inválido viram 0.
 */
function parse(texto: string) {
  const limpo = texto.trim().replace(/[^\d,.]/g, "");
  if (!limpo) return 0;
  const n = Number(
    limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo
  );
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function PriceInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const [texto, setTexto] = useState(value > 0 ? String(value) : "");
  // Mudou de fora (calculadora, recuperar rascunho): adota o valor novo.
  const [anterior, setAnterior] = useState(value);
  if (value !== anterior) {
    setAnterior(value);
    if (parse(texto) !== value) setTexto(value > 0 ? String(value) : "");
  }

  return (
    <input
      inputMode="decimal"
      value={texto}
      onChange={(e) => {
        setTexto(e.target.value);
        const n = parse(e.target.value);
        setAnterior(n);
        onChange(n);
      }}
      className={FIELD_CLASS}
      placeholder="Preço (R$)"
    />
  );
}
