"use client";

import {
  ANGULOS_6CHAPEUS,
  CTAS,
  EMOCOES_MIDTRACK,
  Framework,
  INTENSIDADES_PAS,
} from "@/lib/roteiroTypes";

export type ExtraAIDA = { cta: string; numHooks: number };
export type ExtraPAS = { dorPrincipal: string; intensidadeAgitate: string; cta: string };
export type ExtraMidtrack = {
  fatoInteressante: string;
  emocaoDominante: string;
  payoffDesejado: string;
};
export type Extra6Chapeus = { angulos: string[] };

type Props = {
  framework: Framework;
  extraAIDA: ExtraAIDA;
  setExtraAIDA: (v: ExtraAIDA) => void;
  extraPAS: ExtraPAS;
  setExtraPAS: (v: ExtraPAS) => void;
  extraMidtrack: ExtraMidtrack;
  setExtraMidtrack: (v: ExtraMidtrack) => void;
  extra6Chapeus: Extra6Chapeus;
  setExtra6Chapeus: (v: Extra6Chapeus) => void;
};

function Rotulo({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-sm text-neutral-500">
      {children}
    </label>
  );
}

function inputClasses() {
  return "w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none";
}

export default function CamposEspecificos(props: Props) {
  const { framework } = props;

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6">
      <div className="mb-5 flex items-baseline justify-between">
        <h2 className="text-lg font-bold tracking-tight text-neutral-900">
          02 · Parâmetros de {rotuloFramework(framework)}
        </h2>
        <span className="font-mono text-xs text-neutral-500">específico</span>
      </div>

      {framework === "AIDA" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Rotulo htmlFor="roteiro-extra-1">CTA desejado</Rotulo>
            <select
              id="roteiro-extra-1"
              value={props.extraAIDA.cta}
              onChange={(e) =>
                props.setExtraAIDA({ ...props.extraAIDA, cta: e.target.value })
              }
              className={inputClasses()}
            >
              <option value="">Selecione...</option>
              {CTAS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Rotulo>Nº de hooks alternativos</Rotulo>
            <div className="flex gap-2">
              {[1, 3, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => props.setExtraAIDA({ ...props.extraAIDA, numHooks: n })}
                  className={`font-mono flex-1 rounded-md border px-3 py-2 text-sm ${
                    props.extraAIDA.numHooks === n
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-200 bg-neutral-50 text-neutral-500 hover:border-neutral-400"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {framework === "PAS" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Rotulo htmlFor="roteiro-extra-2">Principal dor/problema</Rotulo>
            <textarea
              id="roteiro-extra-2"
              value={props.extraPAS.dorPrincipal}
              onChange={(e) =>
                props.setExtraPAS({ ...props.extraPAS, dorPrincipal: e.target.value })
              }
              rows={2}
              placeholder="Ex: manchas nos dentes causam vergonha de sorrir em fotos"
              className={inputClasses()}
            />
          </div>
          <div>
            <Rotulo>Intensidade do Agitate</Rotulo>
            <div className="flex gap-2">
              {INTENSIDADES_PAS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() =>
                    props.setExtraPAS({ ...props.extraPAS, intensidadeAgitate: i })
                  }
                  className={`flex-1 rounded-md border px-3 py-2 text-sm ${
                    props.extraPAS.intensidadeAgitate === i
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-200 bg-neutral-50 text-neutral-500 hover:border-neutral-400"
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Rotulo htmlFor="roteiro-extra-3">CTA desejado</Rotulo>
            <select
              id="roteiro-extra-3"
              value={props.extraPAS.cta}
              onChange={(e) => props.setExtraPAS({ ...props.extraPAS, cta: e.target.value })}
              className={inputClasses()}
            >
              <option value="">Selecione...</option>
              {CTAS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {framework === "Midtrack" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Rotulo htmlFor="roteiro-extra-4">Fato mais interessante do tema (opcional)</Rotulo>
            <textarea
              id="roteiro-extra-4"
              value={props.extraMidtrack.fatoInteressante}
              onChange={(e) =>
                props.setExtraMidtrack({
                  ...props.extraMidtrack,
                  fatoInteressante: e.target.value,
                })
              }
              rows={2}
              placeholder="Deixe em branco para o modelo descobrir sozinho"
              className={inputClasses()}
            />
          </div>
          <div>
            <Rotulo htmlFor="roteiro-extra-5">Emoção dominante</Rotulo>
            <select
              id="roteiro-extra-5"
              value={props.extraMidtrack.emocaoDominante}
              onChange={(e) =>
                props.setExtraMidtrack({
                  ...props.extraMidtrack,
                  emocaoDominante: e.target.value,
                })
              }
              className={inputClasses()}
            >
              <option value="">Selecione...</option>
              {EMOCOES_MIDTRACK.map((em) => (
                <option key={em} value={em}>
                  {em}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Rotulo htmlFor="roteiro-extra-6">Payoff desejado</Rotulo>
            <input
              id="roteiro-extra-6"
              type="text"
              value={props.extraMidtrack.payoffDesejado}
              onChange={(e) =>
                props.setExtraMidtrack({
                  ...props.extraMidtrack,
                  payoffDesejado: e.target.value,
                })
              }
              placeholder="O que a pessoa deve aprender/sentir no final"
              className={inputClasses()}
            />
          </div>
        </div>
      )}

      {framework === "6Chapeus" && (
        <div>
          <Rotulo>Ângulos a incluir</Rotulo>
          <div className="flex flex-wrap gap-2">
            {ANGULOS_6CHAPEUS.map((a) => {
              const ativo = props.extra6Chapeus.angulos.includes(a);
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => {
                    const novos = ativo
                      ? props.extra6Chapeus.angulos.filter((x) => x !== a)
                      : [...props.extra6Chapeus.angulos, a];
                    props.setExtra6Chapeus({ angulos: novos });
                  }}
                  className={`rounded-md border px-3 py-2 text-sm ${
                    ativo
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-200 bg-neutral-50 text-neutral-500 hover:border-neutral-400"
                  }`}
                >
                  {a}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function rotuloFramework(f: Framework) {
  switch (f) {
    case "AIDA":
      return "AIDA";
    case "PAS":
      return "PAS";
    case "Midtrack":
      return "Midtrack";
    case "6Chapeus":
      return "6 Chapéus";
  }
}
