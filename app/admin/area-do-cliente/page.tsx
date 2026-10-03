import Link from "next/link";
import { ChevronRight, SlidersHorizontal, Users } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { ClientAvatar } from "@/components/admin/ClientAvatar";
import { getCurrentClientScope } from "@/lib/clientAccess";
import { getClientAreaSummaries } from "@/lib/clientArea";
import { findClientLogo } from "@/lib/clientLogoMatch";
import { isLightLogo, listClientLogos } from "@/lib/clientLogos";
import { listGalleryClients } from "@/lib/galleries";
import { countClientLogins } from "@/lib/users";

export const dynamic = "force-dynamic";

export default async function AreaDoClientePage() {
  const [clients, summaries, logins, logos] = await Promise.all([
    listGalleryClients({ clientScope: await getCurrentClientScope() }),
    getClientAreaSummaries(),
    countClientLogins(),
    listClientLogos(),
  ]);

  const logoByClient = new Map(
    await Promise.all(
      clients.map(async (c) => {
        const url = findClientLogo(c.name, logos);
        return [c.id, url ? { url, light: await isLightLogo(url) } : null] as const;
      })
    )
  );

  return (
    <div className="mx-auto w-full max-w-5xl pb-10">
      <AdminHeader
        title="Área do cliente"
        trail={[{ label: "Admin", href: "/admin" }, { label: "Área do cliente" }]}
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-neutral-600">
          O portal que cada cliente vê: calendário editorial, materiais, galeria
          e guias. Escolha um cliente para cuidar do portal dele.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/area-do-cliente/logins"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-neutral-300 px-3 text-sm font-medium hover:bg-neutral-50"
          >
            <Users className="size-4" aria-hidden />
            Logins do portal
          </Link>
          <Link
            href="/admin/area-do-cliente/materiais"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-neutral-300 px-3 text-sm font-medium hover:bg-neutral-50"
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            Materiais visíveis
          </Link>
        </div>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {clients.map((client) => {
          const s = summaries[client.id] ?? { ideas: 0, waiting: 0 };
          const loginCount = logins[client.id] ?? 0;
          const hasLogin = loginCount > 0;
          return (
            <li key={client.id}>
              <Link
                href={`/admin/area-do-cliente/${client.id}`}
                className="group flex h-full items-center gap-3 rounded-xl border border-neutral-200 p-4 transition-colors hover:border-neutral-400 hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <ClientAvatar
                  name={client.name}
                  logoUrl={logoByClient.get(client.id)?.url ?? null}
                  lightLogo={logoByClient.get(client.id)?.light}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{client.name}</p>
                  <span
                    className={`mt-1 inline-block rounded px-1.5 py-0.5 text-xs ${
                      hasLogin
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-neutral-100 text-neutral-600"
                    }`}
                  >
                    {hasLogin ? `${loginCount} ${loginCount === 1 ? "acesso" : "acessos"}` : "Sem acesso"}
                  </span>
                  <p className="mt-1 text-xs text-neutral-500">
                    {s.ideas} {s.ideas === 1 ? "ideia" : "ideias"} nos próximos meses
                    {s.waiting ? ` · ${s.waiting} esperando OK` : ""}
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-neutral-400 group-hover:text-neutral-700" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
