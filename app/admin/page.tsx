import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminActionsMenu } from "@/components/admin/AdminActionsMenu";
import { DailyTodoList } from "@/components/admin/DailyTodoList";
import { listDailyTodos } from "@/lib/dailyTodos";
import { getCurrentSession, getCurrentUsername } from "@/lib/session";

export default async function AdminHub() {
  const [session, username, { todos, users }] = await Promise.all([
    getCurrentSession(),
    getCurrentUsername(),
    listDailyTodos(),
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
      <div className="grid items-start gap-6 lg:grid-cols-2">
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
