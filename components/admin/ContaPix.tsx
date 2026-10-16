"use client";

import { INVOICE_PAYMENT_PRESETS } from "@/lib/billingTypes";
import { linkWhatsApp } from "@/lib/dinheiroTexto";
import { useContaPix } from "@/components/admin/useContaPix";

/** Escolha da conta que recebe o Pix. Vai no PDF (`name="pagamento"`) e na mensagem de cobrança. */
export function ContaSelect({
  id,
  name,
  className = "",
  ariaLabel = "Conta que recebe o Pix",
}: {
  id?: string;
  /** Com nome, o texto da conta vai junto no formulário (PDF). */
  name?: string;
  className?: string;
  ariaLabel?: string;
}) {
  const { index, escolher } = useContaPix();
  return (
    <select
      id={id}
      name={name}
      aria-label={ariaLabel}
      value={name ? INVOICE_PAYMENT_PRESETS[index].text : String(index)}
      onChange={(e) => {
        const novo = name
          ? INVOICE_PAYMENT_PRESETS.findIndex((p) => p.text === e.target.value)
          : Number(e.target.value);
        escolher(Math.max(0, novo));
      }}
      className={`min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-base ${className}`}
    >
      {INVOICE_PAYMENT_PRESETS.map((p, i) => (
        <option key={p.label} value={name ? p.text : String(i)}>
          Conta {p.label}
        </option>
      ))}
    </select>
  );
}

/** Botão que abre o WhatsApp do cliente com a cobrança e a chave Pix da conta escolhida. */
export function CobrarLink({
  cliente,
  mesNome,
  cents,
  rotulo,
  ariaLabel,
  className,
}: {
  cliente: { name: string; contactName: string | null; phone: string | null };
  mesNome: string;
  cents: number;
  rotulo: string;
  ariaLabel?: string;
  className: string;
}) {
  const { pix } = useContaPix();
  const href = linkWhatsApp(cliente, mesNome, cents, pix);
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noreferrer" aria-label={ariaLabel} className={className}>
      {rotulo}
    </a>
  );
}
