"use client";

import { useState } from "react";
import { atualizarRoteiroAction } from "@/app/admin/roteiros/actions";
import EnviarParaGuia from "@/components/admin/roteiros/EnviarParaGuia";
import TagEditor from "@/components/admin/roteiros/TagEditor";

type Props = {
  id: string | null;
};

const STATUS_OPCOES = [
  { valor: "novo", rotulo: "Novo" },
  { valor: "usado", rotulo: "Usado" },
  { valor: "descartado", rotulo: "Descartado" },
];

export default function ControlesSalvos({ id }: Props) {
  const [favorito, setFavorito] = useState(false);
  const [status, setStatus] = useState("novo");
  const [tags, setTags] = useState<string[]>([]);

  async function atualizar(mudanca: {
    favorito?: boolean;
    status?: string;
    tags?: string[];
  }) {
    if (!id) return;
    try {
      await atualizarRoteiroAction(id, mudanca);
    } catch {
      // Falha silenciosa
    }
  }

  if (!id) {
    return (
      <p className="mb-4 text-xs text-neutral-500">
        Este roteiro não foi salvo no histórico (Supabase indisponível no momento).
      </p>
    );
  }

  return (
    <div className="mb-4 rounded-md border border-neutral-200 bg-neutral-50 p-3">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="text-xs text-neutral-500">
          <span className="text-neutral-700">Salvo no histórico.</span>
        </div>
        <button
          type="button"
          onClick={() => {
            const novo = !favorito;
            setFavorito(novo);
            atualizar({ favorito: novo });
          }}
          className={`shrink-0 text-lg leading-none ${
            favorito ? "text-amber-500" : "text-neutral-500 hover:text-neutral-900"
          }`}
          title={favorito ? "Remover dos favoritos" : "Marcar como favorito"}
        >
          {favorito ? "★" : "☆"}
        </button>
      </div>

      <div className="mb-2 flex gap-1.5">
        {STATUS_OPCOES.map((opt) => (
          <button
            key={opt.valor}
            type="button"
            onClick={() => {
              setStatus(opt.valor);
              atualizar({ status: opt.valor });
            }}
            className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
              status === opt.valor
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-200 bg-white text-neutral-500 hover:border-neutral-400"
            }`}
          >
            {opt.rotulo}
          </button>
        ))}
      </div>

      <div>
        <div className="mb-1 text-xs text-neutral-500">Tags de cliente:</div>
        <TagEditor
          tags={tags}
          onChange={(novasTags) => {
            setTags(novasTags);
            atualizar({ tags: novasTags });
          }}
          compact
        />
      </div>

      <EnviarParaGuia roteiroId={id} />
    </div>
  );
}
