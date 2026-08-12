import { listLibraryLinks } from "@/lib/library";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { getCurrentUsername } from "@/lib/session";
import { createLibraryLinkAction, deleteLibraryLinkAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const [links, username] = await Promise.all([
    listLibraryLinks(),
    getCurrentUsername(),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminHeader title="Biblioteca" backHref="/admin" username={username} />

      <form
        action={createLibraryLinkAction}
        className="mb-8 space-y-2 rounded-lg border border-neutral-200 bg-white p-4"
      >
        <div className="flex gap-2">
          <input
            name="title"
            placeholder="Título"
            required
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
          <input
            name="url"
            placeholder="https://..."
            required
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>
        <input
          name="description"
          placeholder="Breve descrição"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Adicionar link
        </button>
      </form>

      {links.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Nenhum link cadastrado ainda. Use o formulário acima para começar.
        </p>
      ) : (
        <ul className="space-y-3">
          {links.map((link) => (
            <li
              key={link.id}
              className="flex items-start justify-between rounded-lg border border-neutral-200 bg-white p-4"
            >
              <div>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-neutral-900 hover:underline"
                >
                  {link.title}
                </a>
                {link.description ? (
                  <p className="mt-0.5 text-sm text-neutral-500">
                    {link.description}
                  </p>
                ) : null}
              </div>
              <form action={deleteLibraryLinkAction}>
                <input type="hidden" name="id" value={link.id} />
                <DeleteButton
                  confirmMessage={`Excluir o link "${link.title}"?`}
                />
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
