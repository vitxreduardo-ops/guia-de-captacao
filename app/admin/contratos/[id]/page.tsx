import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getContract } from "@/lib/contracts";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { ContractPublishBox } from "@/components/admin/ContractPublishBox";
import { ContractEditor } from "@/components/admin/ContractEditor";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

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

        <ContractEditor contract={contract} />
      </div>
    </div>
  );
}
