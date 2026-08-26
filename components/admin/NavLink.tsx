"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import type { ReactNode } from "react";

/** Marca o próprio controle enquanto a navegação não volta. */
function Pending({ children }: { children: ReactNode }) {
  const { pending } = useLinkStatus();
  return (
    <span
      className={
        pending ? "pointer-events-none opacity-50 transition-opacity" : undefined
      }
    >
      {children}
    </span>
  );
}

/**
 * Link da barra da agenda que acusa o clique.
 *
 * Trocar de período é uma navegação com render no servidor: sem isso, o
 * botão fica exatamente igual por meio segundo e a tela parece travada.
 */
export function NavLink({
  href,
  className,
  ariaLabel,
  onClick,
  children,
}: {
  href: string;
  className?: string;
  ariaLabel?: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      onClick={onClick}
      className={className}
    >
      <Pending>{children}</Pending>
    </Link>
  );
}
