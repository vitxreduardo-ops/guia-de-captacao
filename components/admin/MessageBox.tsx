"use client";

import { useMemo, useState } from "react";
import {
  pickTemplate,
  renderMessage,
  SITUATION_LABELS,
  whatsappLink,
  type MessageTemplate,
  type MessageVars,
  type Situation,
} from "@/lib/messageText";

/**
 * A caixa de escrever, igual nos dois lugares — ficha do contato e empresa do
 * Radar. A diferença entre eles é só o que alimenta as variáveis.
 *
 * Abre com o texto pronto, não com uma lista pra escolher: quem abriu isto
 * não trava em qual modelo usar, trava em começar a escrever. Trocar de
 * modelo continua a um clique.
 *
 * O texto fica editável de propósito. Modelo é ponto de partida — mandar o
 * genérico sem uma linha do que foi conversado é o que faz a mensagem parecer
 * robô, e aí é melhor não mandar.
 */
export function MessageBox({
  templates,
  suggested,
  vars,
  phone = "",
  profileUrl,
  hint,
  compact = false,
  storageKey,
}: {
  templates: MessageTemplate[];
  suggested: Situation;
  vars: MessageVars;
  phone?: string;
  /** Instagram da empresa: o WhatsApp nem sempre existe no Radar. */
  profileUrl?: string;
  /** Linha de contexto acima do seletor (dias parados, por exemplo). */
  hint?: string;
  compact?: boolean;
  /** Distingue o `id` dos campos quando há várias caixas na mesma página. */
  storageKey: string;
}) {
  const inicial = useMemo(
    () => pickTemplate(templates, suggested, vars),
    [templates, suggested, vars]
  );

  const [templateId, setTemplateId] = useState(inicial?.id ?? "");
  const escolhido =
    templates.find((t) => t.id === templateId) ?? inicial ?? null;

  const gerado = useMemo(
    () => (escolhido ? renderMessage(escolhido.body, vars) : ""),
    [escolhido, vars]
  );

  const [editado, setEditado] = useState<string | null>(null);
  const texto = editado ?? gerado;
  const [copiado, setCopiado] = useState(false);
  const link = whatsappLink(phone, texto);

  if (templates.length === 0) {
    return (
      <p className="rounded-lg border border-neutral-200 px-3 py-2 text-[13px] text-neutral-500">
        Nenhum modelo cadastrado ainda.
      </p>
    );
  }

  const campo = compact
    ? "w-full rounded border border-neutral-300 bg-white px-2 py-1.5 text-[13px] focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none"
    : "w-full rounded-md border border-neutral-300 px-2.5 py-2 text-base sm:py-1.5 sm:text-sm focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none";

  return (
    <div
      className={
        compact
          ? "mt-2 space-y-2 rounded-md border border-neutral-200 bg-neutral-50 p-3"
          : "space-y-2 rounded-lg border border-neutral-200 p-3"
      }
    >
      <p className="text-[12px] text-neutral-500">
        {hint ? `${hint} ` : ""}
        Sugestão: {SITUATION_LABELS[suggested]}.
      </p>

      <label className="sr-only" htmlFor={`modelo-${storageKey}`}>
        Modelo de mensagem
      </label>
      <select
        id={`modelo-${storageKey}`}
        value={escolhido?.id ?? ""}
        onChange={(event) => {
          setTemplateId(event.target.value);
          // O que a pessoa escreveu era sobre o outro modelo: manter faria a
          // troca não mudar nada na tela.
          setEditado(null);
        }}
        className={campo}
      >
        {templates.map((template) => (
          <option key={template.id} value={template.id}>
            {template.name}
            {template.situation === suggested ? " · sugerido" : ""}
          </option>
        ))}
      </select>

      {/* `key` no textarea: trocar de modelo tem que trocar o texto à vista, e
          `defaultValue` sozinho não reage. Com `key`, o React remonta. */}
      <textarea
        key={escolhido?.id ?? "vazio"}
        rows={compact ? 8 : 9}
        defaultValue={gerado}
        onChange={(event) => setEditado(event.target.value)}
        aria-label="Mensagem"
        className={`${campo} leading-relaxed`}
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
          className="min-h-10 rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-700 hover:bg-neutral-50 sm:min-h-0 sm:py-1.5"
        >
          {copiado ? "Copiado!" : "Copiar"}
        </button>

        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="min-h-10 rounded-md bg-neutral-900 px-3 text-sm font-medium leading-10 text-white hover:bg-neutral-800 sm:min-h-0 sm:py-1.5 sm:leading-7"
          >
            Abrir no WhatsApp
          </a>
        ) : null}

        {/* O Instagram não abre a conversa por link; o que dá é chegar no
            perfil com a mensagem já copiada. */}
        {profileUrl ? (
          <a
            href={profileUrl}
            target="_blank"
            rel="noreferrer"
            className="min-h-10 rounded-md border border-neutral-300 bg-white px-3 text-sm leading-10 text-neutral-700 hover:bg-neutral-50 sm:min-h-0 sm:py-1.5 sm:leading-7"
          >
            Abrir perfil
          </a>
        ) : null}

        {!link && !profileUrl ? (
          <span className="text-xs text-neutral-500">
            Sem telefone nem perfil — dá pra copiar e colar.
          </span>
        ) : null}
      </div>
    </div>
  );
}
