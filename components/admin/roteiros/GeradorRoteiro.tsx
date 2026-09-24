"use client";

import { useState } from "react";
import { gerarRoteiroAction } from "@/app/admin/roteiros/actions";
import CamposComuns from "@/components/admin/roteiros/CamposComuns";
import CamposEspecificos, {
  Extra6Chapeus,
  ExtraAIDA,
  ExtraMidtrack,
  ExtraPAS,
} from "@/components/admin/roteiros/CamposEspecificos";
import ResultadoRoteiro from "@/components/admin/roteiros/ResultadoRoteiro";
import TagEditor from "@/components/admin/roteiros/TagEditor";
import ControlesSalvos from "@/components/admin/roteiros/ControlesSalvos";
import { ComumParams, Framework, nichoFinal, type RoteiroJson } from "@/lib/roteiroTypes";

export default function GeradorRoteiro() {
  const [comum, setComum] = useState<ComumParams>({
    tema: "",
    objetivo: "",
    duracaoSegundos: 60,
    tom: "",
    nicho: "",
    nichoCustom: "",
  });

  const [framework, setFramework] = useState<Framework | null>(null);
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
  const [tags, setTags] = useState<string[]>([]);

  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<RoteiroJson | null>(null);
  const [resultadoId, setResultadoId] = useState<string | null>(null);

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
    try {
      const comumResolvido = { ...comum, nicho: nichoFinal(comum) };
      const res = await gerarRoteiroAction({
        framework,
        comum: comumResolvido,
        extra: extraAtual(),
        tags,
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
          />
        )}

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
            {carregando ? "Gerando roteiro..." : "Gerar roteiro"}
          </button>
        )}

        {erro && (
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {erro}
          </p>
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
