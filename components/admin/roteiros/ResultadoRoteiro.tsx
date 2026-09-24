"use client";

import { useState } from "react";
import type {
  Framework,
  Roteiro6Chapeus,
  RoteiroAIDA,
  RoteiroJson,
  RoteiroMidtrack,
  RoteiroPAS,
} from "@/lib/roteiroTypes";

type Segmento = { rotulo: string; texto: string };

function contarPalavras(texto: string): number {
  return texto.trim().split(/\s+/).filter(Boolean).length;
}

function RegaTimecode({
  segmentos,
  duracaoTotal,
}: {
  segmentos: Segmento[];
  duracaoTotal: number;
}) {
  const totalPalavras = segmentos.reduce((acc, s) => acc + contarPalavras(s.texto), 0) || 1;
  const cores = ["bg-neutral-200", "bg-neutral-100", "bg-neutral-300", "bg-neutral-50"];

  return (
    <div className="mb-6">
      <div className="mb-1 flex h-8 w-full overflow-hidden rounded-md border border-neutral-200 font-mono text-[10px]">
        {segmentos.map((s, i) => {
          const palavras = contarPalavras(s.texto);
          const proporcao = palavras / totalPalavras;
          const largura = `${Math.max(proporcao * 100, 4)}%`;
          return (
            <div
              key={i}
              className={`flex items-center justify-center border-r border-white last:border-r-0 ${
                cores[i % cores.length]
              } text-neutral-700`}
              style={{ width: largura }}
              title={s.rotulo}
            >
              <span className="truncate px-1">{s.rotulo}</span>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between font-mono text-[10px] text-neutral-500">
        <span>0s</span>
        <span>{duracaoTotal}s</span>
      </div>
    </div>
  );
}

function Bloco({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="mb-4">
      <div className="mb-1 font-mono text-xs uppercase tracking-wide text-neutral-700">
        {titulo}
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-900">{texto}</p>
    </div>
  );
}

function BotaoCopiar({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(texto);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 1500);
      }}
      className="rounded-md border border-neutral-200 px-3 py-1.5 text-xs text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
    >
      {copiado ? "Copiado!" : "Copiar roteiro"}
    </button>
  );
}

export default function ResultadoRoteiro({
  framework,
  roteiro: json,
  duracaoSegundos,
}: {
  framework: Framework;
  roteiro: RoteiroJson;
  duracaoSegundos: number;
}) {
  if (framework === "AIDA") {
    const roteiro = json as RoteiroAIDA;
    const segmentos: Segmento[] = [
      { rotulo: "Attention", texto: roteiro.attention.texto },
      { rotulo: "Interest", texto: roteiro.interest.texto },
      { rotulo: "Desire", texto: roteiro.desire.texto },
      { rotulo: "Action", texto: roteiro.action.texto },
    ];
    const textoCompleto = segmentos.map((s) => s.texto).join("\n\n");
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <Cabecalho titulo="Roteiro — AIDA" textoCompleto={textoCompleto} />
        <RegaTimecode segmentos={segmentos} duracaoTotal={duracaoSegundos} />
        <Bloco titulo="Attention" texto={roteiro.attention.texto} />
        <Bloco titulo="Interest" texto={roteiro.interest.texto} />
        <Bloco titulo="Desire" texto={roteiro.desire.texto} />
        <Bloco titulo="Action" texto={roteiro.action.texto} />
        <ListaAlternativos titulo="Hooks alternativos" itens={roteiro.attention.hooks_alternativos} />
        <ListaAlternativos titulo="CTAs alternativos" itens={roteiro.action.cta_alternativos} />
        {roteiro.notas_producao && (
          <div className="mt-4 rounded-md bg-neutral-50 p-3 text-xs text-neutral-500">
            <strong className="text-neutral-500">Notas de produção:</strong> {roteiro.notas_producao}
          </div>
        )}
      </div>
    );
  }

  if (framework === "PAS") {
    const roteiro = json as RoteiroPAS;
    const segmentos: Segmento[] = [
      { rotulo: "Hook", texto: roteiro.hook.texto },
      { rotulo: "Problem", texto: roteiro.problem.texto },
      { rotulo: "Agitate", texto: roteiro.agitate.texto },
      { rotulo: "Solution", texto: roteiro.solution.texto },
      { rotulo: "CTA", texto: roteiro.cta.texto },
    ];
    const textoCompleto = segmentos.map((s) => s.texto).join("\n\n");
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <Cabecalho titulo="Roteiro — PAS" textoCompleto={textoCompleto} />
        <RegaTimecode segmentos={segmentos} duracaoTotal={duracaoSegundos} />
        <Bloco titulo="Hook" texto={roteiro.hook.texto} />
        <Bloco titulo="Problem" texto={roteiro.problem.texto} />
        <Bloco titulo="Agitate" texto={roteiro.agitate.texto} />
        <Bloco titulo="Solution" texto={roteiro.solution.texto} />
        <Bloco titulo="CTA" texto={roteiro.cta.texto} />
      </div>
    );
  }

  if (framework === "Midtrack") {
    const roteiro = json as RoteiroMidtrack;
    const desenvolvimento = roteiro.desenvolvimento
      .map((d) => d.texto)
      .join(" ");
    const segmentos: Segmento[] = [
      { rotulo: "Hook", texto: roteiro.hook.texto },
      { rotulo: "Contexto", texto: roteiro.contexto.texto },
      { rotulo: "Desenvolvimento", texto: desenvolvimento },
      { rotulo: "Clímax", texto: roteiro.climax.texto },
      { rotulo: "Payoff", texto: roteiro.payoff.texto },
    ];
    const textoCompleto = segmentos.map((s) => s.texto).join("\n\n");
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <Cabecalho titulo="Roteiro — Midtrack" textoCompleto={textoCompleto} />
        <div className="mb-3 text-xs text-neutral-500">
          <span className="text-neutral-700">Emoção dominante:</span> {roteiro.emocao_dominante}
        </div>
        <RegaTimecode segmentos={segmentos} duracaoTotal={duracaoSegundos} />
        <Bloco titulo="Hook" texto={roteiro.hook.texto} />
        <Bloco titulo="Contexto" texto={roteiro.contexto.texto} />
        {roteiro.desenvolvimento.map((d, i) => (
          <Bloco key={i} titulo={`Desenvolvimento ${i + 1}`} texto={d.texto} />
        ))}
        <Bloco titulo="Clímax" texto={roteiro.climax.texto} />
        <Bloco titulo="Payoff" texto={roteiro.payoff.texto} />
        {roteiro.justificativa_retencao && (
          <div className="mt-4 rounded-md bg-neutral-50 p-3 text-xs text-neutral-500">
            <strong className="text-neutral-500">Por que retém:</strong>{" "}
            {roteiro.justificativa_retencao}
          </div>
        )}
      </div>
    );
  }

  if (framework === "6Chapeus") {
    const roteiro = json as Roteiro6Chapeus;
    return (
      <div className="space-y-4">
        {roteiro.roteiros.map((r, i) => {
          const segmentos: Segmento[] = [
            { rotulo: "Hook", texto: r.hook },
            { rotulo: "Corpo", texto: r.corpo },
            { rotulo: "CTA", texto: r.cta },
          ];
          const textoCompleto = segmentos.map((s) => s.texto).join("\n\n");
          return (
            <div key={i} className="rounded-lg border border-neutral-200 bg-white p-6">
              <Cabecalho titulo={`Ângulo — ${r.angulo}`} textoCompleto={textoCompleto} />
              <RegaTimecode segmentos={segmentos} duracaoTotal={duracaoSegundos} />
              <Bloco titulo="Hook" texto={r.hook} />
              <Bloco titulo="Corpo" texto={r.corpo} />
              <Bloco titulo="CTA" texto={r.cta} />
            </div>
          );
        })}
      </div>
    );
  }

  return null;
}

function Cabecalho({ titulo, textoCompleto }: { titulo: string; textoCompleto: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h3 className="text-base font-bold text-neutral-900">{titulo}</h3>
      <BotaoCopiar texto={textoCompleto} />
    </div>
  );
}

function ListaAlternativos({ titulo, itens }: { titulo: string; itens: string[] }) {
  if (!itens || itens.length === 0) return null;
  return (
    <div className="mt-3 rounded-md bg-neutral-50 p-3">
      <div className="mb-1 font-mono text-xs uppercase tracking-wide text-neutral-500">
        {titulo}
      </div>
      <ul className="list-inside list-disc text-sm text-neutral-900">
        {itens.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
