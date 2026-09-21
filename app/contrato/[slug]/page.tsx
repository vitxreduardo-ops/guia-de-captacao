import { notFound } from "next/navigation";
import { getContractBySlug } from "@/lib/contracts";
import { renderContractBody } from "@/lib/contractBody";
import { ContractBody } from "@/components/contract/ContractBody";
import { ContractSignForm } from "@/components/contract/ContractSignForm";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

/**
 * O contrato como o cliente vê e aceita.
 *
 * Rascunho e modelo não abrem: o primeiro ainda é nosso, o segundo não é
 * contrato de ninguém — e um modelo com link público seria um contrato em
 * branco assinável.
 */
export default async function PublicContractPage({
  params,
}: {
  params: Params;
}) {
  const { slug } = await params;
  const contract = await getContractBySlug(slug);

  if (!contract || contract.is_template) notFound();

  if (contract.status === "draft") {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[var(--tatu-beige)] px-4 text-center">
        <p className="text-sm text-[var(--tatu-ink)]/70">
          Este contrato ainda não foi publicado.
        </p>
      </div>
    );
  }

  const assinado = contract.status === "signed";
  const texto = renderContractBody(contract.body, contract);

  return (
    <div className="min-h-svh bg-[var(--tatu-beige)] px-4 py-10">
      <main className="mx-auto w-full max-w-2xl">
        <header className="mb-8">
          <p className="text-xs font-medium tracking-wide text-[var(--tatu-ink)]/60 uppercase">
            {contract.kind === "mensal"
              ? "Contrato de prestação de serviços"
              : "Contrato de projeto"}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--tatu-ink)]">
            {contract.client_name || contract.title}
          </h1>
        </header>

        <article className="rounded-lg border border-[var(--tatu-ink)]/10 bg-white p-6 sm:p-8">
          <ContractBody text={texto} />
        </article>

        <section className="mt-6 rounded-lg border border-[var(--tatu-ink)]/10 bg-white p-6">
          {assinado ? (
            <div className="text-sm text-[var(--tatu-ink)]/80">
              <p className="font-medium text-emerald-700">Contrato aceito.</p>
              <p className="mt-1">
                Por {contract.signed_name}
                {contract.signed_document
                  ? ` (${contract.signed_document})`
                  : ""}{" "}
                em{" "}
                {contract.signed_at
                  ? new Date(contract.signed_at).toLocaleString("pt-BR")
                  : "—"}
                .
              </p>
            </div>
          ) : (
            <>
              <h2 className="mb-3 text-sm font-semibold text-[var(--tatu-ink)]">
                Aceite
              </h2>
              <ContractSignForm slug={contract.slug} />
            </>
          )}
        </section>
      </main>
    </div>
  );
}
