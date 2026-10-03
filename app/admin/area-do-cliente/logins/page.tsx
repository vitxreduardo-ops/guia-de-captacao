import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { getCurrentClientScope } from "@/lib/clientAccess";
import { listGalleryClients } from "@/lib/galleries";
import { listAllClientUsers } from "@/lib/users";

export const dynamic = "force-dynamic";

/**
 * Visão geral dos logins do portal: quem tem acesso a quê, num lugar só. A
 * gestão em si (nova senha, editar, remover, convidar) fica na página de cada
 * cliente, onde há contexto; aqui cada linha leva até lá.
 */
export default async function LoginsPage() {
  const [clients, users] = await Promise.all([
    listGalleryClients({ clientScope: await getCurrentClientScope() }),
    listAllClientUsers(),
  ]);
  const byClient = Map.groupBy(users, (u) => u.client_id ?? "");
  const withLogins = clients.filter((c) => byClient.has(c.id));

  return (
    <div className="mx-auto w-full max-w-3xl pb-10">
      <AdminHeader
        title="Logins do portal"
        trail={[
          { label: "Admin", href: "/admin" },
          { label: "Área do cliente", href: "/admin/area-do-cliente" },
          { label: "Logins do portal" },
        ]}
      />
      <p className="mb-4 text-sm text-neutral-600">
        {users.length} {users.length === 1 ? "pessoa tem" : "pessoas têm"} acesso ao portal.
        Para criar, convidar, trocar senha ou remover, abra o cliente.
      </p>

      {withLogins.length ? (
        <div className="space-y-5">
          {withLogins.map((client) => (
            <section key={client.id} aria-labelledby={`c-${client.id}`}>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <h2 id={`c-${client.id}`} className="font-semibold">{client.name}</h2>
                <Link
                  href={`/admin/area-do-cliente/${client.id}/acesso`}
                  className="inline-flex min-h-11 items-center text-sm underline underline-offset-4"
                >
                  Gerenciar
                </Link>
              </div>
              <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200">
                {byClient.get(client.id)!.map((u) => (
                  <li key={u.id} className="flex flex-wrap items-center gap-x-3 px-4 py-2.5 text-sm">
                    <span className="min-w-0 flex-1 truncate font-medium">{u.full_name || u.username}</span>
                    {u.portal_label ? (
                      <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-700">{u.portal_label}</span>
                    ) : null}
                    <span className="text-xs text-neutral-500">{u.username}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <p className="text-sm text-neutral-500">Nenhum login de cliente ainda.</p>
      )}
    </div>
  );
}
