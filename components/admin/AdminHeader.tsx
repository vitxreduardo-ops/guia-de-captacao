import Link from "next/link";
import { logout } from "@/app/admin/login/actions";

export function AdminHeader({
  title,
  backHref,
}: {
  title: string;
  backHref?: string;
}) {
  return (
    <header className="mb-8 flex items-center justify-between border-b border-neutral-200 pb-4">
      <div>
        {backHref ? (
          <Link
            href={backHref}
            className="mb-1 inline-block text-sm text-neutral-500 hover:text-neutral-800"
          >
            ← Voltar
          </Link>
        ) : null}
        <h1 className="text-xl font-semibold text-neutral-900">{title}</h1>
      </div>
      <form action={logout}>
        <button
          type="submit"
          className="text-sm text-neutral-500 hover:text-neutral-800"
        >
          Sair
        </button>
      </form>
    </header>
  );
}
