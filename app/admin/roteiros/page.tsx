import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import GeradorRoteiro from "@/components/admin/roteiros/GeradorRoteiro";

export default function RoteirosPage() {
  return (
    <div className="mx-auto w-full max-w-3xl pb-10">
      <AdminHeader
        title="Roteiros"
        trail={[{ label: "Admin", href: "/admin" }, { label: "Roteiros" }]}
      />

      <div className="mb-6 flex items-baseline justify-between gap-4">
        <p className="text-sm text-neutral-500">
          AIDA · PAS · Midtrack · 6 Chapéus — roteiros de até 90s para redes sociais
        </p>
        <Link
          href="/admin/roteiros/historico"
          className="shrink-0 rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
        >
          Histórico
        </Link>
      </div>

      <GeradorRoteiro />
    </div>
  );
}
