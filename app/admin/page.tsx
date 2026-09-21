import { Suspense } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { DailyTodoList } from "@/components/admin/DailyTodoList";
import { UpcomingPosts } from "@/components/admin/UpcomingPosts";
import {
  TodayAgenda,
  TodayAgendaSkeleton,
} from "@/components/admin/TodayAgenda";
import {
  FollowupsToday,
  PaymentsDue,
} from "@/components/admin/Reminders";
import { listDailyTodos } from "@/lib/dailyTodos";
import { getReminders } from "@/lib/reminders";
import { listUpcomingPosts } from "@/lib/upcomingPosts";
import { getCurrentSession, getCurrentUsername } from "@/lib/session";
import { getUserCalendarAccount } from "@/lib/userCalendars";

export const dynamic = "force-dynamic";

export default async function AdminHub() {
  const [session, username, { todos, users }, upcoming, reminders] =
    await Promise.all([
      getCurrentSession(),
      getCurrentUsername(),
      listDailyTodos(),
      listUpcomingPosts(),
      getReminders(),
    ]);

  // Quem não conectou agenda não vê o bloco de hoje — e nem paga a consulta.
  const account = session ? await getUserCalendarAccount(session.userId) : null;

  // Serve pra pintar a tarefa recém-criada já com o responsável certo, antes
  // de o servidor responder.
  const currentUser =
    session && username ? { id: session.userId, username } : null;

  return (
    <div className="mx-auto w-full max-w-6xl pb-10">
      <AdminHeader title="Painel" />


      {/* Os atalhos saíram daqui pra barra do layout, onde valem pras 19
          telas. Sobra a coluna do "o que tenho pela frente": agenda de hoje
          em cima, próximas postagens embaixo.
          items-start: sem isso o grid estica os dois lados pra mesma altura e
          a coluna curta vira uma caixa vazia comprida. */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(240px,1fr)_2fr]">
        {/* No mobile o wrapper vira `contents` e some, pra ordem da pilha
            continuar sendo decidida pelo grid de fora. */}
        <div className="max-lg:contents lg:space-y-6">
          {/* Fora do Promise.all da página de propósito: são até cinco idas
              ao Google, e o Painel não pode esperar por elas pra existir.
              Chega por streaming, com o esqueleto no mesmo lugar. */}
          {account ? (
            <Suspense fallback={<TodayAgendaSkeleton />}>
              <TodayAgenda account={account} />
            </Suspense>
          ) : null}

          {/* Entre a agenda e as postagens: os três respondem a mesma
              pergunta, e a prospecção é a única cujo atraso não aparece
              sozinho em lugar nenhum. */}
          <div className="max-lg:order-3">
            <FollowupsToday
              prospects={reminders.followups}
              today={reminders.today}
            />
          </div>

          {/* No celular cai por último, depois das tarefas — no desktop
              fecha a coluna estreita, embaixo da agenda. */}
          <div className="max-lg:order-4">
            <UpcomingPosts posts={upcoming} />
          </div>

          <div className="max-lg:order-5">
            <PaymentsDue
              payments={reminders.payments}
              today={reminders.today}
            />
          </div>
        </div>

        {/* Filho direto do grid de propósito: é ele que ocupa a coluna
            larga (2fr) no desktop. No celular sobe pro meio da pilha. */}
        <section aria-labelledby="tarefas-titulo" className="max-lg:order-2">
          <DailyTodoList todos={todos} users={users} currentUser={currentUser} />
        </section>
      </div>
    </div>
  );
}
