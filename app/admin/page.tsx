import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";

export default function AdminHub() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <AdminHeader title="Ferramentas" />

      <div className="grid gap-4 sm:grid-cols-2">
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
      </div>
    </div>
  );
}
