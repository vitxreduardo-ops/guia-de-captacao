"use client";

import { useRef } from "react";
import type { ContractPiece } from "@/lib/contractBody";

const entrada =
  "w-full rounded-md border border-neutral-300 px-2 py-1.5 text-xs focus:border-neutral-500 focus:outline-none disabled:bg-neutral-100 disabled:text-neutral-500";
const botaoDiscreto =
  "rounded px-2 py-1 text-[11px] text-neutral-600 hover:bg-neutral-100 disabled:opacity-40";

/** Linhas do textarea conforme o texto, sem barra de rolagem interna. */
function linhasDe(texto: string) {
  const n = texto
    .split("\n")
    .reduce((soma, l) => soma + Math.max(1, Math.ceil(l.length / 52)), 0);
  return Math.min(16, Math.max(2, n));
}

export function Interruptor({
  ligado,
  onChange,
  rotulo,
}: {
  ligado: boolean;
  onChange: (ligado: boolean) => void;
  rotulo: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={rotulo}
      title={ligado ? "Entra no contrato" : "Fora do contrato"}
      onClick={() => onChange(!ligado)}
      className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${
        ligado ? "bg-emerald-500" : "bg-neutral-300"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-white transition-transform ${
          ligado ? "translate-x-3" : ""
        }`}
      />
    </button>
  );
}

type Props = {
  piece: ContractPiece;
  /** Número do item depois de fechar os buracos; "—" quando está desligado. */
  label: string | null;
  on: boolean;
  onChange: (piece: ContractPiece) => void;
  onRemove: () => void;
};

export function PieceEditor({ piece, label, on, onChange, onRemove }: Props) {
  const raiz = useRef<HTMLDivElement>(null);
  const remover = (
    <button
      type="button"
      onClick={onRemove}
      aria-label="Remover"
      className="shrink-0 rounded px-1.5 py-1 text-xs text-neutral-400 hover:bg-red-50 hover:text-red-600"
    >
      ✕
    </button>
  );

  if (piece.kind === "text") {
    return (
      <div className={`flex items-start gap-1.5 ${on ? "" : "opacity-50"}`}>
        {piece.num !== null ? (
          <div className="flex w-14 shrink-0 flex-col items-center gap-1 pt-1">
            <Interruptor
              ligado={!piece.off}
              rotulo={`Item ${piece.num} no contrato`}
              onChange={(ligado) => onChange({ ...piece, off: !ligado })}
            />
            <span className="text-[11px] font-semibold text-neutral-600 tabular-nums">
              {label ?? "—"}
            </span>
          </div>
        ) : null}
        <textarea
          value={piece.text}
          onChange={(e) => onChange({ ...piece, text: e.target.value })}
          rows={linhasDe(piece.text)}
          aria-label="Texto"
          className={`${entrada} leading-relaxed`}
        />
        {remover}
      </div>
    );
  }

  if (piece.kind === "list") {
    const mudarItem = (i: number, valor: string) =>
      onChange({
        ...piece,
        items: piece.items.map((x, j) => (j === i ? valor : x)),
      });
    const adicionar = () => {
      onChange({ ...piece, items: [...piece.items, ""] });
      setTimeout(() => {
        const campos = raiz.current?.querySelectorAll("textarea");
        campos?.[campos.length - 1]?.focus();
      }, 0);
    };
    return (
      <div
        ref={raiz}
        className={`space-y-1 rounded-md border border-neutral-200 bg-neutral-50 p-2 ${
          on ? "" : "opacity-50"
        }`}
      >
        <p className="text-[11px] font-medium text-neutral-500">Lista</p>
        {piece.items.map((item, i) => (
          <div key={i} className="flex items-start gap-1">
            <span className="pt-1.5 text-xs text-neutral-400">•</span>
            <textarea
              value={item}
              onChange={(e) => mudarItem(i, e.target.value)}
              rows={linhasDe(item)}
              aria-label={`Item ${i + 1}`}
              className={entrada}
            />
            <button
              type="button"
              aria-label={`Remover item ${i + 1}`}
              onClick={() =>
                piece.items.length > 1
                  ? onChange({
                      ...piece,
                      items: piece.items.filter((_, j) => j !== i),
                    })
                  : onRemove()
              }
              className="rounded px-1.5 py-1 text-xs text-neutral-400 hover:bg-red-50 hover:text-red-600"
            >
              ✕
            </button>
          </div>
        ))}
        <button type="button" onClick={adicionar} className={botaoDiscreto}>
          + Item
        </button>
      </div>
    );
  }

  // Tabela: cabeçalho + linhas, uma caixa por célula.
  const colunas = Math.max(...piece.rows.map((r) => r.length));
  const linhas = piece.rows.map((r) =>
    Array.from({ length: colunas }, (_, i) => r[i] ?? ""),
  );
  const [cabecalho, ...corpo] = linhas;

  const mudarCelula = (l: number, c: number, valor: string) =>
    onChange({
      ...piece,
      rows: linhas.map((r, i) =>
        i === l ? r.map((x, j) => (j === c ? valor : x)) : r,
      ),
    });
  const adicionarLinha = () => {
    onChange({ ...piece, rows: [...linhas, Array(colunas).fill("")] });
    setTimeout(() => {
      const campos =
        raiz.current?.querySelectorAll<HTMLElement>(`[data-celula$="-0"]`);
      campos?.[campos.length - 1]?.focus();
    }, 0);
  };
  const adicionarColuna = () =>
    onChange({ ...piece, rows: linhas.map((r) => [...r, ""]) });
  const removerColuna = (c: number) =>
    onChange({
      ...piece,
      rows: linhas.map((r) => r.filter((_, j) => j !== c)),
    });

  return (
    <div
      ref={raiz}
      className={`space-y-1.5 rounded-md border border-neutral-200 bg-neutral-50 p-2 ${
        on ? "" : "opacity-50"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium text-neutral-500">Tabela</p>
        <button
          type="button"
          onClick={() => {
            if (confirm("Remover esta tabela?")) onRemove();
          }}
          className="rounded px-1.5 text-[11px] text-neutral-400 hover:text-red-600"
        >
          Remover tabela
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-1">
          <thead>
            <tr>
              {cabecalho.map((celula, c) => (
                <th key={c} className="min-w-[110px] align-top font-normal">
                  <div className="flex items-start gap-0.5">
                    <textarea
                      data-celula={`0-${c}`}
                      value={celula}
                      onChange={(e) => mudarCelula(0, c, e.target.value)}
                      rows={linhasDe(celula)}
                      aria-label={`Cabeçalho ${c + 1}`}
                      placeholder="Coluna"
                      className={`${entrada} bg-neutral-100 font-semibold`}
                    />
                    {colunas > 2 ? (
                      <button
                        type="button"
                        aria-label={`Remover coluna ${c + 1}`}
                        onClick={() => removerColuna(c)}
                        className="rounded px-1 py-1 text-[11px] text-neutral-400 hover:text-red-600"
                      >
                        ✕
                      </button>
                    ) : null}
                  </div>
                </th>
              ))}
              <th className="w-5" />
            </tr>
          </thead>
          <tbody>
            {corpo.map((linha, l) => (
              <tr key={l}>
                {linha.map((celula, c) => (
                  <td key={c} className="align-top">
                    <textarea
                      data-celula={`${l + 1}-${c}`}
                      value={celula}
                      onChange={(e) => mudarCelula(l + 1, c, e.target.value)}
                      onKeyDown={(e) => {
                        // Enter na última célula abre uma linha nova; nas
                        // outras, o Enter segue quebrando linha dentro da
                        // célula.
                        if (
                          e.key === "Enter" &&
                          !e.shiftKey &&
                          l === corpo.length - 1 &&
                          c === colunas - 1
                        ) {
                          e.preventDefault();
                          adicionarLinha();
                        }
                      }}
                      rows={linhasDe(celula)}
                      aria-label={`Linha ${l + 1}, coluna ${c + 1}`}
                      className={entrada}
                    />
                  </td>
                ))}
                <td className="align-top">
                  <button
                    type="button"
                    aria-label={`Remover linha ${l + 1}`}
                    onClick={() =>
                      onChange({
                        ...piece,
                        rows: linhas.filter((_, i) => i !== l + 1),
                      })
                    }
                    disabled={corpo.length <= 1}
                    className="rounded px-1 py-1 text-[11px] text-neutral-400 hover:text-red-600 disabled:opacity-30"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={adicionarLinha}
          className={botaoDiscreto}
        >
          + Linha
        </button>
        <button
          type="button"
          onClick={adicionarColuna}
          className={botaoDiscreto}
        >
          + Coluna
        </button>
      </div>
    </div>
  );
}
