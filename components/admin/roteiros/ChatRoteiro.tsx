"use client";

import { useEffect, useRef, useState } from "react";
import { conversarAction } from "@/app/admin/roteiros/actions";
import {
  ClipboardList,
  FileDown,
  FileText,
  Loader2,
  MessageSquare,
  SendHorizontal,
  Trash2,
  UserRound,
} from "lucide-react";
import PerfilCliente from "@/components/admin/roteiros/PerfilCliente";
import { slugify } from "@/lib/slug";
import { useFormularioAtual } from "@/lib/roteiroFormularioAtual";
import {
  ThoughtChain,
  ThoughtChainContent,
  ThoughtChainItem,
  ThoughtChainStep,
  ThoughtChainTrigger,
} from "@/components/ui/thought-chain";

type Mensagem = {
  role: "user" | "assistant";
  content: string;
  /** Etapas que a IA listou antes de responder; só nas mensagens dela. */
  raciocinio?: string[];
};

// A conversa fica neste navegador por 24h e depois some sozinha. Não vai pro
// banco: é rascunho de ideia, não registro.
const CHAVE = "roteiros-chat";
const VALIDADE_MS = 24 * 60 * 60 * 1000;

// O cliente escolhido vale pra conversa toda, então fica salvo junto dela.
type Conversa = { mensagens: Mensagem[]; cliente: string };

function lerConversa(): Conversa {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) ?? "null");
    if (!salvo || Date.now() - salvo.salvoEm > VALIDADE_MS) return { mensagens: [], cliente: "" };
    return {
      mensagens: Array.isArray(salvo.mensagens) ? salvo.mensagens : [],
      cliente: typeof salvo.cliente === "string" ? salvo.cliente : "",
    };
  } catch {
    return { mensagens: [], cliente: "" };
  }
}

function gravarConversa({ mensagens, cliente }: Conversa) {
  try {
    if (mensagens.length === 0 && !cliente) localStorage.removeItem(CHAVE);
    // O prazo conta da última mensagem: conversa em uso não expira no meio.
    else localStorage.setItem(CHAVE, JSON.stringify({ salvoEm: Date.now(), mensagens, cliente }));
  } catch {
    // Sem armazenamento (aba anônima, bloqueio): a conversa só não sobrevive ao recarregar.
  }
}

function baixar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

function nomeArquivo(pergunta: string, extensao: string) {
  const hoje = new Date().toISOString().slice(0, 10);
  return `${slugify(pergunta) || "roteiro"}-${hoje}.${extensao}`;
}

function baixarTxt(pergunta: string, resposta: string) {
  // Só a resposta vai no arquivo; o pedido serve só pra dar nome a ele.
  baixar(new Blob([`${resposta}\n`], { type: "text/plain;charset=utf-8" }), nomeArquivo(pergunta, "txt"));
}

async function baixarPdf(pergunta: string, resposta: string) {
  // Biblioteca de PDF só carrega no clique: é pesada e quase ninguém baixa.
  const [{ pdf }, { default: RespostaChatPdf }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/components/pdf/RespostaChatPdf"),
  ]);
  const data = new Date().toLocaleDateString("pt-BR");
  const blob = await pdf(
    <RespostaChatPdf titulo={pergunta} resposta={resposta} data={data} />
  ).toBlob();
  baixar(blob, nomeArquivo(pergunta, "pdf"));
}

const BOTAO_BAIXAR =
  "inline-flex items-center gap-1 rounded-md border border-neutral-300 px-2 py-1 text-[11px] text-neutral-700 hover:bg-neutral-50 disabled:opacity-50";

export default function ChatRoteiro({
  preencher = false,
  clientes = [],
}: {
  /** Ocupa a altura do pai (coluna ao lado do gerador) em vez de ter altura própria. */
  preencher?: boolean;
  /** Nomes pro seletor de cliente (cadastro + clientes dos guias). */
  clientes?: string[];
}) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [cliente, setCliente] = useState("");
  const [perfilAberto, setPerfilAberto] = useState(false);
  const formulario = useFormularioAtual();
  const [texto, setTexto] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [gerandoPdf, setGerandoPdf] = useState<number | null>(null);
  const fimRef = useRef<HTMLDivElement>(null);

  // Lido depois de montar: no servidor não existe localStorage, e ler no
  // primeiro render daria HTML diferente entre servidor e navegador.
  useEffect(() => {
    const salva = lerConversa();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMensagens(salva.mensagens);
    setCliente(salva.cliente);
  }, []);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ block: "end" });
  }, [mensagens, carregando]);

  async function enviar() {
    const conteudo = texto.trim();
    if (!conteudo || carregando) return;

    const novas: Mensagem[] = [...mensagens, { role: "user", content: conteudo }];
    setMensagens(novas);
    gravarConversa({ mensagens: novas, cliente });
    setTexto("");
    setErro(null);
    setCarregando(true);
    try {
      // O raciocínio é só pra tela: a IA recebe a conversa sem ele.
      const res = await conversarAction(
        novas.map(({ role, content }) => ({ role, content })),
        { cliente, formulario }
      );
      if (!res.ok) {
        setErro(res.error);
        return;
      }
      const comResposta: Mensagem[] = [
        ...novas,
        { role: "assistant", content: res.data.resposta, raciocinio: res.data.raciocinio },
      ];
      setMensagens(comResposta);
      gravarConversa({ mensagens: comResposta, cliente });
    } finally {
      setCarregando(false);
    }
  }

  function limpar() {
    setMensagens([]);
    gravarConversa({ mensagens: [], cliente });
    setErro(null);
  }

  return (
    <div
      className={`flex flex-col rounded-lg border border-neutral-200 bg-white ${
        preencher ? "h-full min-h-0" : ""
      }`}
    >
      {preencher && (
        // Mesmo cabeçalho do "01 · Roteiro" ao lado, pra os dois quadros
        // começarem na mesma linha e pesarem igual.
        <div className="flex items-baseline justify-between border-b border-neutral-200 px-6 pt-6 pb-4">
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-neutral-900">
            <MessageSquare className="size-4.5 text-neutral-500" aria-hidden />
            Chat
          </h2>
          <span className="font-mono text-xs text-neutral-500">ideias e ganchos</span>
        </div>
      )}
      {/* O que o chat sabe além da conversa: cliente escolhido e formulário ao lado. */}
      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 px-4 py-2.5">
        <label className="flex min-w-0 items-center gap-2 text-xs text-neutral-500">
          Cliente
          <select
            value={cliente}
            onChange={(e) => {
              setCliente(e.target.value);
              if (!e.target.value) setPerfilAberto(false);
              gravarConversa({ mensagens, cliente: e.target.value });
            }}
            className="min-w-0 max-w-[14rem] rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-900 focus:border-neutral-500 focus:outline-none"
          >
            <option value="">Nenhum</option>
            {clientes.map((nome) => (
              <option key={nome} value={nome}>
                {nome}
              </option>
            ))}
          </select>
        </label>
        {cliente ? (
          <button
            type="button"
            onClick={() => setPerfilAberto((a) => !a)}
            aria-expanded={perfilAberto}
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${
              perfilAberto
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-300 text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            <UserRound className="size-3" aria-hidden />
            Perfil
          </button>
        ) : null}
        {formulario ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600">
            <ClipboardList className="size-3" aria-hidden />
            Lendo o formulário
          </span>
        ) : null}
      </div>

      {cliente && perfilAberto ? <PerfilCliente key={cliente} cliente={cliente} /> : null}

      <div
        className={`space-y-3 overflow-y-auto p-4 ${
          preencher ? "min-h-0 flex-1" : "min-h-[18rem] max-h-[60svh]"
        }`}
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
            className={m.role === "user" ? "flex justify-end" : "flex flex-col items-start"}
          >
            {m.role === "assistant" && m.raciocinio && m.raciocinio.length > 0 && (
              <div className="mb-1 max-w-[85%]">
                <ThoughtChain>
                  <ThoughtChainStep status="done" defaultOpen={false}>
                    <ThoughtChainTrigger>
                      {`Pensou em ${m.raciocinio.length} etapas`}
                    </ThoughtChainTrigger>
                    <ThoughtChainContent>
                      {m.raciocinio.map((etapa, j) => (
                        <ThoughtChainItem key={j}>{etapa}</ThoughtChainItem>
                      ))}
                    </ThoughtChainContent>
                  </ThoughtChainStep>
                </ThoughtChain>
              </div>
            )}
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
            {m.role === "assistant" && (
              <div className="mt-1 flex gap-1.5">
                <button
                  type="button"
                  className={BOTAO_BAIXAR}
                  onClick={() => baixarTxt(mensagens[i - 1]?.content ?? "", m.content)}
                >
                  <FileText className="size-3" aria-hidden />
                  Baixar .txt
                </button>
                <button
                  type="button"
                  className={BOTAO_BAIXAR}
                  disabled={gerandoPdf === i}
                  onClick={async () => {
                    setGerandoPdf(i);
                    try {
                      await baixarPdf(mensagens[i - 1]?.content ?? "", m.content);
                    } catch {
                      setErro("Não deu pra gerar o PDF. Tente o .txt.");
                    } finally {
                      setGerandoPdf(null);
                    }
                  }}
                >
                  {gerandoPdf === i ? (
                    <Loader2 className="size-3 animate-spin motion-reduce:animate-none" aria-hidden />
                  ) : (
                    <FileDown className="size-3" aria-hidden />
                  )}
                  {gerandoPdf === i ? "Gerando PDF..." : "Baixar PDF"}
                </button>
              </div>
            )}
          </div>
        ))}

        {carregando && (
          // Sem streaming não dá pra mostrar as etapas enquanto acontecem:
          // elas chegam junto com a resposta e aparecem recolhidas acima dela.
          <ThoughtChain>
            <ThoughtChainStep status="done" defaultOpen={false}>
              <ThoughtChainTrigger collapsible={false}>Lendo a conversa</ThoughtChainTrigger>
            </ThoughtChainStep>
            {cliente ? (
              <ThoughtChainStep status="done" defaultOpen={false}>
                <ThoughtChainTrigger collapsible={false}>
                  {`Lendo os roteiros de ${cliente}`}
                </ThoughtChainTrigger>
              </ThoughtChainStep>
            ) : null}
            <ThoughtChainStep status="active" defaultOpen={false}>
              <ThoughtChainTrigger collapsible={false}>Pensando na resposta</ThoughtChainTrigger>
            </ThoughtChainStep>
          </ThoughtChain>
        )}
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
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            <SendHorizontal className="size-3.5" aria-hidden />
            Enviar
          </button>
          {mensagens.length > 0 && (
            <button
              type="button"
              onClick={limpar}
              className="inline-flex items-center justify-center gap-1 rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50"
            >
              <Trash2 className="size-3" aria-hidden />
              Limpar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
