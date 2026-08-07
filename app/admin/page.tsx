import Link from "next/link";
import { listGuides } from "@/lib/guides";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { createGuideAction, deleteGuideAction } from "./actions";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

export default async function AdminDashboard() {
  const guides = await listGuides();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <AdminHeader title="Guias de gravação" />

      <form
        action={createGuideAction}
        className="mb-8 flex gap-2 rounded-lg border border-neutral-200 bg-white p-4"
      >
        <input
          name="title"
          placeholder="Título do novo guia (ex: Gravação — Cliente X)"
          required
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Novo guia
        </button>
      </form>

      {guides.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Nenhum guia criado ainda. Use o formulário acima para começar.
        </p>
      ) : (
        <ul className="space-y-3">
          {guides.map((guide) => (
            <li
              key={guide.id}
              className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-4"
            >
              <div>
                <Link
                  href={`/admin/guias/${guide.id}`}
                  className="font-medium text-neutral-900 hover:underline"
                >
                  {guide.title}
                </Link>
                <p className="mt-0.5 text-sm text-neutral-500">
                  {guide.client_name || "Sem cliente definido"} ·{" "}
                  {formatDate(guide.created_at)} ·{" "}
                  <span
                    className={
                      guide.status === "published"
                        ? "text-emerald-600"
                        : "text-amber-600"
                    }
                  >
                    {guide.status === "published" ? "Publicado" : "Rascunho"}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/admin/guias/${guide.id}`}
                  className="text-sm text-neutral-600 hover:text-neutral-900"
                >
                  Editar
                </Link>
                <form action={deleteGuideAction}>
                  <input type="hidden" name="id" value={guide.id} />
                  <DeleteButton
                    confirmMessage={`Excluir o guia "${guide.title}"? Essa ação não pode ser desfeita.`}
                  />
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
