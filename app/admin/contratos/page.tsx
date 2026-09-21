import Link from "next/link";
import { listContracts } from "@/lib/contracts";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { createContractAction, deleteContractAction } from "./actions";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR");
}

/** Três estados, três cores: rascunho é o que ainda é nosso, publicado é o
 *  que o cliente já consegue abrir, assinado é o que não muda mais. */
const ROTULO = {
  draft: { texto: "Rascunho", cor: "text-amber-600" },
  published: { texto: "Publicado", cor: "text-blue-600" },
  signed: { texto: "Assinado", cor: "text-emerald-600" },
} as const;

export default async function ContractsDashboard() {
  const contracts = await listContracts();

  return (
    <div className="mx-auto w-full max-w-6xl pb-10">
      <AdminHeader
        title="Contratos"
        trail={[{ label: "Admin", href: "/admin" }, { label: "Contratos" }]}
      />

      <form
        action={createContractAction}
        className="mb-8 flex flex-wrap gap-2 rounded-lg border border-neutral-200 bg-white p-4"
      >
        <input
          name="title"
          placeholder="Nome interno do contrato (ex: Contrato — Cliente X)"
          required
          className="min-w-60 flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
        {/* O tipo escolhe o modelo que preenche o corpo (0054). Trocar depois
            não reescreve o texto — daí a escolha ser aqui, no nascimento. */}
        <label className="sr-only" htmlFor="kind">
          Tipo de contrato
        </label>
        <select
          id="kind"
          name="kind"
          defaultValue="mensal"
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        >
          <option value="mensal">Mensal</option>
          <option value="freela">Projeto fechado</option>
        </select>
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Novo contrato
        </button>
      </form>

      {contracts.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Nenhum contrato ainda. O novo já nasce com as cláusulas do modelo —
          sobra preencher cliente, escopo e valor.
        </p>
      ) : (
        <ul className="space-y-3">
          {contracts.map((contract) => {
            const rotulo = ROTULO[contract.status];
            return (
              <li
                key={contract.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white p-4"
              >
                <div>
                  <Link
                    href={`/admin/contratos/${contract.id}`}
                    className="font-medium text-neutral-900 hover:underline"
                  >
                    {contract.title}
                  </Link>
                  <p className="mt-0.5 text-sm text-neutral-500">
                    {contract.client_name || "Sem cliente definido"} ·{" "}
                    {contract.kind === "mensal" ? "Mensal" : "Projeto fechado"}{" "}
                    · {formatDate(contract.created_at)} ·{" "}
                    <span className={rotulo.cor}>{rotulo.texto}</span>
                    {contract.signed_at
                      ? ` em ${formatDate(contract.signed_at)}`
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/admin/contratos/${contract.id}`}
                    className="text-sm text-neutral-600 hover:text-neutral-900"
                  >
                    {contract.status === "signed" ? "Ver" : "Editar"}
                  </Link>
                  <form action={deleteContractAction}>
                    <input type="hidden" name="id" value={contract.id} />
                    <DeleteButton
                      confirmMessage={
                        contract.status === "signed"
                          ? `"${contract.title}" foi assinado em ${formatDate(contract.signed_at ?? contract.created_at)}. Excluir apaga o registro do aceite. Continuar?`
                          : `Excluir o contrato "${contract.title}"? Essa ação não pode ser desfeita.`
                      }
                    />
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
