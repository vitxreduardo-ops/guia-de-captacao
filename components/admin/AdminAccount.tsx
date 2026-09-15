import { LogOut } from "lucide-react";
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
    // Nada aqui pode derrubar a barra. Este bloco é o único pedaço da chrome
    // que vai ao banco, e com o banco fora a barra inteira deixava de
    // renderizar — sem nome, sem Sair e, pior, sem navegação. Presenciei isso
    // numa queda de rede aqui. Nome em branco e sino zerado são degradações
    // aceitáveis; ficar sem como sair da tela não é.
    getCurrentUsername().catch(() => null),
    listNotifications(session.userId).catch(() => []),
    countUnreadNotifications(session.userId).catch(() => 0),
  ]);

  return (
    <div
      className={stacked ? "flex flex-col gap-2" : "flex items-center gap-2"}
    >
      {username ? (
        <span className="min-w-0 truncate text-sm text-neutral-500 group-data-[colapsada=true]/barra:hidden">
          {username}
        </span>
      ) : null}
      <div className="flex items-center gap-2 group-data-[colapsada=true]/barra:flex-col">
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
            className={`flex items-center rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600 group-data-[colapsada=true]/barra:px-2 transition-transform hover:bg-neutral-50 hover:text-neutral-900 active:scale-[0.97] pointer-coarse:min-h-11 ${FOCUS_RING}`}
          >
            <LogOut
              aria-hidden="true"
              className="hidden size-4 group-data-[colapsada=true]/barra:block"
            />
            <span className="group-data-[colapsada=true]/barra:sr-only">
              Sair
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
