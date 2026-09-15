import { logout } from "@/app/admin/login/actions";
import { NotificationBell } from "@/components/admin/NotificationBell";
import {
  countUnreadNotifications,
  listNotifications,
} from "@/lib/notifications";
import { getCurrentSession, getCurrentUsername } from "@/lib/session";

const FOCUS_RING =
  "focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none";

/**
 * Nome, sino e Sair. Estava no cabeçalho de cada página; agora é um bloco só,
 * usado no rodapé da barra lateral (desktop) e na faixa de topo (celular).
 *
 * A campainha é buscada aqui, e não em cada página, pra aparecer igual em
 * todo o admin sem repetir a consulta em dez lugares.
 */
export async function AdminAccount({
  dropUp = false,
  stacked = false,
}: {
  dropUp?: boolean;
  /**
   * No rodapé da barra lateral sobram ~190px: nome, sino e Sair na mesma
   * linha reduziam o nome a uma letra. Empilhado, o nome fica inteiro.
   */
  stacked?: boolean;
}) {
  const session = await getCurrentSession();
  if (!session) return null;

  const [username, notifications, unreadCount] = await Promise.all([
    getCurrentUsername(),
    listNotifications(session.userId),
    countUnreadNotifications(session.userId),
  ]);

  return (
    <div
      className={stacked ? "flex flex-col gap-2" : "flex items-center gap-2"}
    >
      {username ? (
        <span className="min-w-0 truncate text-sm text-neutral-500">
          {username}
        </span>
      ) : null}
      <div className="flex items-center gap-2">
        <NotificationBell
          notifications={notifications}
          unreadCount={unreadCount}
          dropUp={dropUp}
        />
        {/* Borda pra separar do nome ao lado: sem ela os dois eram o mesmo
          cinza e nada dizia qual era clicável. Sem confirmação de propósito —
          deslogar é reversível, e diálogo em ação reversível treina a pessoa
          a clicar sem ler. */}
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
  );
}
