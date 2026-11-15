import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getPortalClient, getPortalSession } from "@/lib/clientPortal";
import { listPlanejamentos } from "@/lib/planejamentos";

export const dynamic = "force-dynamic";

const HEADING = { fontFamily: "Bootzy, sans-serif", letterSpacing: "0.02em" };

export default async function PlanejamentoPortalPage() {
  const { clientId } = await getPortalSession();
  const client = await getPortalClient(clientId);
  const planejamentos = (await listPlanejamentos(client.id)).filter((p) => p.status === "published");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-4xl leading-none" style={HEADING}>
          Planejamento
        </h1>
        <p className="mt-2 text-[var(--tatu-muted)]">
          O que vamos fazer em cada mês: estratégia, rotina, calendário, roteiros e referências.
        </p>
      </header>

      {planejamentos.length ? (
        <ul>
          {planejamentos.map((p) => (
            <li key={p.id} className="border-b border-[var(--tatu-taupe)] last:border-b-0">
              <Link
                href={`/planejamento/${p.slug}`}
                className="flex min-h-16 items-center gap-3 py-3 hover:text-[var(--tatu-olive)]"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{p.title}</span>
                  <span className="block text-sm text-[var(--tatu-muted)]">
                    Atualizado em {new Date(p.updated_at).toLocaleDateString("pt-BR")}
                  </span>
                </span>
                <ChevronRight className="size-4 text-[var(--tatu-muted)]" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[var(--tatu-muted)]">O planejamento do mês aparece aqui assim que ficar pronto.</p>
      )}
    </div>
  );
}
