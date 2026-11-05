import { notFound } from "next/navigation";
import { PageEditor } from "@/components/notion/PageEditor";
import { getPage, listPages } from "@/lib/notion";

export const dynamic = "force-dynamic";

export default async function NotaPage({ params }: PageProps<"/admin/notas/[id]">) {
  const { id } = await params;
  const [page, pages] = await Promise.all([getPage(id), listPages()]);
  if (!page) notFound();
  // key: trocar de página remonta o editor com o conteúdo novo.
  return <PageEditor key={page.id} page={page} pages={pages} />;
}
