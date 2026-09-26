"use client";

import { useState } from "react";
import { sugerirFrameworkAction } from "@/app/admin/roteiros/actions";
import {
  ComumParams,
  DURACAO_MAX,
  DURACAO_MIN,
  Framework,
  NICHOS,
  separarTons,
  TONS,
} from "@/lib/roteiroTypes";

const DURACOES = [30, 60, 90];

type Props = {
  comum: ComumParams;
  setComum: (c: ComumParams) => void;
  framework: Framework | null;
  setFramework: (f: Framework) => void;
  justificativa: string | null;
  setJustificativa: (j: string | null) => void;
};

const FRAMEWORKS: { valor: Framework; rotulo: string; descricao: string }[] = [
  { valor: "AIDA", rotulo: "AIDA", descricao: "ação direta e simples" },
  { valor: "PAS", rotulo: "PAS", descricao: "conversão via dor/problema" },
  { valor: "Midtrack", rotulo: "Midtrack", descricao: "retenção via curiosidade" },
  { valor: "6Chapeus", rotulo: "6 Chapéus", descricao: "múltiplos ângulos" },
];

export default function CamposComuns({
  comum,
  setComum,
  framework,
  setFramework,
  justificativa,
  setJustificativa,
}: Props) {
  const [carregandoTriagem, setCarregandoTriagem] = useState(false);
  const [erroTriagem, setErroTriagem] = useState<string | null>(null);

  async function sugerirFramework() {
    if (!comum.tema || !comum.objetivo) {
      setErroTriagem("Preencha tema e objetivo antes de pedir a sugestão.");
      return;
    }
    setErroTriagem(null);
    setCarregandoTriagem(true);
    try {
      const res = await sugerirFrameworkAction(
        comum.tema,
        comum.objetivo,
        comum.contexto
      );
      if (!res.ok) {
        setErroTriagem(res.error);
        return;
      }
      setFramework(res.data.framework_sugerido);
      setJustificativa(res.data.justificativa);
    } finally {
      setCarregandoTriagem(false);
    }
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6">
      <div className="mb-5 flex items-baseline justify-between">
        <h2 className="text-lg font-bold tracking-tight text-neutral-900">
          01 · Roteiro
        </h2>
        <span className="font-mono text-xs text-neutral-500">parâmetros gerais</span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="roteiro-tema" className="mb-1 block text-sm text-neutral-500">Tema</label>
          <textarea
            id="roteiro-tema"
            value={comum.tema}
            onChange={(e) => setComum({ ...comum, tema: e.target.value })}
            rows={2}
            placeholder="Ex: clareamento dental caseiro vs. profissional"
            className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="roteiro-objetivo" className="mb-1 block text-sm text-neutral-500">Objetivo</label>
          <textarea
            id="roteiro-objetivo"
            value={comum.objetivo}
            onChange={(e) => setComum({ ...comum, objetivo: e.target.value })}
            rows={2}
            placeholder="Ex: gerar agendamentos de avaliação"
            className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="roteiro-contexto" className="mb-1 block text-sm text-neutral-500">
            Contexto da empresa e da campanha
          </label>
          <textarea
            id="roteiro-contexto"
            value={comum.contexto}
            onChange={(e) => setComum({ ...comum, contexto: e.target.value })}
            rows={5}
            placeholder="Quem é a empresa, o que faz, diferenciais, público, momento da campanha e o que dá pra explorar. Ex: escola infantil com feira de empreendedorismo e campeonatos esportivos; matrículas abertas para 2027."
            className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm text-neutral-500">Duração alvo</label>
          <div className="flex flex-wrap gap-2">
            {DURACOES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setComum({ ...comum, duracaoSegundos: d })}
                className={`font-mono flex-1 rounded-md border px-3 py-2 text-sm transition-colors sm:w-20 sm:flex-none ${
                  comum.duracaoSegundos === d
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-200 bg-neutral-50 text-neutral-500 hover:border-neutral-400"
                }`}
              >
                {d}s
              </button>
            ))}
            {/* Mesma largura dos botões ao lado. A unidade fica fora do
                placeholder pra continuar visível depois de digitar. */}
            <div
              className={`flex basis-full items-center rounded-md border focus-within:border-neutral-500 sm:w-36 sm:basis-auto ${
                DURACOES.includes(comum.duracaoSegundos)
                  ? "border-neutral-200 bg-neutral-50"
                  : "border-neutral-900 bg-white"
              }`}
            >
              <input
                type="number"
                min={DURACAO_MIN}
                max={DURACAO_MAX}
                inputMode="numeric"
                aria-label="Outra duração, em segundos"
                placeholder="outra"
                value={DURACOES.includes(comum.duracaoSegundos) ? "" : comum.duracaoSegundos}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  // Vazio volta pro padrão em vez de mandar 0s pra IA.
                  setComum({ ...comum, duracaoSegundos: n > 0 ? n : 60 });
                }}
                className="font-mono w-full min-w-0 bg-transparent py-2 pl-3 text-center text-sm text-neutral-900 placeholder-neutral-400 [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <span className="pr-3 font-mono text-xs text-neutral-500" aria-hidden>
                seg
              </span>
            </div>
          </div>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="roteiro-tom" className="mb-1 block text-sm text-neutral-500">Tom de voz</label>
          <input
            id="roteiro-tom"
            type="text"
            value={comum.tom}
            onChange={(e) => setComum({ ...comum, tom: e.target.value })}
            placeholder="Escolha abaixo ou escreva o seu"
            className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {TONS.map((t) => {
              const ativos = separarTons(comum.tom);
              const ativo = ativos.some((x) => x.toLowerCase() === t.toLowerCase());
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => {
                    const novos = ativo
                      ? ativos.filter((x) => x.toLowerCase() !== t.toLowerCase())
                      : [...ativos, t];
                    setComum({ ...comum, tom: novos.join(", ") });
                  }}
                  className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                    ativo
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-200 bg-neutral-50 text-neutral-600 hover:border-neutral-400"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="roteiro-nicho" className="mb-1 block text-sm text-neutral-500">Nicho / área</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
            id="roteiro-nicho"
              value={comum.nicho}
              onChange={(e) => setComum({ ...comum, nicho: e.target.value })}
              className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-500 focus:outline-none sm:w-1/2"
            >
              <option value="">Selecione...</option>
              {NICHOS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            {comum.nicho === "Outro" && (
              <input
                type="text"
                value={comum.nichoCustom}
                onChange={(e) => setComum({ ...comum, nichoCustom: e.target.value })}
                placeholder="Especifique o nicho"
                aria-label="Nicho (outro)"
                className="w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none sm:w-1/2"
              />
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 border-t border-neutral-200 pt-5">
        <button
          type="button"
          onClick={sugerirFramework}
          disabled={carregandoTriagem}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {carregandoTriagem ? "Analisando..." : "Sugerir framework"}
        </button>
        {erroTriagem && <p className="mt-2 text-sm text-red-700">{erroTriagem}</p>}

        {justificativa && (
          <p className="mt-3 text-sm text-neutral-500">
            <span className="text-neutral-700">Sugestão:</span> {justificativa}
          </p>
        )}

        <div className="mt-4">
          <label className="mb-2 block text-sm text-neutral-500">Framework</label>
          <div className="flex flex-wrap gap-2">
            {FRAMEWORKS.map((f) => (
              <button
                key={f.valor}
                type="button"
                onClick={() => setFramework(f.valor)}
                className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                  framework === f.valor
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-200 bg-neutral-50 text-neutral-900 hover:border-neutral-400"
                }`}
              >
                <div className="font-medium">{f.rotulo}</div>
                <div className="text-xs text-neutral-500">{f.descricao}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
