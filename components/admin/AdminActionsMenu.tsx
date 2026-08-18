"use client";

import Link from "next/link";
import { Accordion } from "@/components/Accordion";

const ACTIONS = [
  {
    href: "/admin/guias",
    title: "Guia de Captação",
    description: "Roteiro, referências e checklist de gravação",
  },
  {
    href: "/admin/orcamentos",
    title: "Orçamento",
    description: "Proposta comercial em landing page por cliente",
  },
  {
    href: "/admin/biblioteca",
    title: "Biblioteca",
    description: "Links e ferramentas úteis",
  },
  {
    href: "/admin/galerias",
    title: "Galeria do cliente",
    description: "Fotos por cliente, com link público próprio",
  },
  {
    href: "/admin/backlog",
    title: "Backlog do Instagram",
    description: "Kanban e calendário dos materiais que vão pro feed",
  },
];

const ADMIN_ONLY_ACTIONS = [
  {
    href: "/admin/usuarios",
    title: "Usuários",
    description: "Gerenciar quem tem acesso",
  },
];

export function AdminActionsMenu({ isAdmin = false }: { isAdmin?: boolean }) {
  const actions = isAdmin ? [...ACTIONS, ...ADMIN_ONLY_ACTIONS] : ACTIONS;

  return (
    <Accordion
      summary={
        <span className="text-sm font-semibold text-neutral-900">
          Atalhos
        </span>
      }
      defaultOpen
      className="rounded-lg border border-neutral-200 bg-white"
      buttonClassName="p-4"
    >
      <div className="space-y-2 border-t border-neutral-100 p-4">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="block rounded-lg border border-neutral-200 bg-white p-4 text-center hover:border-neutral-400"
          >
            <p className="text-base font-semibold text-neutral-900">
              {action.title}
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              {action.description}
            </p>
          </Link>
        ))}
      </div>
    </Accordion>
  );
}
