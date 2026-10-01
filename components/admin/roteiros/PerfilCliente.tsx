"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  lerPerfilClienteAction,
  salvarPerfilClienteAction,
} from "@/app/admin/roteiros/actions";

type Perfil = { cadastrado: boolean; descricao: string };

/**
 * Descrição do cliente que o chat lê a cada mensagem, editada sem sair da
 * conversa. Montado com key={cliente}: trocar de cliente recarrega.
 */
export default function PerfilCliente({ cliente }: { cliente: string }) {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [descricao, setDescricao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    lerPerfilClienteAction(cliente).then((res) => {
      if (!ativo) return;
      if (!res.ok) return setErro(res.error);
      setPerfil(res.data);
      setDescricao(res.data.descricao);
    });
    return () => {
      ativo = false;
    };
  }, [cliente]);

  async function salvar() {
    setErro(null);
    setAviso(null);
    setSalvando(true);
    try {
      const res = await salvarPerfilClienteAction(cliente, descricao);
      if (!res.ok) return setErro(res.error);
      setPerfil({ cadastrado: true, descricao });
      setAviso("Salvo. O chat já usa na próxima mensagem.");
    } finally {
      setSalvando(false);
    }
  }

  const mudou = perfil !== null && descricao !== perfil.descricao;

  return (
    <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3">
      {perfil === null && !erro ? (
        <p className="flex items-center gap-1.5 text-xs text-neutral-500" role="status">
          <Loader2 className="size-3 animate-spin motion-reduce:animate-none" aria-hidden />
          Abrindo perfil...
        </p>
      ) : null}

      {perfil && !perfil.cadastrado ? (
        <p className="text-xs text-neutral-600">
          {cliente} só aparece nos guias, não está no cadastro de clientes. Cadastre em{" "}
          <Link href="/admin/clientes/cadastro" className="font-medium underline">
            Clientes
          </Link>{" "}
          para guardar uma descrição.
        </p>
      ) : null}

      {perfil?.cadastrado ? (
        <>
          <label className="block text-xs font-medium text-neutral-600">
            Descrição de {cliente} para o chat
            <textarea
              value={descricao}
              onChange={(e) => {
                setDescricao(e.target.value);
                setAviso(null);
              }}
              rows={6}
              maxLength={5000}
              placeholder="Quem é o cliente, o que vende, público, tom de voz, bordões, o que já funcionou e o que evitar."
              className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-normal text-neutral-900 focus:border-neutral-500 focus:outline-none"
            />
          </label>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={salvar}
              disabled={salvando || !mudou}
              className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {salvando ? "Salvando..." : "Salvar descrição"}
            </button>
            <Link
              href="/admin/clientes/cadastro"
              className="text-xs text-neutral-500 underline hover:text-neutral-800"
            >
              Cadastro completo
            </Link>
            {aviso ? (
              <span className="text-xs text-emerald-700" role="status">
                {aviso}
              </span>
            ) : null}
          </div>
        </>
      ) : null}

      {erro ? <p className="text-xs text-red-700">{erro}</p> : null}
    </div>
  );
}
