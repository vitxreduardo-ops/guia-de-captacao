import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminActionsMenu } from "@/components/admin/AdminActionsMenu";
import { DailyTodoList } from "@/components/admin/DailyTodoList";
import { UpcomingPosts } from "@/components/admin/UpcomingPosts";
import { listDailyTodos } from "@/lib/dailyTodos";
import { listUpcomingPosts } from "@/lib/upcomingPosts";
import { getCurrentSession, getCurrentUsername } from "@/lib/session";

export default async function AdminHub() {
  const [session, username, { todos, users }, upcoming] = await Promise.all([
    getCurrentSession(),
    getCurrentUsername(),
    listDailyTodos(),
    listUpcomingPosts(),
  ]);

  // Serve pra pintar a tarefa recém-criada já com o responsável certo, antes
  // de o servidor responder.
  const currentUser =
    session && username ? { id: session.userId, username } : null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminHeader title="Painel" username={username} />

      {/* Ordem do DOM já serve aos dois: empilhado no mobile/tablet dá Atalhos
          em cima, e em duas colunas no desktop dá Atalhos à esquerda.
          items-start: sem isso o grid estica os dois cards pra mesma altura e
          o menu recolhido vira uma caixa vazia comprida. */}
      {/* Assimétrico e não meio a meio: o maior rótulo do menu tem 135px, então
          532px de coluna deixavam ~365px mortos por linha. As tarefas usam a
          largura que sobra. */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(200px,1fr)_2fr]">
        {/* Atalhos e próximas postagens dividem a mesma célula do grid. Soltos,
            caíam em linhas diferentes, e como a linha de cima tem a altura das
            tarefas o vão entre os dois virava 231px em vez dos 24px de padrão.
            No mobile o wrapper vira `contents` e some, pra ordem da pilha
            continuar sendo decidida pelo grid de fora. */}
        <div className="max-lg:contents lg:space-y-6">
          {/* Duas instâncias em vez de um defaultOpen dependente da viewport: o
              servidor não sabe a largura da tela, então decidir isso em estado
              daria divergência de hidratação ou o painel abrindo sozinho a cada
              carga. O CSS resolve sem JS. */}
          <div className="lg:hidden">
            <AdminActionsMenu isAdmin={session?.role === "admin"} />
          </div>
          <div className="hidden lg:block">
            <AdminActionsMenu isAdmin={session?.role === "admin"} defaultOpen />
          </div>

          {/* No mobile fecha a pilha, depois das tarefas. */}
          <div className="max-lg:order-last">
            <UpcomingPosts posts={upcoming} />
          </div>
        </div>

        <section
          aria-labelledby="tarefas-titulo"
          className="rounded-lg border border-neutral-200 bg-white p-4"
        >
          <DailyTodoList
            todos={todos}
            users={users}
            currentUser={currentUser}
          />
        </section>
      </div>
    </div>
  );
}
