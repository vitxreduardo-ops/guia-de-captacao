"use client";

import { confirmar } from "@/components/ConfirmHost";
import { useEffect, useState } from "react";
import { gerarRoteiroAction, gerarVariosAction } from "@/app/admin/roteiros/actions";
import CamposComuns from "@/components/admin/roteiros/CamposComuns";
import CamposEspecificos, {
  Extra6Chapeus,
  ExtraAIDA,
  ExtraMidtrack,
  ExtraPAS,
  ExtraPersonalizado,
  ExtraStartupDaReal,
} from "@/components/admin/roteiros/CamposEspecificos";
import VariosRoteiros from "@/components/admin/roteiros/VariosRoteiros";
import ResultadoRoteiro from "@/components/admin/roteiros/ResultadoRoteiro";
import TagEditor from "@/components/admin/roteiros/TagEditor";
import ControlesSalvos from "@/components/admin/roteiros/ControlesSalvos";
import { publicarFormulario } from "@/lib/roteiroFormularioAtual";
import {
  ComumParams,
  Framework,
  nichoFinal,
  resumoFormulario,
  type PedidoVarios,
  type PreenchimentoInicial,
  type RoteiroJson,
} from "@/lib/roteiroTypes";

export default function GeradorRoteiro({
  inicial,
  clientes = [],
}: {
  inicial?: PreenchimentoInicial | null;
  /** Nomes pro seletor de cliente, os mesmos do chat. */
  clientes?: string[];
}) {
  // "Usar como base": a primeira tag que é um cliente conhecido volta como cliente.
  const [cliente, setCliente] = useState(
    () => inicial?.tags.find((t) => clientes.includes(t)) ?? ""
  );
  const [comum, setComum] = useState<ComumParams>(
    inicial?.comum ?? {
      tema: "",
      objetivo: "",
      contexto: "",
      duracaoSegundos: 60,
      tom: "",
      nicho: "",
      nichoCustom: "",
    }
  );

  const [framework, setFramework] = useState<Framework | null>(
    inicial?.framework ?? null
  );
  const [justificativa, setJustificativa] = useState<string | null>(null);

  const [extraAIDA, setExtraAIDA] = useState<ExtraAIDA>({ cta: "", numHooks: 3 });
  const [extraPAS, setExtraPAS] = useState<ExtraPAS>({
    dorPrincipal: "",
    intensidadeAgitate: "Moderado",
    cta: "",
  });
  const [extraMidtrack, setExtraMidtrack] = useState<ExtraMidtrack>({
    fatoInteressante: "",
    emocaoDominante: "",
    payoffDesejado: "",
  });
  const [extra6Chapeus, setExtra6Chapeus] = useState<Extra6Chapeus>({ angulos: [] });
  const [extraStartup, setExtraStartup] = useState<ExtraStartupDaReal>({ angulos: {} });
  const [extraPersonalizado, setExtraPersonalizado] = useState<ExtraPersonalizado>({ descricao: "" });
  // Quantos roteiros de cada ângulo num pedido só; vazio = um roteiro. Vale pra qualquer framework.
  const [pedidoVarios, setPedidoVarios] = useState<PedidoVarios>({});
  const [tags, setTags] = useState<string[]>(inicial?.tags ?? []);

  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<RoteiroJson | null>(null);
  const [resultadoId, setResultadoId] = useState<string | null>(null);
  // Pedido com vários ângulos: um resultado (ou erro) por ângulo.
  const [varios, setVarios] = useState<
    {
      angulo: string;
      indice: number;
      total: number;
      roteiro: RoteiroJson | null;
      id: string | null;
      erro: string | null;
    }[]
  >([]);
  const qtdVarios = Object.values(pedidoVarios).reduce((s: number, n) => s + (n ?? 0), 0);

  // Nada disso vai pro banco antes de gerar, e o roteiro gerado só fica no
  // histórico: sair da página apaga o formulário. Pergunta antes.
  const temAlgo = Boolean(
    comum.tema.trim() || comum.objetivo.trim() || comum.contexto.trim() || resultado || varios.length
  );

  useEffect(() => {
    if (!temAlgo) return;

    // Recarregar, fechar a aba ou digitar outro endereço: diálogo do navegador.
    let saindo = false;
    function avisarAoFechar(event: BeforeUnloadEvent) {
      if (!saindo) event.preventDefault();
    }

    // Links do app (barra lateral, Histórico, Chat) trocam de página sem
    // recarregar, então o beforeunload não dispara. Na fase de captura o
    // clique é barrado antes de chegar no <Link> do Next.
    function avisarAoNavegar(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest("a[href]");
      if (!(link instanceof HTMLAnchorElement) || link.target === "_blank") return;
      if (link.origin !== location.origin || link.pathname === location.pathname) return;

      // Barra o clique agora e só segue se a pessoa confirmar na tela.
      event.preventDefault();
      event.stopPropagation();
      void confirmar(
        "Sair desta página? O que está preenchido no formulário será perdido.",
        "Sair"
      ).then((sair) => {
        if (!sair) return;
        saindo = true;
        window.location.assign(link.href);
      });
    }

    window.addEventListener("beforeunload", avisarAoFechar);
    document.addEventListener("click", avisarAoNavegar, true);
    return () => {
      window.removeEventListener("beforeunload", avisarAoFechar);
      document.removeEventListener("click", avisarAoNavegar, true);
    };
  }, [temAlgo]);

  // O chat ao lado lê o formulário e o roteiro gerado a cada mensagem.
  useEffect(() => {
    publicarFormulario(resumoFormulario(comum, framework, resultado));
  }, [comum, framework, resultado]);
  useEffect(() => () => publicarFormulario(""), []);

  function extraAtual() {
    switch (framework) {
      case "AIDA":
        return extraAIDA;
      case "PAS":
        return extraPAS;
      case "Midtrack":
        return extraMidtrack;
      case "6Chapeus":
        return extra6Chapeus;
      case "@startupdareal":
        return extraStartup;
      case "Personalizado":
        return extraPersonalizado;
      default:
        return {};
    }
  }

  async function gerarRoteiro() {
    if (!framework) {
      setErro("Escolha um framework antes de gerar.");
      return;
    }
    setErro(null);
    setCarregando(true);
    setResultado(null);
    setResultadoId(null);
    setVarios([]);
    try {
      const comumResolvido = { ...comum, nicho: nichoFinal(comum) };
      if (qtdVarios > 0) {
        const res = await gerarVariosAction({
          framework,
          comum: comumResolvido,
          extra: extraAtual(),
          tags,
          cliente,
          pedidos: pedidoVarios,
        });
        if (!res.ok) {
          setErro(res.error);
          return;
        }
        setVarios(
          res.data.map(({ angulo, indice, total, resultado: r }) =>
            r.ok
              ? { angulo, indice, total, roteiro: r.data.roteiro, id: r.data.id, erro: null }
              : { angulo, indice, total, roteiro: null, id: null, erro: r.error }
          )
        );
        return;
      }
      const res = await gerarRoteiroAction({
        framework,
        comum: comumResolvido,
        extra: extraAtual(),
        tags,
        cliente,
      });
      if (!res.ok) {
        setErro(res.error);
        return;
      }
      setResultado(res.data.roteiro);
      setResultadoId(res.data.id);
    } finally {
      setCarregando(false);
    }
  }

  return (
      <div className="space-y-6">
        <CamposComuns
          clientes={clientes}
          cliente={cliente}
          setCliente={setCliente}
          comum={comum}
          setComum={setComum}
          framework={framework}
          setFramework={setFramework}
          justificativa={justificativa}
          setJustificativa={setJustificativa}
        />

        {framework && (
          <CamposEspecificos
            framework={framework}
            extraAIDA={extraAIDA}
            setExtraAIDA={setExtraAIDA}
            extraPAS={extraPAS}
            setExtraPAS={setExtraPAS}
            extraMidtrack={extraMidtrack}
            setExtraMidtrack={setExtraMidtrack}
            extra6Chapeus={extra6Chapeus}
            setExtra6Chapeus={setExtra6Chapeus}
            extraStartup={extraStartup}
            setExtraStartup={setExtraStartup}
            extraPersonalizado={extraPersonalizado}
            setExtraPersonalizado={setExtraPersonalizado}
          />
        )}

        {framework && <VariosRoteiros varios={pedidoVarios} setVarios={setPedidoVarios} />}

        {framework && (
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <label className="mb-1 block text-sm text-neutral-500">
              Cliente / tags (opcional)
            </label>
            <TagEditor tags={tags} onChange={setTags} />
          </div>
        )}

        {framework && (
          <button
            type="button"
            onClick={gerarRoteiro}
            disabled={carregando}
            className="w-full rounded-md bg-neutral-900 px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {qtdVarios > 1
              ? carregando
                ? `Gerando ${qtdVarios} roteiros...`
                : `Gerar ${qtdVarios} roteiros`
              : carregando
                ? "Gerando roteiro..."
                : "Gerar roteiro"}
          </button>
        )}

        {erro && (
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {erro}
          </p>
        )}

        {varios.length > 0 && framework && (
          <div className="space-y-6">
            {varios.map((v) => (
              <div key={`${v.angulo}-${v.indice}`}>
                <h3 className="mb-2 font-mono text-xs uppercase tracking-wide text-neutral-500">
                  Ângulo — {v.angulo}
                  {v.total > 1 ? ` (${v.indice} de ${v.total})` : ""}
                </h3>
                {v.roteiro ? (
                  <>
                    <ControlesSalvos id={v.id} />
                    <ResultadoRoteiro
                      framework={framework}
                      roteiro={v.roteiro}
                      duracaoSegundos={comum.duracaoSegundos}
                    />
                  </>
                ) : (
                  <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {v.erro}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {resultado && framework && (
          <div>
            <ControlesSalvos id={resultadoId} />
            <ResultadoRoteiro
              framework={framework}
              roteiro={resultado}
              duracaoSegundos={comum.duracaoSegundos}
            />
          </div>
        )}
      </div>
  );
}
