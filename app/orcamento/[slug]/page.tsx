import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { getBudgetBySlugWithSections } from "@/lib/budgets";
import { BudgetSections } from "@/components/budget/BudgetSections";
import { PdfPaginas } from "@/components/budget/PdfPaginas";
import { getCurrentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

/**
 * A proposta como o cliente vê.
 *
 * A página não conhece mais as seções: ela recebe o array do orçamento e o
 * entrega ao BudgetSections, que decide o que aparece, em que ordem e de que
 * cor. Trocar a ordem ou desligar um bloco é edição de dado, não de código.
 */
/**
 * O que WhatsApp e redes sociais mostram quando o link da proposta é colado.
 * Sem isto o preview repetia o título e a descrição do site inteiro.
 */
export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const budget = await getBudgetBySlugWithSections(slug);

  if (!budget || budget.status !== "published") {
    return { title: "Orçamento · Tatú Estúdio" };
  }

  const title = `Orçamento · ${budget.client_name || budget.title}`;
  const description =
    budget.hero_subtitle || "Proposta de produção audiovisual da Tatú Estúdio.";

  // Sem bloco `openGraph` de propósito: declarar um aqui substituiria o do
  // layout inteiro e levaria junto a imagem do preview. Title e description
  // soltos já viram og:title e og:description.
  return { title, description };
}

export default async function PublicBudgetPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<{ pdf?: string }>;
}) {
  const { slug } = await params;
  const pdf = (await searchParams).pdf === "1";
  const budget = await getBudgetBySlugWithSections(slug);

  if (!budget) notFound();

  // Rascunho só sai em PDF para a equipe logada; o cliente continua sem ver.
  const session = pdf && budget.status !== "published" ? await getCurrentSession() : null;
  const equipe = session !== null && session.role !== "client";

  if (budget.status !== "published" && !equipe) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-[var(--tatu-beige)] px-4 text-center">
        <p className="text-sm text-[var(--tatu-ink)]/70">
          Este orçamento ainda não foi publicado.
        </p>
      </div>
    );
  }

  return (
    <div
      className={pdf ? "proposta-pdf" : "min-h-svh"}
      // O nome do cliente assina o canto de cada página do PDF (ver globals.css).
      style={pdf ? ({ "--pdf-cliente": JSON.stringify(budget.client_name || budget.title) } as CSSProperties) : undefined}
    >
      {pdf ? (
        <>
          {/* Slide 16:9 em vez de folha A4: proposta se apresenta na tela, e
              1280 de largura mantém o layout de desktop do site. */}
          <style>{"@page { size: 1280px 720px; margin: 0; }"}</style>
          <PdfPaginas />
        </>
      ) : null}
      <BudgetSections
        sections={budget.sections}
        clientName={budget.client_name}
      />
    </div>
  );
}
