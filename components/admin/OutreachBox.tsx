"use client";

import { useMemo, useState } from "react";
import {
  ANGLE_LABELS,
  outreachVars,
  renderOutreach,
  suggestAngle,
  type OutreachTemplate,
} from "@/lib/outreachText";
import { instagramHandle, type RadarCompany } from "@/lib/prospectTypes";

/**
 * A primeira mensagem, montada a partir do que o Radar já sabe.
 *
 * Mesma escolha do follow-up: abre com o texto pronto, não com uma lista.
 * A diferença é o gatilho — aqui o que decide é o que se sabe da empresa
 * (veio por indicação? posta?), porque é isso que faz a mensagem parecer
 * escrita pra ela e não disparada pra mil.
 */
export function OutreachBox({
  company,
  templates,
}: {
  company: RadarCompany;
  templates: OutreachTemplate[];
}) {
  const angulo = useMemo(() => suggestAngle(company), [company]);
  const inicial = templates.find((t) => t.angle === angulo) ?? templates[0];

  const [templateId, setTemplateId] = useState(inicial?.id ?? "");
  const escolhido =
    templates.find((t) => t.id === templateId) ?? inicial ?? null;

  const gerado = useMemo(
    () =>
      escolhido ? renderOutreach(escolhido.body, outreachVars(company)) : "",
    [escolhido, company]
  );

  const [editado, setEditado] = useState<string | null>(null);
  const texto = editado ?? gerado;
  const [copiado, setCopiado] = useState(false);

  const handle = instagramHandle(company.instagram);

  if (templates.length === 0) return null;

  return (
    <div className="mt-2 space-y-2 rounded-md border border-neutral-200 bg-neutral-50 p-3">
      <p className="text-[12px] text-neutral-500">
        Sugestão: {ANGLE_LABELS[angulo]}.
      </p>

      <label className="sr-only" htmlFor={`abordagem-${company.id}`}>
        Modelo de abordagem
      </label>
      <select
        id={`abordagem-${company.id}`}
        value={escolhido?.id ?? ""}
        onChange={(event) => {
          setTemplateId(event.target.value);
          setEditado(null);
        }}
        className="w-full rounded border border-neutral-300 bg-white px-2 py-1.5 text-[13px] focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none"
      >
        {templates.map((template) => (
          <option key={template.id} value={template.id}>
            {template.name}
            {template.angle === angulo ? " · sugerido" : ""}
          </option>
        ))}
      </select>

      <textarea
        key={escolhido?.id ?? "vazio"}
        rows={8}
        defaultValue={gerado}
        onChange={(event) => setEditado(event.target.value)}
        aria-label="Mensagem de abordagem"
        className="w-full rounded border border-neutral-300 bg-white px-2 py-1.5 text-[13px] leading-relaxed focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none"
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(texto);
              setCopiado(true);
            } catch {
              setCopiado(false);
            }
            setTimeout(() => setCopiado(false), 2000);
          }}
          className="min-h-10 rounded border border-neutral-300 bg-white px-2.5 text-[13px] text-neutral-700 hover:bg-neutral-50 sm:min-h-0 sm:py-1"
        >
          {copiado ? "Copiado!" : "Copiar"}
        </button>

        {/* O Instagram não abre a conversa por link; o que dá é chegar no
            perfil com a mensagem já copiada. */}
        {handle ? (
          <a
            href={`https://instagram.com/${handle}`}
            target="_blank"
            rel="noreferrer"
            className="min-h-10 rounded border border-neutral-300 bg-white px-2.5 text-[13px] leading-10 text-neutral-700 hover:bg-neutral-50 sm:min-h-0 sm:leading-7"
          >
            Abrir @{handle}
          </a>
        ) : null}
      </div>
    </div>
  );
}
