import { Suspense } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { DailyTodoList } from "@/components/admin/DailyTodoList";
import { PainelMotion } from "@/components/admin/PainelMotion";
import {
  PainelAtencao,
  PainelSemana,
  PainelStats,
  type Stat,
} from "@/components/admin/PainelHoje";
import {
  TodayAgenda,
  TodayAgendaSkeleton,
} from "@/components/admin/TodayAgenda";
import { formatBRL } from "@/lib/billingTypes";
import { listDailyTodos } from "@/lib/dailyTodos";
import { getPainelCards } from "@/lib/painelHoje";
import { attentionItems, longDate, weekFrom } from "@/lib/painelHojeText";
import { dueLabel } from "@/lib/reminderText";
import { getReminders } from "@/lib/reminders";
import { getCurrentSession, getCurrentUsername } from "@/lib/session";
import { getUserCalendarAccount } from "@/lib/userCalendars";
import { getCurrentClientScope } from "@/lib/clientAccess";

export const dynamic = "force-dynamic";

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;

export default async function AdminHub() {
  const clientScope = await getCurrentClientScope();
  const [session, username, { todos, users }, cards, reminders] =
    await Promise.all([
      getCurrentSession(),
      getCurrentUsername(),
      listDailyTodos(),
      getPainelCards(clientScope),
      getReminders(clientScope),
    ]);

  // Quem não conectou agenda não vê o bloco de hoje — e nem paga a consulta.
  const account = session ? await getUserCalendarAccount(session.userId) : null;

  // Serve pra pintar a tarefa recém-criada já com o responsável certo, antes
  // de o servidor responder.
  const currentUser =
    session && username ? { id: session.userId, username } : null;

  const { today, week, late } = cards;
  const days = weekFrom(today);

  const attention = attentionItems({
    today,
    payments: reminders.payments,
    followups: reminders.followups,
    lateDeliveries: late,
    todos,
    money: formatBRL,
  });

  // Os quatro números: cada um responde "tá em dia?" e leva pra tela dele.
  const openTodos = todos.filter((todo) => !todo.done);
  const todosDue = openTodos.filter(
    (todo) => todo.due_date && todo.due_date <= today
  ).length;
  const deliveriesWeek = week.filter((item) => item.lane === "clientes").length;
  const followupsLate = reminders.followups.filter(
    (prospect) => (prospect.next_contact_date ?? today) < today
  ).length;
  const receivable = reminders.payments.reduce((sum, p) => sum + p.cents, 0);
  const overdue = reminders.payments.filter((p) => p.dueDate < today);
  const overdueCents = overdue.reduce((sum, p) => sum + p.cents, 0);
  // Do mais próximo ao mais distante: o primeiro é "o próximo a vencer".
  const upcoming = reminders.payments
    .filter((p) => p.dueDate >= today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const upcomingCents = upcoming.reduce((sum, p) => sum + p.cents, 0);

  const stats: Stat[] = [
    {
      label: "Tarefas abertas",
      display: String(openTodos.length),
      count: { kind: "int", value: openTodos.length },
      notes: [
        {
          text:
            todosDue > 0
              ? `${todosDue} pra hoje ou antes`
              : "nenhuma com prazo vencido",
          tone: todosDue > 0 ? "alerta" : "neutro",
        },
      ],
      href: "#tarefas-titulo",
    },
    {
      label: "Entregas na semana",
      display: String(deliveriesWeek),
      count: { kind: "int", value: deliveriesWeek },
      notes: [
        {
          text:
            late.length > 0
              ? plural(late.length, "atrasada", "atrasadas")
              : "nenhuma atrasada",
          tone: late.length > 0 ? "alerta" : "ok",
        },
      ],
      href: "/admin/entregas",
    },
    {
      label: "Follow-ups",
      display: String(reminders.followups.length),
      count: { kind: "int", value: reminders.followups.length },
      notes: [
        {
          text:
            reminders.followups.length === 0
              ? "tudo em dia"
              : followupsLate > 0
                ? plural(followupsLate, "atrasado", "atrasados")
                : "todos pra hoje",
          tone:
            reminders.followups.length === 0
              ? "ok"
              : followupsLate > 0
                ? "alerta"
                : "neutro",
        },
      ],
      href: "/admin/prospeccao",
    },
    {
      label: "A receber",
      display: formatBRL(receivable),
      count: { kind: "brl", value: receivable },
      // Três respostas num cartão só: quanto já passou do dia, quanto vence
      // nos próximos sete dias e de quantos clientes é.
      notes: [
        {
          text:
            overdueCents > 0
              ? `${formatBRL(overdueCents)} vencido · ${plural(overdue.length, "cliente", "clientes")}`
              : "nada vencido",
          tone: overdueCents > 0 ? "alerta" : "ok",
        },
        {
          text:
            upcoming.length > 0
              ? `${formatBRL(upcomingCents)} em 7 dias · próximo ${dueLabel(upcoming[0].dueDate, today)}`
              : "nada vence em 7 dias",
          tone: "neutro",
        },
      ],
      href: "/admin/financeiro/cobrancas",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl pb-10">
      {/* `dense`: o h1 "Painel" fica pro leitor de tela, e quem vê lê a data. */}
      <AdminHeader title="Painel" dense />

      <PainelMotion>
        <div data-anim className="mb-4">
          <p className="text-2xl leading-8 font-medium tracking-tight text-neutral-900">
            {longDate(today)}
          </p>
          <p className="mt-0.5 text-sm text-neutral-500">
            {attention.length === 0 ? (
              "Nada atrasado"
            ) : (
              <>
                <span className="text-red-700">
                  {plural(attention.length, "item", "itens")}
                </span>
                {attention.length === 1 ? " pede" : " pedem"} atenção
              </>
            )}
          </p>
        </div>

        <div data-anim className="mb-3">
          <PainelStats stats={stats} />
        </div>

        {/* A mesma grade de quatro colunas e o mesmo vão dos contadores: as
            bordas dos blocos de baixo caem nas bordas dos cartões de cima.
            Tarefas ocupa duas colunas e as duas linhas, então a coluna da
            esquerda fecha na mesma altura da direita; atenção e agenda
            dividem as outras duas colunas. A faixa da semana atravessa as
            quatro. No celular tudo empilha: atenção, tarefas, agenda, semana. */}
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-4">
          <section
            aria-labelledby="tarefas-titulo"
            data-anim
            className={`rounded-lg border border-neutral-200 bg-white p-4 max-lg:order-2 lg:col-span-2 ${
              // Sem agenda não existe a segunda linha: ocupar duas deixaria o
              // bloco 12px (o vão) mais alto que o vizinho.
              account ? "lg:row-span-2" : ""
            }`}
          >
            <DailyTodoList
              todos={todos}
              users={users}
              currentUser={currentUser}
            />
          </section>

          <div data-anim className="max-lg:order-1 lg:col-span-2 [&>section]:h-full">
            <PainelAtencao items={attention} today={today} />
          </div>

          {/* Fora do Promise.all de propósito: são até cinco idas ao Google,
              e o Painel não pode esperar por elas pra existir. */}
          {account ? (
            <div
              data-anim
              className="max-lg:order-3 lg:col-span-2 lg:[&>section]:h-full"
            >
              <Suspense fallback={<TodayAgendaSkeleton />}>
                <TodayAgenda account={account} />
              </Suspense>
            </div>
          ) : null}

          <div data-anim className="max-lg:order-4 lg:col-span-4">
            <PainelSemana days={days} items={week} />
          </div>
        </div>
      </PainelMotion>
    </div>
  );
}
