"use client";

import Link from "next/link";
import { useState } from "react";
import { Clapperboard } from "lucide-react";
import { enviarParaGuiaAction, listarGuiasAction } from "@/app/admin/roteiros/actions";

type Guia = { id: string; titulo: string; cliente: string };

/** Transforma o roteiro salvo em vídeo(s) com cenas num guia de captação. */
export default function EnviarParaGuia({ roteiroId }: { roteiroId: string }) {
  const [guias, setGuias] = useState<Guia[] | null>(null);
  const [guiaId, setGuiaId] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState<{ guia: Guia; videos: number } | null>(null);

  async function abrir() {
    setErro(null);
    setCarregando(true);
    try {
      const res = await listarGuiasAction();
      if (!res.ok) return setErro(res.error);
      setGuias(res.data);
      setGuiaId(res.data[0]?.id ?? "");
    } finally {
      setCarregando(false);
    }
  }

  async function enviar() {
    const guia = guias?.find((g) => g.id === guiaId);
    if (!guia) return;
    setErro(null);
    setCarregando(true);
    try {
      const res = await enviarParaGuiaAction(roteiroId, guia.id);
      if (!res.ok) return setErro(res.error);
      setEnviado({ guia, videos: res.data.videos });
      setGuias(null);
    } finally {
      setCarregando(false);
    }
  }

  const botao =
    "inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs text-neutral-700 hover:bg-neutral-50 disabled:opacity-50";

  return (
    <div className="mt-2">
      {enviado ? (
        <p className="text-xs text-neutral-600" role="status">
          {enviado.videos === 1 ? "1 vídeo enviado" : `${enviado.videos} vídeos enviados`} para{" "}
          <Link href={`/admin/guias/${enviado.guia.id}`} className="font-medium underline">
            {enviado.guia.titulo || "o guia"}
          </Link>
          .
        </p>
      ) : guias === null ? (
        <button type="button" onClick={abrir} disabled={carregando} className={botao}>
          <Clapperboard className="size-3.5" aria-hidden />
          {carregando ? "Carregando guias..." : "Enviar pro guia"}
        </button>
      ) : guias.length === 0 ? (
        <p className="text-xs text-neutral-500">Nenhum guia criado ainda.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5">
          <select
            value={guiaId}
            onChange={(e) => setGuiaId(e.target.value)}
            aria-label="Guia de destino"
            className="min-w-0 max-w-full flex-1 rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs focus:border-neutral-500 focus:outline-none sm:flex-none"
          >
            {guias.map((g) => (
              <option key={g.id} value={g.id}>
                {g.titulo || "Sem título"}
                {g.cliente ? ` — ${g.cliente}` : ""}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={enviar}
            disabled={carregando || !guiaId}
            className="rounded-md bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
          >
            {carregando ? "Enviando..." : "Enviar"}
          </button>
          <button type="button" onClick={() => setGuias(null)} className={botao}>
            Cancelar
          </button>
        </div>
      )}
      {erro && <p className="mt-1 text-xs text-red-700">{erro}</p>}
    </div>
  );
}
