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

      {/* Empilhado no mobile/tablet com as tarefas em cima; em duas colunas
          no desktop, com os atalhos à esquerda.
          items-start: sem isso o grid estica os dois cards pra mesma altura e
          o menu recolhido vira uma caixa vazia comprida. */}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section
          aria-labelledby="tarefas-titulo"
          className="rounded-lg border border-neutral-200 bg-white p-4 lg:order-2"
        >
          <h2
            id="tarefas-titulo"
            className="mb-3 text-sm font-semibold text-neutral-900"
          >
            Tarefas
          </h2>
          <DailyTodoList
            todos={todos}
            users={users}
            currentUser={currentUser}
          />
        </section>

        <AdminActionsMenu isAdmin={session?.role === "admin"} />
      </div>
    </div>
  );
}
