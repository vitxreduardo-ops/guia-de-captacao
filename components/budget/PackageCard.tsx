"use client";

import { useId, useState } from "react";
import { RevealItem } from "@/components/Reveal";
import type { PricingPackage } from "@/lib/budgetSections";

function money(value: number) {
  return (
    "R$ " +
    (Number(value) || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })
  );
}

/**
 * Um pacote (ou avulso). Os entregáveis ficam sempre visíveis, em linhas.
 * Clicar na linha (ou no "+") abre a descrição daquele item; só um fica
 * aberto por vez. Linha sem descrição não é clicável.
 */
export function PackageCard({
  pkg,
  index,
  variant,
  ctaLabel,
  ctaHref,
}: {
  pkg: PricingPackage;
  index: number;
  variant: "pricing" | "avulsos";
  ctaLabel: string;
  ctaHref: string;
}) {
  const [openItem, setOpenItem] = useState<number | null>(null);
  const baseId = useId();
  const highlighted = variant === "pricing" && pkg.featured;
  const priceText = pkg.price > 0 ? money(pkg.price) : "A definir";

  return (
    <RevealItem
      className={`relative flex flex-col bg-[var(--tatu-cream)] p-7 pdf:p-5 text-[var(--tatu-ink)] ${
        highlighted
          ? "border-[1.5px] border-[var(--tatu-olive)]"
          : "border border-[var(--tatu-taupe)]"
      }`}
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--tatu-ink)]/50">
          Opção {String(index + 1).padStart(2, "0")}
        </span>
        {highlighted ? (
          <span className="bg-[var(--tatu-ink)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[var(--tatu-cream)]">
            Recomendado
          </span>
        ) : null}
      </div>

      <p className="text-2xl font-bold">{pkg.name}</p>
      {pkg.subtitle ? (
        <p className="mt-1 text-sm text-[var(--tatu-ink)]/60">{pkg.subtitle}</p>
      ) : null}

      <p
        style={{ fontFamily: "Bootzy, sans-serif" }}
        className="mt-6 pdf:mt-4 text-4xl leading-none tracking-wide"
      >
        {priceText}
        {pkg.price > 0 && pkg.unit ? (
          <span className="ml-2 align-middle font-sans text-sm tracking-normal text-[var(--tatu-ink)]/60">
            {pkg.unit}
          </span>
        ) : null}
      </p>
      {pkg.description ? (
        <p className="mt-2 text-sm text-[var(--tatu-ink)]/60">{pkg.description}</p>
      ) : null}

      {pkg.items.length > 0 ? (
        <ul className="mb-7 mt-6 flex-1 pdf:my-4">
          {pkg.items.map((item, i) => {
            const itemOpen = openItem === i;
            const itemPanelId = `${baseId}-item-${i}`;
            const expandable = item.description !== "";
            const rowClass = "flex w-full items-start gap-3 py-3 pdf:py-2 text-left";
            const content = (
              <>
                <span className="pt-0.5 text-[11px] tabular-nums text-[var(--tatu-ink)]/50">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold leading-snug">
                    {item.title}
                  </span>
                  {item.detail ? (
                    <span className="mt-0.5 block text-xs text-[var(--tatu-ink)]/65">
                      {item.detail}
                    </span>
                  ) : null}
                </span>
                {expandable ? (
                  <span
                    aria-hidden
                    className="flex h-7 w-7 pdf:hidden shrink-0 items-center justify-center border border-[var(--tatu-ink)]/30 text-sm leading-none"
                  >
                    {itemOpen ? "−" : "+"}
                  </span>
                ) : null}
              </>
            );

            return (
              <li key={`${item.title}-${i}`} className="border-t border-[var(--tatu-taupe)]">
                {expandable ? (
                  <button
                    type="button"
                    aria-expanded={itemOpen}
                    aria-controls={itemPanelId}
                    onClick={() => setOpenItem(itemOpen ? null : i)}
                    className={`${rowClass} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tatu-olive)]`}
                  >
                    {content}
                  </button>
                ) : (
                  <div className={rowClass}>{content}</div>
                )}
                {expandable ? (
                  <div
                    id={itemPanelId}
                    inert={!itemOpen}
                    className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
                      itemOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="pb-4 pl-8 text-sm leading-relaxed text-[var(--tatu-ink)]/75">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex-1" />
      )}

      <a
        href={ctaHref}
        target="_blank"
        rel="noreferrer"
        className={`block py-3 text-center text-xs font-bold uppercase tracking-widest ${
          highlighted
            ? "bg-[var(--tatu-ink)] text-[var(--tatu-cream)]"
            : "border border-[var(--tatu-ink)]/40 text-[var(--tatu-ink)] hover:bg-[var(--tatu-taupe)]/30"
        }`}
      >
        {ctaLabel || `Escolher ${pkg.name}`}
      </a>
    </RevealItem>
  );
}
