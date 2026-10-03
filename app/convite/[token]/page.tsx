import { getPendingInviteByToken } from "@/lib/invites";
import { TatuLogo } from "@/components/TatuLogo";
import { acceptClientInviteAction, acceptInviteAction } from "./actions";
import { getPortalClientName } from "@/lib/clientPortal";

type Params = Promise<{ token: string }>;
type SearchParams = Promise<{ error?: string }>;

const ERROR_MESSAGES: Record<string, string> = {
  campos: "Preencha usuário e senha.",
  senha: "As senhas não coincidem.",
  usuario_existe: "Esse nome de usuário já está em uso.",
  config: "O servidor não está configurado corretamente.",
  nome: "Informe o seu nome.",
  usuario_formato: "O usuário deve ter 3 ou mais caracteres, com letras, números, ponto ou hífen.",
  senha_curta: "A senha precisa ter 6 ou mais caracteres.",
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

  if (invite?.role === "client" && invite.client_id) {
    const clientName = await getPortalClientName(invite.client_id);
    const input =
      "min-h-12 w-full rounded-xl border border-[var(--tatu-border)] bg-white px-3 text-base";
    return (
      <div className="flex min-h-svh items-center justify-center bg-[var(--tatu-cream)] px-5 py-10 text-[var(--tatu-ink)]">
        <div className="w-full max-w-sm">
          <TatuLogo className="mb-8 h-6 w-auto" />
          <h1
            className="text-3xl leading-tight"
            style={{ fontFamily: "Bootzy, sans-serif", letterSpacing: "0.02em" }}
          >
            Crie o seu acesso
          </h1>
          <p className="mt-2 text-[var(--tatu-muted)]">
            Portal do projeto {clientName}
            {invite.label ? ` · ${invite.label}` : ""}.
          </p>

          {error ? (
            <p role="alert" className="mt-4 rounded-xl bg-white p-3 text-sm text-red-700">
              {ERROR_MESSAGES[error] ?? "Não foi possível criar o acesso."}
            </p>
          ) : null}

          <form action={acceptClientInviteAction} className="mt-6 space-y-3">
            <input type="hidden" name="token" value={token} />
            <label className="block text-sm font-medium" htmlFor="full_name">Nome completo</label>
            <input id="full_name" name="full_name" required autoComplete="name" className={input} />
            <label className="block text-sm font-medium" htmlFor="username">Nome de usuário</label>
            <input id="username" name="username" required autoComplete="username" autoCapitalize="none" className={input} />
            <label className="block text-sm font-medium" htmlFor="password">Senha</label>
            <input id="password" name="password" type="password" required minLength={6} autoComplete="new-password" className={input} />
            <label className="block text-sm font-medium" htmlFor="password_confirm">Confirme a senha</label>
            <input id="password_confirm" name="password_confirm" type="password" required minLength={6} autoComplete="new-password" className={input} />
            <button className="mt-2 min-h-12 w-full rounded-full bg-[var(--tatu-ink)] font-semibold text-[var(--tatu-cream)]">
              Criar acesso
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-neutral-50 px-4">
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
