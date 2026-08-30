import { AdminHeader } from "@/components/admin/AdminHeader";
import { Accordion } from "@/components/Accordion";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { BRIEFING_RETENTION_DAYS, listBriefings } from "@/lib/briefings";
import { FIELDS } from "@/app/briefing/fields";
import { getCurrentUsername } from "@/lib/session";
import { deleteBriefingAction } from "./actions";

export const dynamic = "force-dynamic";

const FIELD_LABELS = Object.fromEntries(
  FIELDS.map((field) => [field.name, field.label]),
);

function formatDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default async function BriefingsDashboard() {
  const [briefings, username] = await Promise.all([
    listBriefings(),
    getCurrentUsername(),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <AdminHeader
        title="Briefings"
        trail={[{ label: "Admin", href: "/admin" }, { label: "Briefings" }]}
        username={username}
      />

      <p className="mb-6 text-sm text-neutral-500">
        Respostas enviadas em /briefing. Ficam guardadas por{" "}
        {BRIEFING_RETENTION_DAYS} dias e somem sozinhas depois disso.
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
