import { NextResponse, type NextRequest } from "next/server";
import { downloadZip } from "client-zip";
import { getPublishedGalleryImagesByIds, type GalleryImage } from "@/lib/galleries";
import { fetchDriveFileBytes } from "@/lib/googleDrive";

/**
 * Download em lote da galeria pública: recebe os ids escolhidos no modo de
 * seleção e devolve um .zip.
 *
 * É POST e recebe form-urlencoded de propósito — o navegador navega pro
 * endpoint e trata a resposta como download normal, sem precisar juntar o
 * arquivo inteiro na memória do cliente (uma seleção grande pode passar de
 * 1 GB). Os arquivos entram no zip um de cada vez, conforme chegam do Drive.
 */

export const dynamic = "force-dynamic";
// A montagem do zip é streaming: nada de esperar todos os arquivos chegarem
// do Drive antes de responder.
export const maxDuration = 300;

/** Nome de arquivo seguro dentro do zip, preservando a estrutura de pastas
 * do Drive (ex: "02.FEVEREIRO/FOTOS/foto.jpg"). */
function zipEntryName(image: GalleryImage, used: Set<string>): string {
  const folder = (image.drive_relative_path ?? "")
    .split("/")
    .map((segment) => segment.replace(/[\\:*?"<>|]/g, "-").trim())
    .filter(Boolean)
    .join("/");
  const base =
    image.caption.replace(/[\\/:*?"<>|]/g, "-").trim() || `arquivo-${image.id}`;

  let name = folder ? `${folder}/${base}` : base;
  if (used.has(name)) {
    // Dois arquivos com o mesmo nome na mesma pasta quebram o zip em alguns
    // extratores — desempata com um sufixo.
    const dot = name.lastIndexOf(".");
    const stem = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : "";
    let counter = 2;
    while (used.has(`${stem} (${counter})${ext}`)) counter += 1;
    name = `${stem} (${counter})${ext}`;
  }
  used.add(name);
  return name;
}

async function* zipEntries(images: GalleryImage[], signal: AbortSignal) {
  const used = new Set<string>();

  for (const image of images) {
    if (signal.aborted) return;

    const name = zipEntryName(image, used);
    const lastModified = new Date(
      image.drive_modified_time ?? image.created_at
    );

    if (image.drive_file_id) {
      const file = await fetchDriveFileBytes(image.drive_file_id, null, signal);
      // Arquivo que sumiu do Drive (ou perdeu o acesso) é pulado — melhor
      // entregar o resto da seleção do que derrubar o zip inteiro.
      if (!file) continue;
      yield { name, input: file.body, lastModified };
      continue;
    }

    const response = await fetch(image.image_url, { signal });
    if (!response.ok || !response.body) continue;
    yield { name, input: response.body, lastModified };
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const formData = await request.formData();
  const ids = String(formData.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (ids.length === 0) {
    return NextResponse.json(
      { error: "Nenhum arquivo selecionado" },
      { status: 400 }
    );
  }

  const found = await getPublishedGalleryImagesByIds(slug, ids);
  if (!found || found.images.length === 0) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  const zip = downloadZip(zipEntries(found.images, request.signal));

  const asciiName =
    found.client.name
      .normalize("NFKD")
      .replace(/[^\x20-\x7E]/g, "")
      .replace(/"/g, "")
      .trim() || "galeria";
  const fileName = `${found.client.name} (${found.images.length} arquivos).zip`;

  const headers = new Headers(zip.headers);
  headers.set("Content-Type", "application/zip");
  headers.set("Cache-Control", "no-store");
  headers.set(
    "Content-Disposition",
    `attachment; filename="${asciiName}.zip"; filename*=UTF-8''${encodeURIComponent(fileName)}`
  );

  return new NextResponse(zip.body, { status: 200, headers });
}
