import Link from "next/link";
import { cookies } from "next/headers";
import { TatuLogo } from "@/components/TatuLogo";
import { logout } from "@/app/admin/login/actions";
import { PREVIEW_COOKIE } from "@/lib/clientPortal";
import { PortalNav } from "./PortalNav";

export const metadata = {
  title: "Portal do cliente — Tatú Estúdio Criativo",
  manifest: "/cliente/manifest.webmanifest",
};

export default async function ClienteLayout({ children }: { children: React.ReactNode }) {
  const preview = Boolean((await cookies()).get(PREVIEW_COOKIE)?.value);

  return (
    <div
      // Gutter único do portal: 1,25rem, ou a área segura do iPhone (notch,
      // laterais em paisagem) quando ela for maior. O carrossel de arquivos
      // usa a mesma variável pra sangrar até a borda sem passar dela.
      style={{ "--gutter": "max(1.25rem, env(safe-area-inset-left), env(safe-area-inset-right))" } as React.CSSProperties}
      className="min-h-svh bg-[var(--tatu-cream)] text-[var(--tatu-ink)] selection:bg-[var(--tatu-olive)] selection:text-[var(--tatu-cream)]"
    >
      {preview ? (
        <div className="flex items-center justify-between gap-3 bg-[var(--tatu-ink)] px-[var(--gutter)] pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] text-sm text-[var(--tatu-cream)]">
          <span>Visualização do portal como o cliente o vê. Somente leitura.</span>
          <span className="flex shrink-0 items-center gap-4">
            <Link href="/cliente/escolher" className="whitespace-nowrap font-semibold underline underline-offset-4">
              Trocar cliente
            </Link>
            <Link href="/cliente/previa?sair=1" className="whitespace-nowrap font-semibold underline underline-offset-4">
              Voltar ao painel
            </Link>
          </span>
        </div>
      ) : null}

      <header className={`mx-auto flex max-w-xl items-center justify-between px-[var(--gutter)] md:pt-8 ${preview ? "pt-5" : "pt-[max(1.25rem,env(safe-area-inset-top))]"}`}>
        <TatuLogo className="h-5 w-auto" />
        {preview ? null : (
          <form action={logout}>
            <button className="min-h-11 px-1 text-sm text-[var(--tatu-muted)] underline-offset-4 hover:text-[var(--tatu-ink)] hover:underline">
              Sair
            </button>
          </form>
        )}
      </header>

      <main className="mx-auto max-w-xl px-[var(--gutter)] pb-[calc(7rem+env(safe-area-inset-bottom))] pt-6 md:pb-16">
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
