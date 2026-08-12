import { login } from "./actions";

type SearchParams = Promise<{ error?: string; next?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const next = params.next ?? "/admin";

  const errorMessage =
    params.error === "config"
      ? "ADMIN_PASSWORD não está configurado no servidor."
      : params.error
      ? "Usuário ou senha incorretos."
      : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-neutral-900">
          Guia de Captação
        </h1>
        <p className="mb-6 text-sm text-neutral-500">
          Acesso administrativo
        </p>

        <form action={login} className="space-y-4">
          <input type="hidden" name="next" value={next} />
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

          {errorMessage ? (
            <p className="text-sm text-red-600">{errorMessage}</p>
          ) : null}

          <button
            type="submit"
            className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
