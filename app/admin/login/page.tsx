import LoginForm from "./LoginForm";

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

        <LoginForm next={next} errorMessage={errorMessage} />
      </div>
    </div>
  );
}
