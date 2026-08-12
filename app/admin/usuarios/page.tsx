import { headers } from "next/headers";
import { listUsers } from "@/lib/users";
import { listPendingInvites } from "@/lib/invites";
import { requireAdmin } from "@/lib/session";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { DeleteButton } from "@/components/admin/DeleteButton";
import {
  createInviteAction,
  createUserAction,
  deleteInviteAction,
  deleteUserAction,
  updateUserAction,
} from "./actions";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

async function getSiteOrigin() {
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

export default async function UsersPage() {
  const session = await requireAdmin();
  const [users, invites, origin] = await Promise.all([
    listUsers(),
    listPendingInvites(),
    getSiteOrigin(),
  ]);

  const currentUsername = users.find((user) => user.id === session.userId)?.username;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminHeader
        title="Usuários"
        backHref="/admin"
        username={currentUsername}
      />

      <section className="mb-8 rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-neutral-900">
          Convidar alguém
        </h2>
        <p className="mb-3 text-sm text-neutral-500">
          Gera um link de cadastro único. A pessoa acessa o link e escolhe o
          próprio usuário, e-mail e senha — você não precisa criar a senha
          dela.
        </p>
        <form
          action={createInviteAction}
          className="flex flex-wrap items-end gap-2"
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">
              Acesso
            </label>
            <select
              name="role"
              defaultValue="member"
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
            >
              <option value="member">Membro</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Gerar link de convite
          </button>
        </form>

        {invites.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {invites.map((invite) => (
              <li
                key={invite.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-neutral-200 bg-neutral-50 p-2"
              >
                <div className="min-w-0">
                  <p className="text-xs text-neutral-500">
                    {invite.role === "admin" ? "Admin" : "Membro"} · criado em{" "}
                    {formatDate(invite.created_at)}
                  </p>
                  <p className="truncate text-sm text-neutral-800">
                    {origin}/convite/{invite.token}
                  </p>
                </div>
                <form action={deleteInviteAction}>
                  <input type="hidden" name="id" value={invite.id} />
                  <DeleteButton
                    label="Cancelar"
                    confirmMessage="Cancelar este convite? O link deixa de funcionar."
                  />
                </form>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <h2 className="mb-3 text-sm font-semibold text-neutral-900">
        Ou criar direto (você define a senha)
      </h2>
      <form
        action={createUserAction}
        className="mb-8 flex flex-wrap items-end gap-2 rounded-lg border border-neutral-200 bg-white p-4"
      >
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-neutral-600">
            Usuário
          </label>
          <input
            name="username"
            type="text"
            required
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-neutral-600">
            E-mail
          </label>
          <input
            name="email"
            type="email"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-neutral-600">
            Senha
          </label>
          <input
            name="password"
            type="password"
            required
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-600">
            Acesso
          </label>
          <select
            name="role"
            defaultValue="member"
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          >
            <option value="member">Membro</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Adicionar usuário
        </button>
      </form>

      <ul className="space-y-3">
        {users.map((user) => (
          <li
            key={user.id}
            className="rounded-lg border border-neutral-200 bg-white p-4"
          >
            <form
              action={updateUserAction}
              className="flex flex-wrap items-end gap-2"
            >
              <input type="hidden" name="id" value={user.id} />
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-neutral-600">
                  Usuário
                  {user.id === session.userId ? (
                    <span className="ml-1 text-neutral-400">(você)</span>
                  ) : null}
                </label>
                <input
                  name="username"
                  type="text"
                  defaultValue={user.username}
                  required
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-neutral-600">
                  E-mail
                </label>
                <input
                  name="email"
                  type="email"
                  defaultValue={user.email}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-neutral-600">
                  Nova senha
                </label>
                <input
                  name="password"
                  type="password"
                  placeholder="deixe em branco pra manter"
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600">
                  Acesso
                </label>
                <select
                  name="role"
                  defaultValue={user.role}
                  className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
                >
                  <option value="member">Membro</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <p className="w-full text-xs text-neutral-400">
                Desde {formatDate(user.created_at)}
              </p>
              <button
                type="submit"
                className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Salvar
              </button>
            </form>
            {user.id === session.userId ? null : (
              <form action={deleteUserAction} className="mt-2">
                <input type="hidden" name="id" value={user.id} />
                <DeleteButton
                  confirmMessage={`Remover o acesso de "${user.username}"?`}
                />
              </form>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
