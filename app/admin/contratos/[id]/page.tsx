import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getContract } from "@/lib/contracts";
import { renderContractBody } from "@/lib/contractBody";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { ContractPublishBox } from "@/components/admin/ContractPublishBox";
import { ContractBody } from "@/components/contract/ContractBody";
import { updateContractAction } from "./actions";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

const campo =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none disabled:bg-neutral-100 disabled:text-neutral-500";
const rotulo = "mb-1 block text-xs font-medium text-neutral-600";

export default async function ContractEditPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const contract = await getContract(id);

  if (!contract) notFound();

  // O link que o cliente recebe tem que ser absoluto. O host vem do pedido
  // porque em dev é localhost, em produção é o domínio — e fixar um dos dois
  // quebra o outro.
  const cabecalhos = await headers();
  const host = cabecalhos.get("host") ?? "";
  const protocolo = host.startsWith("localhost") ? "http" : "https";
  const baseUrl = host ? `${protocolo}://${host}` : "";

  const travado = contract.status === "signed";
  const preview = renderContractBody(contract.body, contract);

  return (
    <div className="mx-auto w-full max-w-[1400px] pb-10">
      <AdminHeader
        title={contract.title}
        dense
        trail={[
          { label: "Admin", href: "/admin" },
          { label: "Contratos", href: "/admin/contratos" },
        ]}
      />

      <div className="space-y-4">
        <ContractPublishBox contract={contract} baseUrl={baseUrl} />

        <div className="grid gap-4 lg:grid-cols-2">
          <form
            action={updateContractAction}
            className="space-y-6 rounded-lg border border-neutral-200 bg-white p-4"
          >
            <input type="hidden" name="id" value={contract.id} />

            {travado ? (
              <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                Contrato assinado. O texto não muda mais — para alterar algo,
                crie um novo contrato.
              </p>
            ) : null}

            <fieldset disabled={travado} className="space-y-6">
              <div>
                <h2 className="mb-3 text-sm font-semibold text-neutral-900">
                  Contrato
                </h2>
                <div className="space-y-3">
                  <div>
                    <label className={rotulo} htmlFor="title">
                      Nome interno (não aparece para o cliente)
                    </label>
                    <input
                      id="title"
                      name="title"
                      defaultValue={contract.title}
                      required
                      className={campo}
                    />
                  </div>
                  <div>
                    <label className={rotulo} htmlFor="kind">
                      Tipo
                    </label>
                    <select
                      id="kind"
                      name="kind"
                      defaultValue={contract.kind}
                      className={campo}
                    >
                      <option value="mensal">Mensal</option>
                      <option value="freela">Projeto fechado</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="mb-3 text-sm font-semibold text-neutral-900">
                  Quem contrata
                </h2>
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className={rotulo} htmlFor="client_name">
                        Nome ou razão social
                      </label>
                      <input
                        id="client_name"
                        name="client_name"
                        defaultValue={contract.client_name}
                        className={campo}
                      />
                    </div>
                    <div>
                      <label className={rotulo} htmlFor="client_document">
                        CNPJ ou CPF
                      </label>
                      <input
                        id="client_document"
                        name="client_document"
                        defaultValue={contract.client_document}
                        className={campo}
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className={rotulo} htmlFor="client_email">
                        E-mail
                      </label>
                      <input
                        id="client_email"
                        name="client_email"
                        type="email"
                        defaultValue={contract.client_email}
                        className={campo}
                      />
                    </div>
                    <div>
                      <label className={rotulo} htmlFor="client_address">
                        Endereço
                      </label>
                      <input
                        id="client_address"
                        name="client_address"
                        defaultValue={contract.client_address}
                        className={campo}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="mb-3 text-sm font-semibold text-neutral-900">
                  O combinado
                </h2>
                <div className="space-y-3">
                  <div>
                    <label className={rotulo} htmlFor="scope">
                      Escopo — vira {"{{escopo}}"} no texto
                    </label>
                    <textarea
                      id="scope"
                      name="scope"
                      rows={4}
                      defaultValue={contract.scope}
                      placeholder="Quatro vídeos por mês, roteiro e edição inclusos."
                      className={campo}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className={rotulo} htmlFor="price">
                        Valor (R$)
                      </label>
                      <input
                        id="price"
                        name="price"
                        inputMode="decimal"
                        defaultValue={
                          contract.price > 0 ? String(contract.price) : ""
                        }
                        className={campo}
                      />
                    </div>
                    <div>
                      <label className={rotulo} htmlFor="start_date">
                        Início
                      </label>
                      <input
                        id="start_date"
                        name="start_date"
                        type="date"
                        defaultValue={contract.start_date ?? ""}
                        className={campo}
                      />
                    </div>
                    <div>
                      <label className={rotulo} htmlFor="duration_months">
                        Duração (meses)
                      </label>
                      <input
                        id="duration_months"
                        name="duration_months"
                        type="number"
                        min={1}
                        defaultValue={contract.duration_months ?? ""}
                        className={campo}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={rotulo} htmlFor="payment_terms">
                      Condições de pagamento — vira {"{{pagamento}}"}
                    </label>
                    <textarea
                      id="payment_terms"
                      name="payment_terms"
                      rows={3}
                      defaultValue={contract.payment_terms}
                      placeholder="Pagamento todo dia 5, por PIX."
                      className={campo}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h2 className="mb-3 text-sm font-semibold text-neutral-900">
                  Cláusulas
                </h2>
                <textarea
                  id="body"
                  name="body"
                  rows={20}
                  defaultValue={contract.body}
                  className={`${campo} font-mono text-xs leading-relaxed`}
                />
                <p className="mt-1 text-xs text-neutral-500">
                  Markdown: <code>##</code> abre uma cláusula,{" "}
                  <code>**texto**</code> fica em negrito. As chaves duplas são
                  trocadas pelos campos acima na hora de exibir.
                </p>
              </div>

              <button
                type="submit"
                className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Salvar contrato
              </button>
            </fieldset>
          </form>

          {/* O mesmo componente da página pública: o que aparece aqui é o que
              o cliente vê, sem uma segunda cópia do desenho pra divergir. */}
          <div className="rounded-lg border border-neutral-200 bg-[var(--tatu-beige)] p-6">
            <p className="mb-4 text-xs font-medium tracking-wide text-neutral-500 uppercase">
              Como o cliente vê
            </p>
            {contract.body.trim() ? (
              <ContractBody text={preview} />
            ) : (
              <p className="text-sm text-neutral-500">
                O corpo está vazio. Escreva as cláusulas ao lado.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
