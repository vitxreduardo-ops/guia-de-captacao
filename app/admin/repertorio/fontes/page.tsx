import { AdminHeader } from "@/components/admin/AdminHeader";
import { FontesManager } from "@/components/admin/repertorio/FontesManager";
import { listFontes } from "@/lib/repertorio";
import { TEMAS_SUGERIDOS } from "@/lib/repertorioTypes";

export const dynamic = "force-dynamic";
// Adicionar fonte já lê o feed: a action pode esperar o site responder.
export const maxDuration = 60;

export default async function RepertorioFontesPage() {
  const fontes = await listFontes();
  const temas = [...new Set([...TEMAS_SUGERIDOS, ...fontes.map((f) => f.tema)])].sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col pb-10">
      <AdminHeader
        title="Fontes"
        trail={[
          { label: "Admin", href: "/admin" },
          { label: "Repertório", href: "/admin/repertorio" },
          { label: "Fontes" },
        ]}
      />

      <p className="mb-4 max-w-[60ch] text-[13px] text-neutral-500">
        Cada fonte é o feed RSS de um portal. O tema vira uma aba no Repertório: cliente novo de
        outro setor é só cadastrar as fontes dele com um tema novo. As notícias são buscadas toda
        manhã, ou na hora pelo botão.
      </p>

      <FontesManager fontes={fontes} temas={temas} />
    </div>
  );
}
