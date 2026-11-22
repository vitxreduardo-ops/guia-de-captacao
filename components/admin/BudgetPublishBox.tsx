import { headers } from "next/headers";
import { CopyLinkButton } from "@/components/admin/CopyLinkButton";
import { setBudgetStatusAction } from "@/app/admin/orcamentos/[id]/actions";
import type { BudgetWithSections } from "@/lib/budgets";

export async function BudgetPublishBox({ budget }: { budget: BudgetWithSections }) {
  const isPublished = budget.status === "published";
  const publicPath = `/orcamento/${budget.slug}`;
  // Link pronto pra colar no WhatsApp do cliente; o host vem do pedido porque
  // produção e localhost são diferentes.
  const host = (await headers()).get("host");
  const publicUrl = `${host?.startsWith("localhost") ? "http" : "https"}://${host}${publicPath}`;

  return (
    <section className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-neutral-900">
            Status:{" "}
            <span
              className={
                isPublished ? "text-emerald-600" : "text-amber-600"
              }
            >
              {isPublished ? "Publicado" : "Rascunho"}
            </span>
          </p>
          {isPublished ? (
            <a
              href={publicPath}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-neutral-500 underline hover:text-neutral-800"
            >
              {publicPath}
            </a>
          ) : (
            <p className="text-sm text-neutral-500">
              Publique para gerar o link compartilhável com o cliente.
            </p>
          )}
        </div>

        {/* Duas colunas em qualquer largura: o painel do desktop tem só 380px, e
            quatro botões em fila não cabem. Altura de toque só no celular. */}
        <div className="grid w-full grid-cols-2 gap-2 [&_a]:flex [&_a]:items-center [&_a]:justify-center [&_a]:text-center [&_a]:min-h-11 [&_button]:min-h-11 lg:[&_a]:min-h-0 lg:[&_button]:min-h-0">
          {isPublished ? <CopyLinkButton text={publicUrl} /> : null}
          <a
            href={publicPath}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            Ver proposta
          </a>
          <a
            href={`${publicPath}?pdf=1`}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            Baixar PDF
          </a>
          <form action={setBudgetStatusAction} className="contents">
            <input type="hidden" name="id" value={budget.id} />
            <input
              type="hidden"
              name="status"
              value={isPublished ? "draft" : "published"}
            />
            <button
              type="submit"
              className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
            >
              {isPublished ? "Voltar para rascunho" : "Publicar"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
