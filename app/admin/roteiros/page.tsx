import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import GeradorRoteiro from "@/components/admin/roteiros/GeradorRoteiro";
import { getRoteiro } from "@/lib/roteiros";
import { preenchimentoDe } from "@/lib/roteiroTypes";

export default async function RoteirosPage({
  searchParams,
}: PageProps<"/admin/roteiros">) {
  // ?de=<id> vem do "Usar como base" do histórico: abre o formulário
  // preenchido com aquele roteiro, sem gerar nada.
  const { de } = await searchParams;
  const base = typeof de === "string" ? await getRoteiro(de) : null;

  return (
    <div className="mx-auto w-full max-w-3xl pb-10">
      <AdminHeader
        title="Roteiros"
        trail={[{ label: "Admin", href: "/admin" }, { label: "Roteiros" }]}
      />

      <div className="mb-6 flex items-baseline justify-between gap-4">
        <p className="text-sm text-neutral-500">
          AIDA · PAS · Midtrack · 6 Chapéus — roteiros de vídeos curtos para redes sociais
        </p>
        <div className="flex shrink-0 gap-2">
          <Link
            href="/admin/roteiros/chat"
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            Chat
          </Link>
          <Link
            href="/admin/roteiros/historico"
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            Histórico
          </Link>
        </div>
      </div>

      {/* key: trocar de base remonta o formulário em vez de manter o anterior. */}
      <GeradorRoteiro key={base?.id ?? "novo"} inicial={base ? preenchimentoDe(base) : null} />
    </div>
  );
}
