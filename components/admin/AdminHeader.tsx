import Link from "next/link";
import { logout } from "@/app/admin/login/actions";
import { TatuLogo } from "@/components/TatuLogo";

export function AdminHeader({
  title,
  backHref,
  username,
}: {
  title: string;
  backHref?: string;
  username?: string | null;
}) {
  return (
    <header className="mb-8 border-b border-neutral-200 pb-4">
      <TatuLogo className="mx-auto mb-4 block h-[30px] w-auto text-black" />
      <div className="flex items-center justify-between">
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
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          {username ? <span>{username}</span> : null}
          <form action={logout}>
            <button
              type="submit"
              className="hover:text-neutral-800"
            >
              Sair
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
