"use client";

import { useRef, useState } from "react";
import { formatBRL } from "@/lib/billingTypes";

/**
 * Linha suave dos últimos meses, só SVG (nada de JS no navegador). O último
 * ponto é o mês aberto e leva um marcador. A cor não carrega sentido sozinha:
 * cada mês tem rótulo embaixo e o valor do último vem escrito acima.
 */
type Item = { name: string; cents: number };

/** Lista curta no cartão: os maiores primeiro e "e mais N" pro resto. */
function Detalhe({ titulo, itens, tom }: { titulo: string; itens: Item[]; tom: string }) {
  if (itens.length === 0) return null;
  const topo = itens.slice(0, 4);
  const resto = itens.slice(4);
  return (
    <div className="mt-2">
      <p className="text-xs font-medium tracking-wide text-neutral-500 uppercase">{titulo}</p>
      <ul>
        {topo.map((i, idx) => (
          <li key={i.name + idx} className="flex justify-between gap-3">
            <span className="min-w-0 truncate text-neutral-800">{i.name}</span>
            <span className={`tabular-nums ${tom}`}>{formatBRL(i.cents)}</span>
          </li>
        ))}
        {resto.length > 0 ? (
          <li className="flex justify-between gap-3 text-neutral-500">
            <span>e mais {resto.length}</span>
            <span className="tabular-nums">{formatBRL(resto.reduce((s, i) => s + i.cents, 0))}</span>
          </li>
        ) : null}
      </ul>
    </div>
  );
}

export function EntradasLinha({
  points,
  saidas,
}: {
  points: {
    label: string;
    title: string;
    cents: number;
    /** Quem pagou nesse mês. */
    clientes?: Item[];
    /** O que saiu nesse mês. */
    saidas?: Item[];
  }[];
  /** Segunda linha (o que saiu), tracejada pra não depender só da cor. */
  saidas?: number[];
}) {
  const W = 600;
  const H = 140;
  const PAD = 12;
  const max = Math.max(1, ...points.map((p) => p.cents), ...(saidas ?? []));
  const step = points.length > 1 ? (W - PAD * 2) / (points.length - 1) : 0;
  const toXY = (values: number[]) =>
    values.map((v, i) => ({
      x: PAD + i * step,
      y: H - PAD - (v / max) * (H - PAD * 2),
    }));

  // Catmull-Rom → Bézier: curva suave passando por todos os pontos.
  const curveOf = (xy: { x: number; y: number }[]) =>
    xy.reduce((d, p, i, a) => {
      if (i === 0) return `M${p.x},${p.y}`;
      const p0 = a[i - 2] ?? a[i - 1];
      const p1 = a[i - 1];
      const p3 = a[i + 1] ?? p;
      const c1 = { x: p1.x + (p.x - p0.x) / 6, y: p1.y + (p.y - p0.y) / 6 };
      const c2 = { x: p.x - (p3.x - p1.x) / 6, y: p.y - (p3.y - p1.y) / 6 };
      return `${d} C${c1.x},${c1.y} ${c2.x},${c2.y} ${p.x},${p.y}`;
    }, "");

  const xy = toXY(points.map((p) => p.cents));
  const curve = curveOf(xy);
  const last = xy[xy.length - 1];
  const area = last ? `${curve} L${last.x},${H} L${xy[0].x},${H} Z` : "";
  const outXY = saidas ? toXY(saidas) : null;
  // Mês sob o mouse, o dedo ou o foco do teclado.
  const [ativo, setAtivo] = useState<number | null>(null);
  const a = ativo === null ? null : points[ativo];
  const entrouAtivo = a?.cents ?? 0;
  const saiuAtivo = ativo === null ? 0 : (saidas?.[ativo] ?? 0);
  // Cartão que segue o mouse (telas largas): fica ao lado do ponteiro e vira
  // pro outro lado quando falta espaço, pra nunca cobrir o que se quer ler.
  const cartaoRef = useRef<HTMLDivElement>(null);
  const [lugar, setLugar] = useState<{ left: number; top: number } | null>(null);
  const posicionar = (x: number, y: number) => {
    const w = cartaoRef.current?.offsetWidth ?? 256;
    const h = cartaoRef.current?.offsetHeight ?? 320;
    const gap = 18;
    const margem = 8;
    let left = x + gap;
    if (left + w > window.innerWidth - margem) left = x - gap - w;
    let top = y + gap;
    if (top + h > window.innerHeight - margem) top = y - gap - h;
    setLugar({
      left: Math.max(margem, left),
      top: Math.max(margem, top),
    });
  };

  // Pontos em HTML, não em SVG: o gráfico estica com a largura da tela e um
  // círculo de SVG viraria elipse.
  const dot = (p: { x: number; y: number }, cor: string) => (
    <span
      aria-hidden
      className={`pointer-events-none absolute size-3 rounded-full border-2 border-white ${cor}`}
      style={{ left: `${(p.x / W) * 100}%`, top: `${(p.y / H) * 100}%`, transform: "translate(-50%, -50%)" }}
    />
  );

  const cartao = a ? (
    <>
      <p className="mb-1.5 font-semibold text-neutral-900 first-letter:uppercase">{a.title}</p>
      <p className="flex justify-between gap-3 text-neutral-700">
        <span>Entrou</span>
        <span className="font-medium tabular-nums text-emerald-700">{formatBRL(entrouAtivo)}</span>
      </p>
      {saidas ? (
        <>
          <p className="flex justify-between gap-3 text-neutral-700">
            <span>Saiu</span>
            <span className="font-medium tabular-nums text-neutral-900">{formatBRL(saiuAtivo)}</span>
          </p>
          <p className="mt-1 flex justify-between gap-3 border-t border-neutral-100 pt-1 text-neutral-700">
            <span>Sobrou</span>
            <span className={`font-semibold tabular-nums ${entrouAtivo - saiuAtivo < 0 ? "text-red-700" : "text-neutral-900"}`}>
              {formatBRL(entrouAtivo - saiuAtivo)}
            </span>
          </p>
        </>
      ) : null}
      <Detalhe titulo="Quem pagou" itens={a.clientes ?? []} tom="text-emerald-700" />
      {saidas ? <Detalhe titulo="O que saiu" itens={a.saidas ?? []} tom="text-neutral-900" /> : null}
    </>
  ) : null;

  return (
    <figure
      className="m-0"
      onMouseLeave={() => {
        setAtivo(null);
        setLugar(null);
      }}
    >
      {saidas ? (
        <p className="mb-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-neutral-700">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="h-0.5 w-5 bg-emerald-600" /> Entrou
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="w-5 border-t-2 border-dashed border-neutral-600" /> Saiu
          </span>
        </p>
      ) : null}

      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`Entrou mês a mês: ${points
            .map((p, i) => `${p.label} ${formatBRL(p.cents)}${saidas ? `, saiu ${formatBRL(saidas[i] ?? 0)}` : ""}`)
            .join("; ")}`}
          className="h-36 w-full"
        >
          <path d={area} className="fill-emerald-500/10" />
          <path d={curve} fill="none" className="stroke-emerald-600" strokeWidth={2.5} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          {outXY ? (
            <path d={curveOf(outXY)} fill="none" className="stroke-neutral-600" strokeWidth={2} strokeDasharray="6 5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          ) : null}
          {ativo !== null ? (
            <line x1={xy[ativo].x} x2={xy[ativo].x} y1={0} y2={H} className="stroke-neutral-300" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          ) : null}
        </svg>

        {last ? dot(last, "bg-emerald-600") : null}
        {ativo !== null && ativo !== xy.length - 1 ? dot(xy[ativo], "bg-emerald-600") : null}
        {ativo !== null && outXY ? dot(outXY[ativo], "bg-neutral-600") : null}

        {/* Uma faixa por mês, sobre o gráfico: o mouse, o toque e o Tab chegam
            todos no mesmo lugar. */}
        <div className="absolute inset-0 flex">
          {points.map((p, i) => (
            <button
              key={p.label + i}
              type="button"
              aria-label={`${p.title}: entrou ${formatBRL(p.cents)}${saidas ? `, saiu ${formatBRL(saidas[i] ?? 0)}` : ""}`}
              onMouseEnter={(e) => {
                setAtivo(i);
                posicionar(e.clientX, e.clientY);
              }}
              onMouseMove={(e) => posicionar(e.clientX, e.clientY)}
              onFocus={(e) => {
                setAtivo(i);
                const r = e.currentTarget.getBoundingClientRect();
                posicionar(r.left + r.width / 2, r.top + r.height / 2);
              }}
              onBlur={() => setAtivo(null)}
              onClick={() => setAtivo(i)}
              className="h-full flex-1 cursor-default focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none"
            />
          ))}
        </div>

      </div>

      {/* Telas largas: o cartão acompanha o mouse em qualquer posição. */}
      {cartao && lugar ? (
        <div
          ref={cartaoRef}
          className="pointer-events-none fixed z-50 hidden w-64 rounded-lg border border-neutral-200 bg-white p-3 text-sm shadow-lg sm:block"
          style={{ left: lugar.left, top: lugar.top }}
        >
          {cartao}
        </div>
      ) : null}

      <figcaption className="mt-1 flex justify-between text-xs text-neutral-600 sm:text-sm">
        {points.map((p) => (
          <span key={p.label}>{p.label}</span>
        ))}
      </figcaption>

      {/* Celular: o cartão vem embaixo, sem cobrir o gráfico. */}
      <div role="status" className="sm:hidden">
        {cartao ? (
          <div className="mt-3 rounded-lg border border-neutral-200 bg-white p-3 text-sm">{cartao}</div>
        ) : (
          <p className="mt-3 text-sm text-neutral-500">Toque num mês para ver quem pagou e o que saiu.</p>
        )}
      </div>
    </figure>
  );
}
