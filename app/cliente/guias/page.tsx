import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getPortalClient, getPortalSession } from "@/lib/clientPortal";
import { listPublishedGuidesByClientName } from "@/lib/guides";

export const dynamic = "force-dynamic";

const HEADING = { fontFamily: "Bootzy, sans-serif", letterSpacing: "0.02em" };

export default async function GuiasPage() {
  const { clientId } = await getPortalSession();
  const client = await getPortalClient(clientId);
  const guides = await listPublishedGuidesByClientName(client.name);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-4xl leading-none" style={HEADING}>
          Guias de captação
        </h1>
        <p className="mt-2 text-[var(--tatu-muted)]">
          Roteiros, referências e orientações de cada gravação.
        </p>
      </header>

      {guides.length ? (
        <ul>
          {guides.map((guide) => (
            <li key={guide.slug} className="border-b border-[var(--tatu-taupe)] last:border-b-0">
              <Link
                href={`/guia/${guide.slug}`}
                className="flex min-h-16 items-center gap-3 py-3 hover:text-[var(--tatu-olive)]"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{guide.title}</span>
                  <span className="block text-sm text-[var(--tatu-muted)]">
                    {guide.shoot_date
                      ? `Gravação em ${new Date(`${guide.shoot_date}T12:00:00`).toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}`
                      : "Data a definir"}
                    {guide.location ? ` · ${guide.location}` : ""}
                  </span>
                </span>
                <ChevronRight className="size-4 text-[var(--tatu-muted)]" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[var(--tatu-muted)]">
          Os guias de captação publicados para o seu projeto serão exibidos aqui.
        </p>
      )}
    </div>
  );
}
