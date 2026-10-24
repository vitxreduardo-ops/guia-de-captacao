import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { IaError, preencherComIa } from "@/lib/budgetAi";

export const maxDuration = 120;

// O limite do corpo na Vercel é 4,5 MB; o PDF vai em base64 (+33%) dentro do JSON da OpenAI.
const MAX_PDF = 3_000_000;

export async function POST(request: Request) {
  const session = await getCurrentSession();
  const liberado =
    session &&
    session.role !== "client" &&
    (session.role === "admin" ||
      session.allowedSections === null ||
      session.allowedSections.includes("orcamentos"));
  if (!liberado) return NextResponse.json({ erro: "Sessão expirada." }, { status: 401 });

  const form = await request.formData();
  const texto = String(form.get("texto") ?? "");
  const arquivo = form.get("pdf");
  const pdf = arquivo instanceof File && arquivo.size > 0 ? arquivo : null;

  if (!texto.trim() && !pdf) {
    return NextResponse.json({ erro: "Cole um texto ou escolha um PDF." }, { status: 400 });
  }
  if (pdf && (pdf.type !== "application/pdf" || pdf.size > MAX_PDF)) {
    return NextResponse.json({ erro: "O PDF precisa ter até 3 MB." }, { status: 400 });
  }

  try {
    const sections = await preencherComIa({
      texto,
      pdf: pdf
        ? { nome: pdf.name, base64: Buffer.from(await pdf.arrayBuffer()).toString("base64") }
        : undefined,
    });
    return NextResponse.json({ sections });
  } catch (error) {
    const erro = error instanceof IaError ? error.message : "Não consegui ler o material.";
    return NextResponse.json({ erro }, { status: 502 });
  }
}
