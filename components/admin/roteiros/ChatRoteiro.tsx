"use client";

import { useEffect, useRef, useState } from "react";
import { conversarAction } from "@/app/admin/roteiros/actions";

type Mensagem = { role: "user" | "assistant"; content: string };

// A conversa fica neste navegador por 24h e depois some sozinha. Não vai pro
// banco: é rascunho de ideia, não registro.
const CHAVE = "roteiros-chat";
const VALIDADE_MS = 24 * 60 * 60 * 1000;

function lerConversa(): Mensagem[] {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) ?? "null");
    if (!salvo || Date.now() - salvo.salvoEm > VALIDADE_MS) return [];
    return Array.isArray(salvo.mensagens) ? salvo.mensagens : [];
  } catch {
    return [];
  }
}

function gravarConversa(mensagens: Mensagem[]) {
  try {
    if (mensagens.length === 0) localStorage.removeItem(CHAVE);
    // O prazo conta da última mensagem: conversa em uso não expira no meio.
    else localStorage.setItem(CHAVE, JSON.stringify({ salvoEm: Date.now(), mensagens }));
  } catch {
    // Sem armazenamento (aba anônima, bloqueio): a conversa só não sobrevive ao recarregar.
  }
}

export default function ChatRoteiro() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const fimRef = useRef<HTMLDivElement>(null);

  // Lido depois de montar: no servidor não existe localStorage, e ler no
  // primeiro render daria HTML diferente entre servidor e navegador.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMensagens(lerConversa());
  }, []);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ block: "end" });
  }, [mensagens, carregando]);

  async function enviar() {
    const conteudo = texto.trim();
    if (!conteudo || carregando) return;

    const novas: Mensagem[] = [...mensagens, { role: "user", content: conteudo }];
    setMensagens(novas);
    gravarConversa(novas);
    setTexto("");
    setErro(null);
    setCarregando(true);
    try {
      const res = await conversarAction(novas);
      if (!res.ok) {
        setErro(res.error);
        return;
      }
      const comResposta: Mensagem[] = [...novas, { role: "assistant", content: res.data }];
      setMensagens(comResposta);
      gravarConversa(comResposta);
    } finally {
      setCarregando(false);
    }
  }

  function limpar() {
    setMensagens([]);
    gravarConversa([]);
    setErro(null);
  }

  return (
    <div className="flex flex-col rounded-lg border border-neutral-200 bg-white">
      <div
        className="min-h-[18rem] max-h-[60svh] space-y-3 overflow-y-auto p-4"
        aria-live="polite"
      >
        {mensagens.length === 0 && !carregando && (
          <p className="text-sm text-neutral-500">
            Peça ideias de pauta, ganchos, variações de CTA ou um roteiro inteiro.
            A conversa fica salva neste navegador por 24h.
          </p>
        )}

        {mensagens.map((m, i) => (
          <div
            key={i}
            className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-neutral-900 text-white"
                  : "border border-neutral-200 bg-neutral-50 text-neutral-900"
              }`}
            >
              <span className="sr-only">{m.role === "user" ? "Você: " : "Assistente: "}</span>
              {m.content}
            </div>
          </div>
        ))}

        {carregando && <p className="text-sm text-neutral-500">Escrevendo...</p>}
        <div ref={fimRef} />
      </div>

      {erro && (
        <p className="mx-4 mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {erro}
        </p>
      )}

      <form
        className="flex items-end gap-2 border-t border-neutral-200 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          enviar();
        }}
      >
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            // Enter envia; Shift+Enter quebra linha.
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              enviar();
            }
          }}
          rows={2}
          aria-label="Mensagem"
          placeholder="Escreva sua mensagem..."
          className="min-w-0 flex-1 resize-none rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
        <div className="flex shrink-0 flex-col gap-1.5">
          <button
            type="submit"
            disabled={carregando || !texto.trim()}
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            Enviar
          </button>
          {mensagens.length > 0 && (
            <button
              type="button"
              onClick={limpar}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50"
            >
              Limpar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
