import { TatuLogo } from "@/components/TatuLogo";
import { logout } from "@/app/admin/login/actions";

export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-neutral-100 text-neutral-900">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-5">
        <TatuLogo className="h-5 w-auto" />
        <form action={logout}>
          <button className="text-sm text-neutral-500 hover:text-neutral-900">
            Sair
          </button>
        </form>
      </header>
      <main className="mx-auto w-full max-w-3xl px-5 pb-16">{children}</main>
    </div>
  );
}
