"use server";

import { createBriefing } from "@/lib/briefings";
import { sendWhatsAppNotice } from "@/lib/whatsapp";
import { FIELDS, MAX_ANSWER_LENGTH, fieldsFor } from "./fields";

export type SubmitResult = { ok: true } | { ok: false; error: string };

export async function submitBriefingAction(
  input: Record<string, string>
): Promise<SubmitResult> {
  // O formulário é público: só entram os campos conhecidos, já cortados no
  // tamanho, e a escolha precisa ser uma das opções oferecidas.
  const servico = String(input?.servico ?? "").trim();
  const answers: Record<string, string> = {};
  for (const field of fieldsFor(FIELDS, servico)) {
    const raw = String(input?.[field.name] ?? "").trim();
    if (!raw) continue;
    if (field.type === "choice" && !field.options?.includes(raw)) continue;
    answers[field.name] = raw.slice(0, MAX_ANSWER_LENGTH);
  }

  const missing = fieldsFor(FIELDS, servico).filter((f) => f.required && !answers[f.name]);
  if (missing.length > 0) return { ok: false, error: "campos" };

  try {
    await createBriefing({
      client_name: answers.nome ?? "",
      contact: answers.contato ?? "",
      answers,
    });
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
    ].join("\n")
  );

  return { ok: true };
}
