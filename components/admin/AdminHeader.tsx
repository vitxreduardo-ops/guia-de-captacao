import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { logout } from "@/app/admin/login/actions";
import { LiveRefresh } from "@/components/admin/LiveRefresh";
import { NotificationBell } from "@/components/admin/NotificationBell";
import { TatuLogo } from "@/components/TatuLogo";
import {
  countUnreadNotifications,
  listNotifications,
} from "@/lib/notifications";
import { getCurrentSession } from "@/lib/session";

export type BreadcrumbItem = {
  label: string;
  /** Sem href = página atual (último item da trilha). */
  href?: string;
};

const FOCUS_RING =
  "focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none";

export async function AdminHeader({
  title,
  trail,
  username,
}: {
  title: string;
  trail?: BreadcrumbItem[];
  username?: string | null;
}) {
  // A campainha é buscada aqui, e não em cada página, pra aparecer igual em
  // todo o admin sem repetir a consulta em dez lugares.
  const session = await getCurrentSession();
  const [notifications, unreadCount] = session
    ? await Promise.all([
        listNotifications(session.userId),
        countUnreadNotifications(session.userId),
      ])
    : [[], 0];

  return (
    <header className="mb-8">
      {/* Todo o admin fica montado sob este header, então é daqui que sai a
          sincronização com o que os outros usuários estão fazendo. */}
      <LiveRefresh />
      {/* O logo é a volta pro Painel de qualquer página — é onde todo mundo
          clica esperando ir pra home. */}
      <Link
        href="/admin"
        aria-label="Ir para o Painel"
        className={`mx-auto mb-4 block w-fit rounded ${FOCUS_RING}`}
      >
        <TatuLogo className="block h-[30px] w-auto text-black" />
      </Link>

      {/* Trilha e ações ficam na chrome, acima da linha; o título respira
          embaixo dela. */}
      <div className="flex items-center justify-between gap-4 border-b border-neutral-200 pb-3">
        <div className="min-w-0">
          {trail?.length ? (
            <nav aria-label="Breadcrumb">
              <ol className="flex flex-wrap items-center gap-1 text-[13px]">
                {trail.map((item, index) => (
                  <li key={item.label} className="flex items-center gap-1">
                    {index > 0 ? (
                      <ChevronRight
                        aria-hidden="true"
                        className="size-3.5 text-neutral-500"
                      />
                    ) : null}
                    {item.href ? (
                      <Link
                        href={item.href}
                        className={`flex items-center rounded-md bg-neutral-100 px-2.5 text-neutral-600 transition-transform hover:bg-neutral-200 active:scale-[0.97] pointer-coarse:min-h-11 py-1 ${FOCUS_RING}`}
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <span
                        aria-current="page"
                        className="flex items-center rounded-md bg-neutral-100 px-2.5 py-1 font-medium text-neutral-900 pointer-coarse:min-h-11"
                      >
                        {item.label}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {username ? (
            <span className="text-sm text-neutral-500">{username}</span>
          ) : null}
          {session ? (
            <NotificationBell
              notifications={notifications}
              unreadCount={unreadCount}
            />
          ) : null}
          {/* Borda pra separar do nome ao lado: sem ela os dois eram o mesmo
              cinza e nada dizia qual era clicável. Sem confirmação de
              propósito — deslogar é reversível, e diálogo em ação reversível
              treina a pessoa a clicar sem ler. */}
          <form action={logout}>
            <button
              type="submit"
              className={`flex items-center rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 transition-transform hover:bg-neutral-50 hover:text-neutral-900 active:scale-[0.97] pointer-coarse:min-h-11 ${FOCUS_RING}`}
            >
              Sair
            </button>
          </form>
        </div>
      </div>

      <h1 className="mt-5 text-xl leading-tight font-semibold tracking-tight text-neutral-900">
        {title}
      </h1>
    </header>
  );
}
