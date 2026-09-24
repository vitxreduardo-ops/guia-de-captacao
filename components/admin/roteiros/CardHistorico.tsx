"use client";

import { useState } from "react";
import type { Framework, RoteiroJson } from "@/lib/roteiroTypes";
import { atualizarRoteiroAction } from "@/app/admin/roteiros/actions";
import TagEditor from "@/components/admin/roteiros/TagEditor";
import ResultadoRoteiro from "@/components/admin/roteiros/ResultadoRoteiro";

type Props = {
  id: string;
  createdAt: string;
  framework: string;
  tema: string;
  objetivo: string;
  contexto: string;
  favorito: boolean;
  status: string;
  preview: string;
  tags: string[];
  roteiro: RoteiroJson;
  duracaoSegundos: number;
};

const STATUS_OPCOES = [
  { valor: "novo", rotulo: "Novo" },
  { valor: "usado", rotulo: "Usado" },
  { valor: "descartado", rotulo: "Descartado" },
];

export default function CardHistorico(props: Props) {
  const [favorito, setFavorito] = useState(props.favorito);
  const [status, setStatus] = useState(props.status);
  const [tags, setTags] = useState(props.tags);
  const [salvando, setSalvando] = useState(false);
  const [expandido, setExpandido] = useState(false);

  async function atualizar(mudanca: { favorito?: boolean; status?: string; tags?: string[] }) {
    setSalvando(true);
    try {
      await atualizarRoteiroAction(props.id, mudanca);
    } catch {
      // Falha silenciosa: reverte visualmente se necessário
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div
      className={`rounded-lg border p-4 transition-opacity ${
        status === "descartado" ? "opacity-50" : "opacity-100"
      } border-neutral-200 bg-white`}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded bg-neutral-50 px-2 py-0.5 font-mono text-[10px] uppercase text-neutral-700">
              {props.framework}
            </span>
            <span className="font-mono text-[10px] text-neutral-500">
              {new Date(props.createdAt).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <h3 className="text-sm font-medium text-neutral-900">{props.tema}</h3>
          <p className="text-xs text-neutral-500">{props.objetivo}</p>
        </div>

        <button
          type="button"
          disabled={salvando}
          onClick={() => {
            const novo = !favorito;
            setFavorito(novo);
            atualizar({ favorito: novo });
          }}
          className={`shrink-0 text-lg ${
            favorito ? "text-amber-500" : "text-neutral-500 hover:text-neutral-900"
          }`}
          title={favorito ? "Remover dos favoritos" : "Marcar como favorito"}
        >
          {favorito ? "★" : "☆"}
        </button>
      </div>

      <button
        type="button"
        onClick={() => setExpandido(!expandido)}
        className="mb-3 block w-full text-left"
      >
        <p className="line-clamp-2 text-xs text-neutral-500 hover:text-neutral-900">
          {props.preview}
        </p>
        <span className="mt-1 inline-block font-mono text-[10px] text-neutral-700">
          {expandido ? "▲ recolher roteiro completo" : "▼ ver roteiro completo"}
        </span>
      </button>

      {expandido && (
        <div className="mb-3">
          {props.contexto && (
            <div className="mb-3 rounded-md bg-neutral-50 p-3 text-xs text-neutral-600">
              <strong className="text-neutral-700">Contexto:</strong>{" "}
              <span className="whitespace-pre-wrap">{props.contexto}</span>
            </div>
          )}
          <ResultadoRoteiro
            framework={props.framework as Framework}
            roteiro={props.roteiro}
            duracaoSegundos={props.duracaoSegundos}
          />
        </div>
      )}

      <div className="flex gap-1.5">
        {STATUS_OPCOES.map((opt) => (
          <button
            key={opt.valor}
            type="button"
            disabled={salvando}
            onClick={() => {
              setStatus(opt.valor);
              atualizar({ status: opt.valor });
            }}
            className={`rounded-md border px-2 py-1 text-[11px] transition-colors ${
              status === opt.valor
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-200 bg-neutral-50 text-neutral-500 hover:border-neutral-400"
            }`}
          >
            {opt.rotulo}
          </button>
        ))}
      </div>

      <TagEditor
        tags={tags}
        onChange={(novasTags) => {
          setTags(novasTags);
          atualizar({ tags: novasTags });
        }}
      />
    </div>
  );
}
