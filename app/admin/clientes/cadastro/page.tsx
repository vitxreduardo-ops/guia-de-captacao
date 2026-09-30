import { AdminHeader } from "@/components/admin/AdminHeader";
import { ClientTabs } from "@/components/admin/ClientTabs";
import { ClientRegistry, type ClientSummary } from "@/components/admin/ClientRegistry";
import { getYearTotals } from "@/lib/billing";
import { listGalleryClients } from "@/lib/galleries";
import { getClientUser } from "@/lib/users";
import { saveClientAccessAction } from "./actions";
import { getCurrentClientScope } from "@/lib/clientAccess";

export const dynamic = "force-dynamic";

export default async function ClientesCadastroPage() {
  const year = new Date().getFullYear();
  const clientScope = await getCurrentClientScope();
  const [todos, totals] = await Promise.all([
    listGalleryClients({ includeArchived: true, clientScope }),
    getYearTotals(year, clientScope),
  ]);

  const clients = todos.filter((client) => !client.archived_at);
  const archived = todos.filter((client) => client.archived_at);

  const access = await Promise.all(
    clients.map(async (client) => ({
      client,
      user: await getClientUser(client.id),
    }))
  );

  const summaries: Record<string, ClientSummary> = {};
  for (const row of totals) {
    summaries[row.clientId] = {
      entregasNoAno: row.deliveries,
      faturadoNoAnoCents: row.totalCents,
    };
  }

  return (
    <div className="mx-auto w-full max-w-5xl pb-10">
      <AdminHeader
        title="Clientes"
        trail={[
          { label: "Admin", href: "/admin" },
          { label: "Clientes", href: "/admin/clientes" },
          { label: "Cadastro" },
        ]}
      />

      <div className="mb-6">
        <ClientTabs />
      </div>

      <ClientRegistry
        clients={clients}
        archived={archived}
        summaries={summaries}
        year={year}
      />

      <section className="mt-10">
        <h2 className="text-base font-semibold">Acesso ao portal do cliente</h2>
        <p className="mb-3 text-sm text-neutral-500">
          O cliente entra em /admin/login e cai direto em /cliente, onde vê as
          entregas, aprova e acessa guias e galeria.
        </p>
        <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200">
          {access.map(({ client, user }) => (
            <li key={client.id} className="px-4 py-3">
              <form action={saveClientAccessAction} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="clientId" value={client.id} />
                <div className="min-w-40 flex-1">
                  <p className="text-sm font-medium">{client.name}</p>
                  <p className="text-xs text-neutral-500">
                    {user ? `Acesso: ${user.username}` : "Sem acesso"}
                  </p>
                </div>
                <input
                  name="username"
                  required
                  minLength={3}
                  defaultValue={user?.username ?? ""}
                  placeholder="usuário"
                  className="w-36 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
                <input
                  name="password"
                  type="text"
                  required
                  minLength={6}
                  placeholder={user ? "nova senha" : "senha"}
                  className="w-36 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                />
                <button className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white">
                  {user ? "Trocar senha" : "Criar acesso"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
