import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { ClientTabs } from "@/components/admin/ClientTabs";
import { CobrarLink, ContaSelect } from "@/components/admin/ContaPix";
import { Extrato } from "@/components/admin/Extrato";
import { assertClientAllowed, getCurrentClientScope } from "@/lib/clientAccess";
import { getClientDocs } from "@/lib/clientDocs";
import { getClientMonths, getStatement } from "@/lib/dinheiro";
import { formatBRL, monthLabel } from "@/lib/billingTypes";
import { listGalleryClients } from "@/lib/galleries";
import { listInstagramUsernames } from "@/lib/instagram";
import { listClientUsers } from "@/lib/users";

export const dynamic = "force-dynamic";

const FOCO =
  "focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none";
const LINK = `inline-flex min-h-11 items-center rounded-lg border border-neutral-300 bg-white px-4 text-base text-neutral-800 hover:bg-neutral-50 ${FOCO}`;

const CONTRATO_STATUS = { draft: "Rascunho", published: "Enviado", signed: "Assinado" } as const;
const ORCAMENTO_STATUS = { draft: "Rascunho", published: "Publicado" } as const;

function Numero({ label, value, tone = "text-neutral-900", note }: { label: string; value: number; tone?: string; note?: string }) {
  return (
    <div className="min-w-0 flex-1 basis-40">
      <p className="text-sm text-neutral-600">{label}</p>
      <p className={`text-xl font-semibold tabular-nums ${tone}`}>{formatBRL(value)}</p>
      {note ? <p className="text-sm text-neutral-500">{note}</p> : null}
    </div>
  );
}

function Secao({ id, titulo, dica, children }: { id?: string; titulo: string; dica?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-8 scroll-mt-4">
      <h2 className="text-lg font-semibold text-neutral-900">{titulo}</h2>
      {dica ? <p className="mb-2 text-base text-neutral-600">{dica}</p> : <div className="mb-2" />}
      {children}
    </section>
  );
}

function Dado({ rotulo, valor }: { rotulo: string; valor: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-neutral-500">{rotulo}</dt>
      <dd className="break-words text-base text-neutral-900">{valor || <span className="text-neutral-400">não informado</span>}</dd>
    </div>
  );
}

export default async function ClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scope = await getCurrentClientScope();
  assertClientAllowed(scope, id);

  const todos = await listGalleryClients({ includeArchived: true, clientScope: scope });
  const client = todos.find((c) => c.id === id);
  if (!client) notFound();

  const [months, extrato, docs, logins, instagram] = await Promise.all([
    getClientMonths(id),
    getStatement(null, scope, id),
    getClientDocs(client),
    listClientUsers(id),
    listInstagramUsernames(),
  ]);

  const recebido = months.reduce((s, m) => s + m.receivedCents, 0);
  const aberto = months.reduce((s, m) => s + m.openCents, 0);
  const atrasado = months.reduce((s, m) => s + m.overdueCents, 0);
  const atencao = extrato.filter((r) => r.kind !== "pago").length;
  // O mais antigo em aberto: é o que está esperando há mais tempo.
  const mesAberto = months.findLast((m) => m.openCents > 0);
  const whatsapp = client.phone?.replace(/\D/g, "");
  const arroba = instagram[id];

  return (
    <div className="mx-auto w-full max-w-4xl pb-12">
      <AdminHeader
        title="Clientes"
        trail={[
          { label: "Admin", href: "/admin" },
          { label: "Clientes", href: "/admin/clientes" },
          { label: client.name },
        ]}
      />
      <div className="mb-4">
        <ClientTabs current="/admin/clientes/cadastro" />
      </div>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-neutral-900">{client.name}</h1>
          <p className="text-base text-neutral-600">
            {client.company_name || "Sem razão social"}
            {client.archived_at ? " · arquivado" : ""}
          </p>
        </div>
        <Link href={`/admin/clientes/cadastro?abrir=${client.id}`} className={LINK}>
          Editar cadastro
        </Link>
      </div>

      <nav aria-label="Seções da página do cliente" className="mb-6 flex flex-wrap gap-2 text-base">
        <a href="#financeiro" className={`rounded-lg px-3 py-2 text-neutral-700 underline ${FOCO}`}>Financeiro</a>
        <a href="#administrativo" className={`rounded-lg px-3 py-2 text-neutral-700 underline ${FOCO}`}>Administrativo</a>
      </nav>

      {/* ---------------------------------------------------- financeiro */}
      <Secao id="financeiro" titulo="Financeiro" dica="Tudo que esse cliente já pagou e ainda deve, de todos os meses.">
        <div className="mb-4 flex flex-wrap gap-x-8 gap-y-4 rounded-xl border border-neutral-200 bg-white p-4">
          <Numero label="Já recebido" value={recebido} tone="text-emerald-700" note="todos os meses" />
          <Numero label="Falta receber" value={aberto} tone={aberto ? "text-amber-700" : "text-neutral-600"} />
          <Numero label="Atrasado" value={atrasado} tone={atrasado ? "text-red-700" : "text-neutral-600"} note={atrasado ? undefined : "nada atrasado"} />
        </div>

        {aberto > 0 && mesAberto ? (
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <ContaSelect id="conta-cliente" ariaLabel="Conta que recebe o Pix" />
            <CobrarLink
              cliente={{ name: client.name, contactName: client.contact_name, phone: client.phone }}
              mesNome="os meses em aberto"
              cents={aberto}
              rotulo="Cobrar no WhatsApp"
              className={LINK}
            />
            <Link href={`/admin/clientes/dinheiro?aba=contas&mes=${mesAberto.month.slice(0, 7)}`} className={LINK}>
              Abrir o mês mais antigo em aberto
            </Link>
          </div>
        ) : null}

        <h3 className="mb-2 text-base font-semibold text-neutral-900">Mês a mês</h3>
        {months.length === 0 ? (
          <p className="mb-6 rounded-xl border border-dashed border-neutral-300 p-6 text-center text-base text-neutral-600">
            Nenhuma entrega com valor para esse cliente ainda.
          </p>
        ) : (
          <ul className="mb-6 divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
            {months.map((m) => {
              const pago = m.openCents === 0;
              return (
                <li key={m.month} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
                  <div className="min-w-0 flex-1 basis-44">
                    <p className="text-base font-medium text-neutral-900 first-letter:uppercase">{monthLabel(m.month)}</p>
                    <p className="text-sm text-neutral-500">
                      {m.items} {m.items === 1 ? "entrega" : "entregas"} · {formatBRL(m.totalCents)}
                    </p>
                  </div>
                  <span className={`text-base tabular-nums ${pago ? "text-emerald-700" : m.overdueCents ? "text-red-700" : "text-amber-700"}`}>
                    {pago
                      ? `pago ${formatBRL(m.receivedCents)}`
                      : `${m.overdueCents ? "atrasado" : "falta"} ${formatBRL(m.openCents)}`}
                  </span>
                  <Link
                    href={`/admin/clientes/dinheiro?aba=contas&mes=${m.month.slice(0, 7)}`}
                    aria-label={`Abrir ${monthLabel(m.month)} nas Contas`}
                    className={`inline-flex min-h-11 items-center rounded-lg px-3 text-base text-neutral-600 underline hover:text-neutral-900 ${FOCO}`}
                  >
                    Abrir
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <h3 className="mb-1 text-base font-semibold text-neutral-900">Extrato</h3>
        <p className="mb-2 text-base text-neutral-600">
          Cada pagamento no dia em que entrou.
          {atencao ? ` ${atencao} pedindo atenção (sem dia ou parcial).` : ""} Dá para editar, mudar a data ou desfazer.
        </p>
        {extrato.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-300 p-6 text-center text-base text-neutral-600">
            Nenhum pagamento registrado para esse cliente.
          </p>
        ) : (
          <Extrato rows={extrato} mes={null} plano />
        )}
      </Secao>

      {/* ------------------------------------------------- administrativo */}
      <Secao id="administrativo" titulo="Administrativo" dica="Cadastro, documentos e acessos desse cliente.">
        <h3 className="mb-2 text-base font-semibold text-neutral-900">Cadastro</h3>
        <dl className="mb-6 grid gap-x-8 gap-y-3 rounded-xl border border-neutral-200 bg-white p-4 sm:grid-cols-2">
          <Dado rotulo="Responsável" valor={client.contact_name} />
          <Dado
            rotulo="WhatsApp"
            valor={
              client.phone ? (
                <a href={`https://wa.me/55${whatsapp}`} target="_blank" rel="noreferrer" className="underline">
                  {client.phone}
                </a>
              ) : null
            }
          />
          <Dado rotulo="E-mail" valor={client.email} />
          <Dado rotulo="CNPJ / CPF" valor={client.document} />
          <Dado rotulo="Endereço" valor={client.address} />
          <Dado rotulo="Dia de pagamento" valor={client.payment_day ? `dia ${client.payment_day}` : null} />
          <Dado rotulo="Instagram" valor={arroba ? `@${arroba} (conectado)` : null} />
          <Dado rotulo="Cliente desde" valor={new Date(client.created_at).toLocaleDateString("pt-BR")} />
          {client.notes ? (
            <div className="sm:col-span-2">
              <dt className="text-sm text-neutral-500">Observações</dt>
              <dd className="whitespace-pre-line text-base text-neutral-900">{client.notes}</dd>
            </div>
          ) : null}
        </dl>

        <h3 className="mb-2 text-base font-semibold text-neutral-900">Contratos</h3>
        {docs.contracts.length === 0 ? (
          <p className="mb-6 rounded-xl border border-dashed border-neutral-300 p-4 text-base text-neutral-600">
            Nenhum contrato com o nome “{client.name}”. Contrato é ligado pelo nome do cliente: se foi escrito diferente, ele não aparece aqui.{" "}
            <Link href="/admin/contratos" className="underline">Ver contratos</Link>
          </p>
        ) : (
          <ul className="mb-6 divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
            {docs.contracts.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
                <span className="min-w-0 flex-1 basis-44 text-base text-neutral-900">{c.title}</span>
                <span className="text-sm text-neutral-600">
                  {CONTRATO_STATUS[c.status]}
                  {c.signed_at ? ` em ${new Date(c.signed_at).toLocaleDateString("pt-BR")}` : ""}
                </span>
                <Link href={`/admin/contratos/${c.id}`} className={`inline-flex min-h-11 items-center rounded-lg px-3 text-base text-neutral-700 underline ${FOCO}`}>
                  Abrir
                </Link>
              </li>
            ))}
          </ul>
        )}

        <h3 className="mb-2 text-base font-semibold text-neutral-900">Orçamentos</h3>
        {docs.budgets.length === 0 ? (
          <p className="mb-6 rounded-xl border border-dashed border-neutral-300 p-4 text-base text-neutral-600">
            Nenhum orçamento com o nome “{client.name}”.{" "}
            <Link href="/admin/orcamentos" className="underline">Ver orçamentos</Link>
          </p>
        ) : (
          <ul className="mb-6 divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
            {docs.budgets.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
                <span className="min-w-0 flex-1 basis-44 text-base text-neutral-900">{b.title}</span>
                <span className="text-sm text-neutral-600">{ORCAMENTO_STATUS[b.status]}</span>
                <Link href={`/admin/orcamentos/${b.id}`} className={`inline-flex min-h-11 items-center rounded-lg px-3 text-base text-neutral-700 underline ${FOCO}`}>
                  Abrir
                </Link>
              </li>
            ))}
          </ul>
        )}

        <h3 className="mb-2 text-base font-semibold text-neutral-900">Acessos e material</h3>
        <ul className="grid gap-3 sm:grid-cols-2">
          <li className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-base font-medium text-neutral-900">Área do cliente</p>
            <p className="mb-2 text-sm text-neutral-600">
              {logins.length === 0 ? "Nenhum login criado." : `${logins.length} ${logins.length === 1 ? "login" : "logins"}.`}
            </p>
            <Link href={`/admin/area-do-cliente/${client.id}`} className={LINK}>Abrir área do cliente</Link>
          </li>
          <li className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-base font-medium text-neutral-900">Galeria</p>
            <p className="mb-2 text-sm text-neutral-600">
              {client.status === "published" ? "Publicada." : "Não publicada."}
              {client.drive_folder_id ? " Pasta do Drive ligada." : ""}
            </p>
            <Link href={`/admin/galerias/${client.id}`} className={LINK}>Abrir galeria</Link>
          </li>
          <li className="rounded-xl border border-neutral-200 bg-white p-4 sm:col-span-2">
            <p className="text-base font-medium text-neutral-900">Entregas</p>
            <p className="mb-2 text-sm text-neutral-600">O quadro e o calendário mostram todos os clientes juntos.</p>
            <div className="flex flex-wrap gap-2">
              <Link href="/admin/clientes/entregas" className={LINK}>Quadro de entregas</Link>
              <Link href="/admin/clientes/entregas/calendario" className={LINK}>Calendário</Link>
            </div>
          </li>
        </ul>
      </Secao>
    </div>
  );
}
