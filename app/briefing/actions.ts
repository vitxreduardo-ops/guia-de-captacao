"use server";

import { createBriefing } from "@/lib/briefings";
import { markBriefingLinkAnswered } from "@/lib/briefingLinks";
import { sendWhatsAppNotice } from "@/lib/whatsapp";
import { FIELDS, MAX_ANSWER_LENGTH, fieldsFor, telefoneValido } from "./fields";

export type SubmitResult = { ok: true } | { ok: false; error: string };

export async function submitBriefingAction(
  input: Record<string, string>,
  /** Convite de onde a resposta veio, quando o cliente entrou por link
   *  próprio. Sem ele o briefing continua chegando solto, como sempre. */
  linkSlug?: string,
): Promise<SubmitResult> {
  // O formulário é público: só entram os campos conhecidos, já cortados no
  // tamanho, e a escolha precisa ser uma das opções oferecidas.
  // Filtra contra o que já foi aceito, não contra o que chegou: assim um
  // campo condicional só entra se a resposta que o abre também for válida.
  const answers: Record<string, string> = {};
  for (const field of FIELDS) {
    if (fieldsFor([field], answers).length === 0) continue;
    const raw = String(input?.[field.name] ?? "").trim();
    if (!raw) continue;
    if (field.type === "choice" && !field.options?.includes(raw)) continue;
    answers[field.name] = raw.slice(0, MAX_ANSWER_LENGTH);
  }

  const missing = fieldsFor(FIELDS, answers).filter(
    (f) => f.required && !answers[f.name],
  );
  if (missing.length > 0) return { ok: false, error: "campos" };
  if (!telefoneValido(answers.contato ?? ""))
    return { ok: false, error: "telefone" };

  try {
    const briefing = await createBriefing({
      client_name: answers.nome ?? "",
      contact: answers.contato ?? "",
      answers,
    });

    // O vínculo com o convite vem depois e num try próprio: a resposta do
    // cliente já está salva, e perder o "de quem veio" não pode virar um erro
    // que o faz achar que precisa preencher tudo de novo.
    if (linkSlug) {
      try {
        await markBriefingLinkAnswered(linkSlug, briefing.id);
      } catch (error) {
        console.error("Falha ao amarrar briefing ao convite", error);
      }
    }
  } catch (error) {
    console.error("Falha ao salvar briefing", error);
    return { ok: false, error: "servidor" };
  }

  await sendWhatsAppNotice(
    [
      "Novo briefing recebido",
      `Cliente: ${answers.nome}`,
      `WhatsApp: ${answers.contato}`,
      `Serviço: ${answers.servico ?? "—"}`,
      `Verba: ${answers.verba ?? "—"}`,
      `Prazo: ${answers.prazo ?? "—"}`,
    ].join("\n"),
  );

  return { ok: true };
}
