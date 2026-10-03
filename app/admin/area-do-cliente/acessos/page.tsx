import { ClientAreaHeader } from "@/components/admin/ClientAreaHeader";
import { ClientAreaRow } from "@/components/admin/ClientAreaRow";
import { getCurrentClientScope } from "@/lib/clientAccess";
import { listGalleryClients } from "@/lib/galleries";
import { listClientLogins } from "@/lib/users";

export const dynamic = "force-dynamic";

export default async function AcessosPage() {
  const [clients, logins] = await Promise.all([
    listGalleryClients({ clientScope: await getCurrentClientScope() }),
    listClientLogins(),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl pb-10">
      <ClientAreaHeader current="Acessos e galeria" />
      <p className="mb-4 text-sm text-neutral-600">
        Cada cliente entra no portal com o próprio login. Aqui você cria o
        acesso, escolhe como a galeria se chama e vê o portal como ele vê.
      </p>
      <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200">
        {clients.map((c) => (
          <ClientAreaRow
            key={c.id}
            clientId={c.id}
            name={c.name}
            login={logins[c.id] ?? null}
            article={c.gallery_article}
          />
        ))}
      </ul>
    </div>
  );
}
