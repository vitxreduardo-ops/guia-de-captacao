import Link from "next/link";
import { cookies } from "next/headers";
import { TatuLogo } from "@/components/TatuLogo";
import { logout } from "@/app/admin/login/actions";
import { PREVIEW_COOKIE } from "@/lib/clientPortal";
import { PortalNav } from "./PortalNav";

export const metadata = { title: "Portal do cliente — Tatú Estúdio Criativo" };

export default async function ClienteLayout({ children }: { children: React.ReactNode }) {
  const preview = Boolean((await cookies()).get(PREVIEW_COOKIE)?.value);

  return (
    <div className="min-h-svh bg-[var(--tatu-cream)] text-[var(--tatu-ink)] selection:bg-[var(--tatu-olive)] selection:text-[var(--tatu-cream)]">
      {preview ? (
        <div className="flex items-center justify-between gap-3 bg-[var(--tatu-ink)] px-5 py-2 text-sm text-[var(--tatu-cream)]">
          <span>Prévia, como o cliente vê. Só leitura.</span>
          <Link href="/cliente/previa?sair=1" className="font-semibold underline underline-offset-4">
            Voltar ao admin
          </Link>
        </div>
      ) : null}

      <header className="mx-auto flex max-w-xl items-center justify-between px-5 pt-5 md:pt-8">
        <TatuLogo className="h-5 w-auto" />
        {preview ? null : (
          <form action={logout}>
            <button className="min-h-11 px-1 text-sm text-[var(--tatu-muted)] underline-offset-4 hover:text-[var(--tatu-ink)] hover:underline">
              Sair
            </button>
          </form>
        )}
      </header>

      <main className="mx-auto max-w-xl px-5 pb-28 pt-6 md:pb-16">
        <div className="mb-6 hidden md:block">
          <PortalNav />
        </div>
        {children}
      </main>

      <div className="md:hidden">
        <PortalNav />
      </div>
    </div>
  );
}
