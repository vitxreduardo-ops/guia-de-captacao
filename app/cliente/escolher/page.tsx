import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { ClientAvatar } from "@/components/admin/ClientAvatar";
import { getCurrentClientScope } from "@/lib/clientAccess";
import { findClientLogo } from "@/lib/clientLogoMatch";
import { listClientLogos } from "@/lib/clientLogos";
import { listGalleryClients } from "@/lib/galleries";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const HEADING = { fontFamily: "Bootzy, sans-serif", letterSpacing: "0.02em" };

/**
 * Tela do admin que abre o portal sem cliente escolhido: lista os clientes
 * para visualizar como ele. O cliente de verdade nunca chega aqui.
 */
export default async function EscolherClientePage() {
  const session = await getCurrentSession();
  if (session?.role !== "admin") redirect("/cliente/sair");

  const [clients, logos] = await Promise.all([
    listGalleryClients({ clientScope: await getCurrentClientScope() }),
    listClientLogos(),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-4xl leading-none" style={HEADING}>
          Ver o portal como…
        </h1>
        <p className="mt-2 text-[var(--tatu-muted)]">
          Escolha o cliente. A visualização é só de leitura e o app lembra a sua escolha.
        </p>
      </header>

      <ul>
        {clients.map((client) => (
          <li key={client.id} className="border-b border-[var(--tatu-taupe)] last:border-b-0">
            <Link
              href={`/cliente/previa?cliente=${client.id}`}
              className="flex min-h-[4.5rem] items-center gap-3 py-3 hover:text-[var(--tatu-olive)]"
            >
              <ClientAvatar name={client.name} logoUrl={findClientLogo(client.name, logos)} size={48} />
              <span className="min-w-0 flex-1 truncate font-medium">{client.name}</span>
              <ChevronRight className="size-4 shrink-0 text-[var(--tatu-muted)]" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>

      <Link href="/admin/area-do-cliente" className="inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4">
        ← Voltar ao painel
      </Link>
    </div>
  );
}
