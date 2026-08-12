import { getPendingInviteByToken } from "@/lib/invites";
import { acceptInviteAction } from "./actions";

type Params = Promise<{ token: string }>;
type SearchParams = Promise<{ error?: string }>;

const ERROR_MESSAGES: Record<string, string> = {
  campos: "Preencha usuário e senha.",
  senha: "As senhas não coincidem.",
  usuario_existe: "Esse nome de usuário já está em uso.",
  config: "O servidor não está configurado corretamente.",
};

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  const invite = await getPendingInviteByToken(token);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-neutral-900">
          Guia de Captação
        </h1>

        {!invite ? (
          <p className="mt-4 text-sm text-red-600">
            Esse link de convite é inválido ou já foi usado. Peça um novo
            link.
          </p>
        ) : (
          <>
            <p className="mb-6 text-sm text-neutral-500">
              Crie seu acesso ({invite.role === "admin" ? "admin" : "membro"})
            </p>

            <form action={acceptInviteAction} className="space-y-4">
              <input type="hidden" name="token" value={token} />
              <div>
                <label
                  htmlFor="username"
                  className="mb-1 block text-sm font-medium text-neutral-700"
                >
                  Usuário
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  autoFocus
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="mb-1 block text-sm font-medium text-neutral-700"
                >
                  E-mail (opcional)
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="mb-1 block text-sm font-medium text-neutral-700"
                >
                  Senha
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="password_confirm"
                  className="mb-1 block text-sm font-medium text-neutral-700"
                >
                  Confirmar senha
                </label>
                <input
                  id="password_confirm"
                  name="password_confirm"
                  type="password"
                  required
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
                />
              </div>

              {error ? (
                <p className="text-sm text-red-600">
                  {ERROR_MESSAGES[error] ?? "Não foi possível criar sua conta."}
                </p>
              ) : null}

              <button
                type="submit"
                className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Criar acesso
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
