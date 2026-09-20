"use client";

import { useMemo, useState } from "react";
import {
  daysSinceTouch,
  followupVars,
  renderFollowup,
  SITUATION_LABELS,
  suggestSituation,
  whatsappLink,
  type FollowupTemplate,
} from "@/lib/followupText";
import type { ProspectRow } from "@/lib/prospectTypes";

/**
 * O gerador de follow-up dentro da ficha.
 *
 * Ele abre já com o modelo provável escolhido, e não com uma lista pra
 * decidir: quem abriu isto está olhando um contato parado há duas semanas e a
 * decisão que trava não é qual modelo usar, é começar a escrever. Trocar o
 * modelo continua a um clique.
 *
 * O texto fica editável de propósito. Modelo é ponto de partida — mandar o
 * texto genérico sem uma linha do que foi conversado é o que faz follow-up
 * parecer robô, e aí é melhor não mandar.
 */
export function FollowupBox({
  prospect,
  templates,
}: {
  prospect: ProspectRow;
  templates: FollowupTemplate[];
}) {
  const dias = useMemo(
    () => daysSinceTouch(prospect.last_touch_at),
    [prospect.last_touch_at]
  );
  const sugerida = useMemo(
    () => suggestSituation(prospect, dias),
    [prospect, dias]
  );

  // O sugerido é o primeiro da situação provável; sem modelo pra ela, cai no
  // primeiro que existir, que ainda é melhor do que a tela vazia.
  const inicial =
    templates.find((t) => t.situation === sugerida) ?? templates[0];

  const [templateId, setTemplateId] = useState(inicial?.id ?? "");
  const escolhido =
    templates.find((t) => t.id === templateId) ?? inicial ?? null;

  const gerado = useMemo(
    () =>
      escolhido
        ? renderFollowup(escolhido.body, followupVars(prospect, dias))
        : "",
    [escolhido, prospect, dias]
  );

  // `key` no textarea: trocar de modelo tem que trocar o texto à vista, e um
  // `defaultValue` sozinho não reage. Com `key`, o React remonta o campo.
  const [editado, setEditado] = useState<string | null>(null);
  const texto = editado ?? gerado;

  const [copiado, setCopiado] = useState(false);
  const link = whatsappLink(prospect.phone, texto);

  if (templates.length === 0) {
    return (
      <section>
        <h2 className="mb-2 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
          Follow-up
        </h2>
        <p className="rounded-lg border border-neutral-200 px-3 py-2 text-[13px] text-neutral-500">
          Nenhum modelo cadastrado ainda.
        </p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold tracking-wide text-neutral-400 uppercase">
        Follow-up
      </h2>

      <div className="space-y-2 rounded-lg border border-neutral-200 p-3">
        <p className="text-[13px] text-neutral-500">
          {dias === null
            ? "Nenhum contato registrado ainda."
            : `Último registro faz ${dias} ${dias === 1 ? "dia" : "dias"}.`}{" "}
          Sugestão: {SITUATION_LABELS[sugerida]}.
        </p>

        <label className="sr-only" htmlFor="followup-template">
          Modelo de follow-up
        </label>
        <select
          id="followup-template"
          value={escolhido?.id ?? ""}
          onChange={(event) => {
            setTemplateId(event.target.value);
            // O que a pessoa escreveu era sobre o outro modelo: manter faria
            // a troca não mudar nada na tela.
            setEditado(null);
          }}
          className="w-full rounded-md border border-neutral-300 px-2.5 py-2 text-base sm:py-1.5 sm:text-sm focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none"
        >
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
              {template.situation === sugerida ? " · sugerido" : ""}
            </option>
          ))}
        </select>

        <textarea
          key={escolhido?.id ?? "vazio"}
          rows={9}
          defaultValue={gerado}
          onChange={(event) => setEditado(event.target.value)}
          aria-label="Mensagem do follow-up"
          className="w-full rounded-md border border-neutral-300 px-2.5 py-2 text-[13px] leading-relaxed focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none"
        />

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(texto);
                setCopiado(true);
              } catch {
                // Safari recusa a área de transferência mesmo no clique; sem
                // plano B o botão simplesmente não faz nada.
                setCopiado(false);
              }
              setTimeout(() => setCopiado(false), 2000);
            }}
            className="inline-flex min-h-10 items-center rounded-md border border-neutral-300 px-3 text-sm text-neutral-700 hover:bg-neutral-50 sm:min-h-0 sm:py-1.5"
          >
            {copiado ? "Copiado!" : "Copiar"}
          </button>

          {link ? (
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-10 items-center rounded-md bg-neutral-900 px-3 text-sm font-medium text-white hover:bg-neutral-800 sm:min-h-0 sm:py-1.5"
            >
              Abrir no WhatsApp
            </a>
          ) : (
            <span className="text-xs text-neutral-500">
              Sem telefone na ficha — dá pra copiar e colar.
            </span>
          )}
        </div>

        <p className="text-xs text-neutral-500">
          Depois de mandar, registre no “Falei” pra reagendar o próximo passo.
        </p>
      </div>
    </section>
  );
}
