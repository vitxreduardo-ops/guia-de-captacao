import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { getCurrentSession } from "@/lib/session";

export default async function AdminHub() {
  const session = await getCurrentSession();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminHeader title="Ferramentas" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/admin/guias"
          className="rounded-lg border border-neutral-200 bg-white p-6 text-center hover:border-neutral-400"
        >
          <p className="text-base font-semibold text-neutral-900">
            Guia de Captação
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            Roteiro, referências e checklist de gravação
          </p>
        </Link>
        <Link
          href="/admin/orcamentos"
          className="rounded-lg border border-neutral-200 bg-white p-6 text-center hover:border-neutral-400"
        >
          <p className="text-base font-semibold text-neutral-900">
            Orçamento
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            Proposta comercial em landing page por cliente
          </p>
        </Link>
        <Link
          href="/admin/biblioteca"
          className="rounded-lg border border-neutral-200 bg-white p-6 text-center hover:border-neutral-400"
        >
          <p className="text-base font-semibold text-neutral-900">
            Biblioteca
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            Links e ferramentas úteis
          </p>
        </Link>
        {session?.role === "admin" ? (
          <Link
            href="/admin/usuarios"
            className="rounded-lg border border-neutral-200 bg-white p-6 text-center hover:border-neutral-400"
          >
            <p className="text-base font-semibold text-neutral-900">
              Usuários
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              Gerenciar quem tem acesso
            </p>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
