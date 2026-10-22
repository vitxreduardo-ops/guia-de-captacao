import Link from "next/link";
import { listClientOptions, listMindMaps } from "@/lib/mindMaps";
import { TEMPLATES } from "@/lib/mindMap";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { createMindMapAction, deleteMindMapAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function MindMapsDashboard() {
  const [maps, clients] = await Promise.all([listMindMaps(), listClientOptions()]);

  // Um grupo por cliente (com mapa), e "Sem cliente" por último.
  const groups = clients
    .map((c) => ({ id: c.id as string | null, name: c.name, maps: maps.filter((m) => m.client_id === c.id) }))
    .filter((g) => g.maps.length > 0);
  const loose = maps.filter((m) => !m.client_id || !clients.some((c) => c.id === m.client_id));
  if (loose.length) groups.push({ id: null, name: "Sem cliente", maps: loose });

  return (
    <div className="mx-auto w-full max-w-6xl pb-10">
      <AdminHeader
        title="Mapas mentais"
        trail={[{ label: "Admin", href: "/admin" }, { label: "Mapas mentais" }]}
      />

      <form
        action={createMindMapAction}
        className="mb-8 space-y-4 rounded-lg border border-neutral-200 bg-white p-4"
      >
        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="mb-2 text-sm font-medium text-neutral-900">Começar de</legend>
          {TEMPLATES.map((t, i) => (
            <label
              key={t.kind}
              className="cursor-pointer rounded-lg border border-neutral-200 p-3 has-[:checked]:border-neutral-900 has-[:checked]:bg-neutral-50"
            >
              <input type="radio" name="template" value={t.kind} defaultChecked={i === 0} className="sr-only" />
              <span className="block text-sm font-medium text-neutral-900">{t.name}</span>
              <span className="block text-sm text-neutral-500">{t.hint}</span>
            </label>
          ))}
        </fieldset>
        <div className="flex flex-wrap gap-2">
          <input
            name="title"
            placeholder="Nome do centro do mapa (ex: Templo Fitness)"
            required
            className="min-w-60 flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
          <select name="client_id" defaultValue="" className="rounded-md border border-neutral-300 bg-white px-2 py-2 text-sm">
            <option value="">Sem cliente</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Novo mapa
          </button>
        </div>
      </form>

      {maps.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Nenhum mapa ainda. Escolha um modelo, dê um nome ao centro e comece.
        </p>
      ) : (
        <div className="space-y-8">
          {groups.map((g) => (
            <section key={g.id ?? "solto"}>
              <h2 className="mb-2 text-sm font-medium text-neutral-500">{g.name}</h2>
              <ul className="space-y-3">
                {g.maps.map((map) => (
                  <li
                    key={map.id}
                    className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4"
                  >
                    <div>
                      <Link href={`/mapa/editar/${map.id}`} className="font-medium text-neutral-900 hover:underline">
                        {map.title}
                      </Link>
                      <p className="mt-0.5 text-sm text-neutral-500">
                        {new Date(map.updated_at).toLocaleDateString("pt-BR")} ·{" "}
                        <span className={map.status === "published" ? "text-emerald-600" : "text-amber-600"}>
                          {map.status === "published" ? "Publicado" : "Rascunho"}
                        </span>
                      </p>
                    </div>
                    <form action={deleteMindMapAction}>
                      <input type="hidden" name="id" value={map.id} />
                      <DeleteButton confirmMessage={`Excluir o mapa "${map.title}"?`} />
                    </form>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
