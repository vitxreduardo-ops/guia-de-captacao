import { setContractStatusAction } from "@/app/admin/contratos/[id]/actions";
import { missingContractVars } from "@/lib/contractBody";
import type { Contract } from "@/lib/contracts";
import { CopyLinkButton } from "@/components/admin/CopyLinkButton";

const RECADO = {
  cliente: "cliente",
  documento: "documento do cliente",
  escopo: "escopo",
  valor: "valor",
  pagamento: "condições de pagamento",
  inicio: "data de início",
  meses: "duração em meses",
} as const;

export function ContractPublishBox({
  contract,
  baseUrl,
}: {
  contract: Contract;
  /** Vem do servidor pra que o botão copie um link que abre fora daqui, e
   *  não um caminho solto que só funciona colado na barra deste navegador. */
  baseUrl: string;
}) {
  const caminho = `/contrato/${contract.slug}`;
  const assinado = contract.status === "signed";
  const publicado = contract.status === "published";
  const faltando = missingContractVars(contract.body, contract);

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-neutral-900">
            Status:{" "}
            <span
              className={
                assinado
                  ? "text-emerald-600"
                  : publicado
                    ? "text-blue-600"
                    : "text-amber-600"
              }
            >
              {assinado ? "Assinado" : publicado ? "Publicado" : "Rascunho"}
            </span>
          </p>

          {assinado ? (
            <p className="mt-0.5 text-sm text-neutral-500">
              Aceito por {contract.signed_name || "—"}
              {contract.signed_document ? ` (${contract.signed_document})` : ""}{" "}
              em{" "}
              {contract.signed_at
                ? new Date(contract.signed_at).toLocaleString("pt-BR")
                : "—"}
              .
            </p>
          ) : publicado ? (
            <a
              href={caminho}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-neutral-500 underline hover:text-neutral-800"
            >
              {caminho}
            </a>
          ) : (
            <p className="mt-0.5 text-sm text-neutral-500">
              Publique para gerar o link que o cliente abre e aceita.
            </p>
          )}

          {/* Campo vazio deixa `{{valor}}` visível no texto — o aviso aqui é
              pra descobrir isso antes de mandar, não depois. */}
          {!assinado && faltando.length > 0 ? (
            <p className="mt-2 text-sm text-amber-700">
              Ainda em branco no texto:{" "}
              {faltando
                .map((chave) => RECADO[chave as keyof typeof RECADO] ?? chave)
                .join(", ")}
              .
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={caminho}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            Ver contrato
          </a>

          {publicado || assinado ? (
            <CopyLinkButton text={`${baseUrl}${caminho}`} />
          ) : null}

          {/* Assinado não tem botão: voltar pra rascunho e reescrever deixaria
              o aceite apontando pra um texto que não existe mais. */}
          {assinado ? null : (
            <form action={setContractStatusAction}>
              <input type="hidden" name="id" value={contract.id} />
              <input
                type="hidden"
                name="status"
                value={publicado ? "draft" : "published"}
              />
              <button
                type="submit"
                className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
              >
                {publicado ? "Voltar para rascunho" : "Publicar"}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
