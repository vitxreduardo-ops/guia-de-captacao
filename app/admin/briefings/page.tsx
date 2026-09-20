import Link from "next/link";
import { headers } from "next/headers";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { CopyLinkButton } from "@/components/admin/CopyLinkButton";
import { Accordion } from "@/components/Accordion";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { BRIEFING_RETENTION_DAYS, listBriefings } from "@/lib/briefings";
import { FIELDS, SERVICOS } from "@/app/briefing/fields";
import { listBriefingLinks } from "@/lib/briefingLinks";
import {
  createBriefingLinkAction,
  deleteBriefingAction,
  deleteBriefingLinkAction,
} from "./actions";

export const dynamic = "force-dynamic";

const FIELD_LABELS = Object.fromEntries(
  FIELDS.map((field) => [field.name, field.label]),
);

const CAMPO =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none";

function formatDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default async function BriefingsDashboard() {
  const [briefings, links, requestHeaders] = await Promise.all([
    listBriefings(),
    listBriefingLinks(),
    headers(),
  ]);

  // Link pronto pra colar no WhatsApp do cliente. Prod e localhost têm host
  // diferente, então ele é montado a partir do próprio pedido, não fixo.
  const origin = `https://${requestHeaders.get("host")}`.replace(
    "https://localhost",
    "http://localhost",
  );
  const formUrl = `${origin}/briefing`;

  return (
    <div className="mx-auto w-full max-w-3xl pb-10">
      <AdminHeader
        title="Briefings"
        trail={[{ label: "Admin", href: "/admin" }, { label: "Briefings" }]}
      />

      <section className="mb-8 rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="font-medium text-neutral-900">Enviar briefing</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Link do formulário pro cliente preencher.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <code className="rounded-md bg-neutral-100 px-2.5 py-1.5 text-sm break-all text-neutral-700">
            {formUrl}
          </code>
          <CopyLinkButton text={formUrl} />
          <Link
            href="/briefing"
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 transition-transform hover:border-neutral-500 active:scale-[0.97]"
          >
            Abrir
          </Link>
        </div>
      </section>

      {/* O link por cliente: o genérico acima continua valendo pra quem chega
          pelo site, mas quem já está em conversa recebe o próprio, com o que
          a gente anotou no funil já preenchido. */}
      <section className="mb-8 rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="font-medium text-neutral-900">Briefing de um cliente</h2>
        <p className="mt-1 mb-3 text-sm text-neutral-500">
          Gera um link próprio com o que já se sabe respondido. O cliente pode
          corrigir tudo — quem sabe o nome da empresa é ele.
        </p>

        <form action={createBriefingLinkAction} className="grid gap-2 sm:grid-cols-2">
          <input
            name="client_name"
            placeholder="Nome do cliente ou empresa"
            required
            className={CAMPO}
          />
          <input
            name="contact"
            placeholder="WhatsApp (só números)"
            className={CAMPO}
          />
          <select name="servico" defaultValue="" className={CAMPO} aria-label="Serviço">
            <option value="">Deixar o cliente escolher o serviço</option>
            {SERVICOS.map((servico) => (
              <option key={servico} value={servico}>
                {servico}
              </option>
            ))}
          </select>
          <input
            name="note"
            placeholder="Recado no alto do formulário (opcional)"
            className={CAMPO}
          />
          <div>
            <button
              type="submit"
              className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Gerar link
            </button>
          </div>
        </form>

        {links.length > 0 ? (
          <ul className="mt-4 space-y-2 border-t border-neutral-100 pt-4">
            {links.map((link) => {
              const url = `${origin}/briefing/${link.slug}`;
              return (
                <li
                  key={link.id}
                  className="flex flex-wrap items-center justify-between gap-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-neutral-900">
                      {link.client_name || "Sem nome"}
                      {link.servico ? (
                        <span className="font-normal text-neutral-500">
                          {" "}
                          · {link.servico}
                        </span>
                      ) : null}
                    </p>
                    {/* Aberto e respondido são coisas diferentes: sem os dois
                        não dá pra saber se o silêncio é do cliente ou do
                        WhatsApp que não entregou. */}
                    <p className="text-xs text-neutral-500">
                      {link.answered_at
                        ? `Respondido em ${formatDate(link.answered_at)}`
                        : link.opened_at
                          ? `Aberto em ${formatDate(link.opened_at)}, sem resposta`
                          : "Ainda não foi aberto"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <CopyLinkButton text={url} />
                    <form action={deleteBriefingLinkAction}>
                      <input type="hidden" name="id" value={link.id} />
                      <DeleteButton
                        confirmMessage={`Excluir o link de "${link.client_name || "sem nome"}"? Ele para de abrir.`}
                      />
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>

      <h2 className="mb-3 font-medium text-neutral-900">Briefings recebidos</h2>
      <p className="mb-4 text-sm text-neutral-500">
        Ficam guardados por {BRIEFING_RETENTION_DAYS} dias e somem sozinhos
        depois disso.
      </p>

      {briefings.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Nenhum briefing recebido ainda.
        </p>
      ) : (
        <ul className="space-y-3">
          {briefings.map((briefing) => (
            <li
              key={briefing.id}
              className="rounded-lg border border-neutral-200 bg-white"
            >
              <Accordion
                buttonClassName="p-4"
                summary={
                  <div>
                    <p className="font-medium text-neutral-900">
                      {briefing.client_name || "Sem nome"}
                    </p>
                    <p className="mt-0.5 text-sm text-neutral-500">
                      {briefing.answers.servico || "Serviço não informado"} ·{" "}
                      {briefing.contact || "sem contato"} ·{" "}
                      {formatDate(briefing.created_at)}
                    </p>
                  </div>
                }
              >
                <div className="space-y-3 border-t border-neutral-100 p-4">
                  {Object.entries(briefing.answers).map(([name, value]) => (
                    <div key={name}>
                      <p className="text-xs font-medium text-neutral-400">
                        {FIELD_LABELS[name] ?? name}
                      </p>
                      <p className="text-sm whitespace-pre-wrap text-neutral-800">
                        {value}
                      </p>
                    </div>
                  ))}

                  <form action={deleteBriefingAction} className="pt-2">
                    <input type="hidden" name="id" value={briefing.id} />
                    <DeleteButton
                      confirmMessage={`Excluir o briefing de "${briefing.client_name || "sem nome"}"? Essa ação não pode ser desfeita.`}
                    />
                  </form>
                </div>
              </Accordion>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
