import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { ClientAvatar } from "@/components/admin/ClientAvatar";
import { ClientTabs } from "@/components/admin/ClientTabs";
import { assertClientAllowed, getCurrentClientScope } from "@/lib/clientAccess";
import { findClientLogo } from "@/lib/clientLogoMatch";
import { isLightLogo, listClientLogos } from "@/lib/clientLogos";
import { getGalleryClientWithImages } from "@/lib/galleries";
import { listClientUsers } from "@/lib/users";

/**
 * Moldura de um cliente na Área do cliente: quem é, se o portal está ativo e
 * as abas. O endereço leva o id, então cada cliente tem o próprio link.
 */
export default async function ClientAreaClientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  assertClientAllowed(await getCurrentClientScope(), clientId);

  const [client, logos, logins] = await Promise.all([
    getGalleryClientWithImages(clientId),
    listClientLogos(),
    listClientUsers(clientId),
  ]);
  if (!client) notFound();

  const logo = findClientLogo(client.name, logos);
  const light = logo ? await isLightLogo(logo) : false;
  const base = `/admin/area-do-cliente/${clientId}`;

  return (
    <div className="mx-auto w-full max-w-3xl pb-10">
      <AdminHeader
        title={client.name}
        trail={[
          { label: "Admin", href: "/admin" },
          { label: "Área do cliente", href: "/admin/area-do-cliente" },
          { label: client.name },
        ]}
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <ClientAvatar name={client.name} logoUrl={logo} lightLogo={light} />
        <div className="min-w-0 flex-1 basis-40">
          <h1 className="truncate text-xl font-semibold">{client.name}</h1>
          <span
            className={`mt-1 inline-block rounded px-1.5 py-0.5 text-xs ${
              logins.length ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-600"
            }`}
          >
            {logins.length
              ? `${logins.length} ${logins.length === 1 ? "pessoa com acesso" : "pessoas com acesso"}`
              : "Sem acesso ao portal"}
          </span>
        </div>
        <Link
          href={`/cliente/previa?cliente=${clientId}`}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-neutral-300 px-3 text-sm font-medium hover:bg-neutral-50"
        >
          <Eye className="size-4" aria-hidden />
          Ver como o cliente
        </Link>
      </div>

      <div className="mb-6">
        <ClientTabs
          label={`Área do cliente: ${client.name}`}
          tabs={[
            { href: `${base}/calendario`, label: "Calendário editorial" },
            { href: `${base}/acesso`, label: "Acessos e Drive" },
          ]}
        />
      </div>

      {children}
    </div>
  );
}
