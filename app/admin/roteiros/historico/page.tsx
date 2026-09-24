import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import CardHistorico from "@/components/admin/roteiros/CardHistorico";
import { listRoteiros } from "@/lib/roteiros";
import { extrairPreview } from "@/lib/roteiroTypes";

export const dynamic = "force-dynamic";

export default async function HistoricoRoteirosPage({
  searchParams,
}: PageProps<"/admin/roteiros/historico">) {
  const params = await searchParams;
  const tag = typeof params.tag === "string" ? params.tag.trim() : "";
  const favoritos = params.favoritos === "1";
  const roteiros = await listRoteiros({ tag: tag || undefined, favoritos });

  return (
    <div className="mx-auto w-full max-w-3xl pb-10">
      <AdminHeader
        title="Histórico de roteiros"
        trail={[
          { label: "Admin", href: "/admin" },
          { label: "Roteiros", href: "/admin/roteiros" },
          { label: "Histórico" },
        ]}
      />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <form className="flex flex-wrap items-center gap-2" method="get">
          <input
            type="text"
            name="tag"
            defaultValue={tag}
            placeholder="Filtrar por tag/cliente..."
            aria-label="Filtrar por tag ou cliente"
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-neutral-500 focus:outline-none"
          />
          <label className="flex items-center gap-1.5 text-sm text-neutral-600">
            <input
              type="checkbox"
              name="favoritos"
              value="1"
              defaultChecked={favoritos}
              className="accent-neutral-900"
            />
            Só favoritos
          </label>
          <button
            type="submit"
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            Filtrar
          </button>
          {(tag || favoritos) && (
            <Link
              href="/admin/roteiros/historico"
              className="text-sm text-neutral-500 underline hover:text-neutral-900"
            >
              limpar
            </Link>
          )}
        </form>
        <Link
          href="/admin/roteiros"
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
        >
          + Novo roteiro
        </Link>
      </div>

      {roteiros.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Nenhum roteiro encontrado com esse filtro.
        </p>
      ) : (
        <div className="space-y-3">
          {roteiros.map((r) => (
            <CardHistorico
              key={r.id}
              id={r.id}
              createdAt={r.created_at}
              framework={r.framework}
              tema={r.tema}
              objetivo={r.objetivo}
              favorito={r.favorito}
              status={r.status}
              preview={extrairPreview(r.framework, r.roteiro)}
              tags={r.tags ?? []}
              roteiro={r.roteiro}
              duracaoSegundos={r.duracao_segundos}
            />
          ))}
        </div>
      )}
    </div>
  );
}
