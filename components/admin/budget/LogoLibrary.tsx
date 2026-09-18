"use client";

/* eslint-disable @next/next/no-img-element -- os logos vêm de qualquer domínio
   colado ou enviado, e a otimização do Next exige domínio declarado na config. */

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Trash2, Upload } from "lucide-react";
import {
  deleteClientLogoAction,
  listClientLogosAction,
  renameClientLogoAction,
  uploadClientLogoAction,
} from "@/app/admin/orcamentos/[id]/actions";
import type { ClientLogoRecord } from "@/lib/clientLogos";
import type { ClientLogo } from "@/lib/budgetSections";

const FOCUS_RING =
  "focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-1 focus-visible:outline-none";

/**
 * O acervo de logos de clientes, de onde a proposta escolhe.
 *
 * Nem toda marca que já passou pelo estúdio conversa com quem está pedindo o
 * orçamento, então a escolha muda de proposta para proposta — mas o acervo é o
 * mesmo. Clicar marca e desmarca; o que está marcado é o que o cliente vê.
 *
 * A proposta leva uma cópia do nome e da URL, e não uma referência ao acervo:
 * apagar um logo daqui não mexe em proposta nenhuma que já o esteja usando.
 */
export function LogoLibrary({
  budgetId,
  escolhidos,
  onChange,
}: {
  budgetId: string;
  escolhidos: ClientLogo[];
  onChange: (logos: ClientLogo[]) => void;
}) {
  const [acervo, setAcervo] = useState<ClientLogoRecord[] | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelado = false;
    listClientLogosAction()
      .then((lista) => {
        if (!cancelado) setAcervo(lista);
      })
      .catch((e) => {
        console.error("[LogoLibrary] não carregou o acervo:", e);
        if (!cancelado) setAcervo([]);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const urlsEscolhidas = new Set(escolhidos.map((l) => l.url));

  function alternar(logo: ClientLogoRecord) {
    if (urlsEscolhidas.has(logo.logo_url)) {
      onChange(escolhidos.filter((l) => l.url !== logo.logo_url));
    } else {
      onChange([...escolhidos, { name: logo.name, url: logo.logo_url }]);
    }
  }

  async function enviar(file: File) {
    setEnviando(true);
    setErro(null);

    const formData = new FormData();
    formData.append("file", file);
    // O nome do arquivo é o melhor palpite para o nome da marca, e dá para
    // corrigir depois no campo.
    formData.append("name", file.name.replace(/\.[^.]+$/, ""));

    const resultado = await uploadClientLogoAction(budgetId, formData);
    setEnviando(false);

    if ("error" in resultado) {
      setErro(resultado.error);
      return;
    }

    setAcervo((atual) => {
      const lista = atual ?? [];
      return lista.some((l) => l.id === resultado.logo.id)
        ? lista
        : [...lista, resultado.logo];
    });
    // Recém-enviado entra escolhido: quem subiu o arquivo quer usá-lo agora.
    if (!urlsEscolhidas.has(resultado.logo.logo_url)) {
      onChange([
        ...escolhidos,
        { name: resultado.logo.name, url: resultado.logo.logo_url },
      ]);
    }
  }

  /**
   * O nome é o texto alternativo da imagem na proposta, então logo sem nome é
   * logo que quem usa leitor de tela não vê. Renomear muda no acervo e nas
   * propostas que estão abertas neste editor — as já enviadas ficam como foram
   * enviadas.
   */
  function renomear(logo: ClientLogoRecord, name: string) {
    setAcervo((atual) =>
      (atual ?? []).map((l) => (l.id === logo.id ? { ...l, name } : l))
    );
    onChange(
      escolhidos.map((l) => (l.url === logo.logo_url ? { ...l, name } : l))
    );
    void renameClientLogoAction(logo.id, name);
  }

  async function apagar(logo: ClientLogoRecord) {
    const usado = urlsEscolhidas.has(logo.logo_url);
    const aviso = usado
      ? `Tirar "${logo.name || "este logo"}" da biblioteca? Ele sai também desta proposta; as outras que já o usam não mudam.`
      : `Tirar "${logo.name || "este logo"}" da biblioteca? As propostas que já o usam não mudam.`;
    if (!window.confirm(aviso)) return;

    await deleteClientLogoAction(logo.id);
    setAcervo((atual) => (atual ?? []).filter((l) => l.id !== logo.id));
    if (usado) onChange(escolhidos.filter((l) => l.url !== logo.logo_url));
  }

  return (
    <div className="space-y-2">
      {acervo === null ? (
        <p className="flex items-center gap-2 px-1 py-3 text-[11px] text-neutral-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Carregando a biblioteca…
        </p>
      ) : acervo.length === 0 ? (
        <p className="rounded-md border border-dashed border-neutral-300 px-3 py-3 text-center text-[11px] text-neutral-400">
          A biblioteca está vazia. O primeiro logo que você enviar fica guardado
          aqui para as próximas propostas.
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-1.5">
          {acervo.map((logo) => {
            const marcado = urlsEscolhidas.has(logo.logo_url);
            return (
              <li key={logo.id} className="group relative">
                <button
                  type="button"
                  onClick={() => alternar(logo)}
                  aria-pressed={marcado}
                  title={logo.name || "Sem nome"}
                  className={`flex h-16 w-full items-center justify-center rounded-md border p-2 transition ${FOCUS_RING} ${
                    marcado
                      ? "border-neutral-900 bg-neutral-50"
                      : "border-neutral-200 hover:border-neutral-400"
                  }`}
                >
                  {/* SVG entra como máscara, igual à proposta: muito logo é
                      branco, e branco sobre o fundo claro da biblioteca some.
                      Pintado, aparece qualquer que seja a cor do arquivo. */}
                  {/\.svg($|\?)/i.test(logo.logo_url) ? (
                    <span
                      role="img"
                      aria-label={logo.name || "Logo de cliente"}
                      style={{
                        maskImage: `url("${logo.logo_url}")`,
                        WebkitMaskImage: `url("${logo.logo_url}")`,
                        maskRepeat: "no-repeat",
                        WebkitMaskRepeat: "no-repeat",
                        maskPosition: "center",
                        WebkitMaskPosition: "center",
                        maskSize: "contain",
                        WebkitMaskSize: "contain",
                      }}
                      className={`block h-full w-full ${
                        marcado ? "bg-neutral-900" : "bg-neutral-400"
                      }`}
                    />
                  ) : (
                    <img
                      src={logo.logo_url}
                      alt={logo.name || "Logo de cliente"}
                      className={`max-h-full max-w-full object-contain ${
                        marcado ? "" : "opacity-50 grayscale"
                      }`}
                    />
                  )}
                  {marcado ? (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-neutral-900 text-white">
                      <Check className="h-2.5 w-2.5" />
                    </span>
                  ) : null}
                </button>

                <button
                  type="button"
                  onClick={() => apagar(logo)}
                  className={`absolute -left-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-white text-neutral-400 shadow-sm group-hover:flex hover:text-red-600 ${FOCUS_RING}`}
                >
                  <Trash2 className="h-2.5 w-2.5" />
                  <span className="sr-only">
                    Tirar {logo.name || "este logo"} da biblioteca
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {acervo && escolhidos.length > 0 ? (
        <div className="space-y-1.5 border-t border-neutral-200 pt-2">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-500">
            Nesta proposta
          </p>
          {escolhidos.map((escolhido) => {
            const noAcervo = acervo.find((l) => l.logo_url === escolhido.url);
            return (
              <div key={escolhido.url} className="flex items-center gap-1.5">
                {/\.svg($|\?)/i.test(escolhido.url) ? (
                  <span
                    aria-hidden
                    style={{
                      maskImage: `url("${escolhido.url}")`,
                      WebkitMaskImage: `url("${escolhido.url}")`,
                      maskRepeat: "no-repeat",
                      WebkitMaskRepeat: "no-repeat",
                      maskPosition: "center",
                      WebkitMaskPosition: "center",
                      maskSize: "contain",
                      WebkitMaskSize: "contain",
                    }}
                    className="block h-6 w-10 shrink-0 bg-neutral-700"
                  />
                ) : (
                  <img
                    src={escolhido.url}
                    alt=""
                    className="h-6 w-10 shrink-0 object-contain"
                  />
                )}
                <input
                  value={escolhido.name}
                  placeholder="Nome da marca"
                  onChange={(e) =>
                    noAcervo
                      ? renomear(noAcervo, e.target.value)
                      : onChange(
                          escolhidos.map((l) =>
                            l.url === escolhido.url
                              ? { ...l, name: e.target.value }
                              : l
                          )
                        )
                  }
                  className="w-full rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none"
                />
              </div>
            );
          })}
        </div>
      ) : null}

      <input
        ref={input}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void enviar(file);
        }}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={enviando}
        className={`flex items-center gap-1.5 rounded-md border border-neutral-300 px-2.5 py-1.5 text-[11px] font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 ${FOCUS_RING}`}
      >
        {enviando ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Upload className="h-3.5 w-3.5" />
        )}
        {enviando ? "Enviando…" : "Enviar logo para a biblioteca"}
      </button>

      {erro ? (
        <p role="alert" className="text-[11px] text-red-600">
          {erro}
        </p>
      ) : null}
    </div>
  );
}
