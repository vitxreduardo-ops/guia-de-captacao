import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { House, LayoutList } from "lucide-react";
import { getMindMap, listClientOptions } from "@/lib/mindMaps";
import { requireTeam } from "@/lib/session";
import { AutoSubmitSelect } from "@/components/admin/AutoSubmitSelect";
import { CopyLinkButton } from "@/components/admin/CopyLinkButton";
import { MindMapView } from "@/components/mindmap/MindMapView";
import {
  saveMindMapAction,
  setMindMapClientAction,
  setMindMapStatusAction,
} from "@/app/admin/mapas/actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mapa mental · Tatú Estúdio" };

/**
 * O editor em tela cheia, fora do layout do admin: sem barra lateral, só o
 * mapa e uma faixa fina de comandos. Mora fora de /admin de propósito (o
 * layout do admin envolveria tudo); a proteção é o requireTeam daqui.
 */
export default async function MindMapEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireTeam("mapas");
  const { id } = await params;
  const [map, clients] = await Promise.all([getMindMap(id), listClientOptions()]);
  if (!map) notFound();

  // Prod e localhost têm host diferente: o link sai do próprio pedido.
  const host = (await headers()).get("host");
  const origin = `https://${host}`.replace("https://localhost", "http://localhost");
  const published = map.status === "published";
  const publicPath = `/mapa/${map.slug}`;

  const bar =
    "flex h-8 items-center gap-1.5 rounded-md px-2 text-sm text-[#2f3b1e]/80 hover:bg-[#838059]/15 hover:text-[#2f3b1e]";

  return (
    <div className="flex h-svh flex-col bg-white text-[#2f3b1e]">
      <header className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-[#838059]/25 bg-[#e4e6d6] px-3 py-2">
        <Link href="/admin" className={bar}>
          <House className="size-4" /> Início
        </Link>
        <Link href="/admin/mapas" className={bar}>
          <LayoutList className="size-4" /> Mapas
        </Link>
        <span className="mx-1 hidden h-4 w-px bg-[#838059]/30 sm:block" />
        <h1 className="min-w-0 flex-1 truncate text-sm font-medium">{map.title}</h1>

        <form action={setMindMapClientAction}>
          <input type="hidden" name="id" value={map.id} />
          <AutoSubmitSelect
            name="client_id"
            defaultValue={map.client_id ?? ""}
            className="h-8 rounded-md border border-[#838059]/30 bg-[#fff6e3] px-2 text-sm text-[#2f3b1e]"
          >
            <option value="">Sem cliente</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </AutoSubmitSelect>
        </form>

        <span className={`text-sm ${published ? "text-emerald-700" : "text-amber-700"}`}>
          {published ? "Publicado" : "Rascunho"}
        </span>
        {published && (
          <>
            <a
              href={publicPath}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-[#838059]/30 px-3 py-1 text-sm hover:bg-[#838059]/15"
            >
              Apresentar
            </a>
            <CopyLinkButton
              text={`${origin}${publicPath}`}
              className="border-[#838059]/30 py-1 text-[#2f3b1e] hover:bg-[#838059]/15 hover:border-[#838059]/30"
            />
          </>
        )}
        <form action={setMindMapStatusAction}>
          <input type="hidden" name="id" value={map.id} />
          <input type="hidden" name="status" value={published ? "draft" : "published"} />
          <button
            type="submit"
            className="rounded-md bg-[#2f3b1e] px-3 py-1 text-sm font-medium text-[#fff6e3] hover:bg-[#2f3b1e]/90"
          >
            {published ? "Despublicar" : "Publicar"}
          </button>
        </form>
      </header>

      <div className="min-h-0 flex-1">
        <MindMapView
          full
          initial={map.root}
          onSave={saveMindMapAction.bind(null, map.id)}
        />
      </div>
    </div>
  );
}
