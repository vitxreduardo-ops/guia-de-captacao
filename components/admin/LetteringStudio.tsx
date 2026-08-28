"use client";

import { ArrowDown, ArrowUp, Download, Smile, Trash2, Type, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  layerCorners,
  topmostAt,
  unionBounds,
  type Layer,
  type Size,
} from "@/lib/lettering";
import {
  drawLayer,
  measureLayer,
  EXPORT_SCALE,
  STAGE,
} from "@/lib/letteringDraw";

const SYSTEM_FONTS = [
  { family: '"BootzyTM"', label: "Bootzy" },
  { family: "Georgia, serif", label: "Georgia" },
  { family: "Helvetica, Arial, sans-serif", label: "Helvetica" },
  { family: "'Times New Roman', serif", label: "Times" },
  { family: "'Courier New', monospace", label: "Courier" },
  { family: "Impact, sans-serif", label: "Impact" },
];

/** Fonte de emoji do sistema: o canvas desenha colorido, sem asset nenhum. */
const EMOJI_FAMILY =
  '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

const EMOJI_RAPIDOS = ["✨", "🔥", "❤️", "⭐", "👉", "😂", "🎉", "📍"];

const INPUT =
  "w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none";

const LABEL = "block text-sm font-medium text-neutral-700";

/** Xadrez de fundo: é assim que se enxerga que o PNG saiu mesmo transparente. */
const CHECKERBOARD =
  "repeating-conic-gradient(#e5e5e5 0% 25%, #ffffff 0% 50%) 50% / 16px 16px";

let contador = 0;
function novaCamada(over: Partial<Layer> = {}): Layer {
  contador += 1;
  return {
    id: `camada-${contador}-${Date.now()}`,
    kind: "text",
    text: "Seu lettering aqui",
    family: SYSTEM_FONTS[0].family,
    size: 120,
    color: "#111111",
    align: "center",
    lineHeight: 1.1,
    tracking: 0,
    stroke: 0,
    strokeColor: "#ffffff",
    shadow: false,
    shadowBlur: 12,
    shadowX: 0,
    shadowY: 8,
    shadowColor: "#000000",
    box: false,
    boxColor: "#ffffff",
    boxPadding: 40,
    boxRadius: 24,
    x: STAGE.width / 2,
    y: STAGE.height / 2,
    rotation: 0,
    ...over,
  };
}

export function LetteringStudio() {
  const [layers, setLayers] = useState<Layer[]>(() => [novaCamada()]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** O palco mostra o layout inteiro; o PNG é o que vai ser baixado. */
  const [stagePng, setStagePng] = useState<string | null>(null);
  const [fonts, setFonts] = useState(SYSTEM_FONTS);
  const [fontError, setFontError] = useState<string | null>(null);
  const [trim, setTrim] = useState(true);
  const [png, setPng] = useState<string | null>(null);
  const [sizes, setSizes] = useState<Map<string, Size>>(new Map());

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);

  const selected = layers.find((l) => l.id === selectedId) ?? null;

  /** Camada nova já entra selecionada — é o que a pessoa vai querer editar. */
  function adicionar(layer: Layer) {
    setLayers((atual) => [...atual, layer]);
    setSelectedId(layer.id);
  }

  function remover(id: string) {
    setLayers((atual) => {
      const resto = atual.filter((l) => l.id !== id);
      if (id === selectedId) {
        setSelectedId(resto.length > 0 ? resto[resto.length - 1].id : null);
      }
      return resto;
    });
  }

  useEffect(() => {
    const canvas = canvasRef.current ?? document.createElement("canvas");
    canvasRef.current = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fonte recém-carregada só mede certo depois que o navegador confirma que
    // ela está pronta — sem isso a primeira medição sai com a fonte de sistema.
    const usadas = [...new Set(layers.map((l) => `${l.size}px ${l.family}`))];
    let cancelled = false;

    Promise.all(usadas.map((f) => document.fonts.load(f))).then(() => {
      if (cancelled) return;

      const medidas = new Map<string, Size>();
      layers.forEach((layer) => medidas.set(layer.id, measureLayer(ctx, layer)));

      // Sem recorte o PNG é o palco inteiro; com recorte ele encolhe até o que
      // foi desenhado, que é o que faz a peça virar figurinha em vez de ocupar
      // a tela toda do story.
      const cantos = layers.map((l) => layerCorners(l, medidas.get(l.id)!));
      const cru = unionBounds(cantos);
      // Uma folga em volta do recorte: cortar rente ao glifo deixa o
      // antisserrilhado das bordas encostando no limite do PNG.
      const folga = Math.max(...layers.map((l) => l.size), 0) * 0.08;
      const conteudo = cru
        ? {
            left: cru.left - folga,
            top: cru.top - folga,
            right: cru.right + folga,
            bottom: cru.bottom + folga,
          }
        : null;
      const palco = { left: 0, top: 0, right: STAGE.width, bottom: STAGE.height };

      const desenhar = (area: typeof palco, escala: number) => {
        const width = Math.max(1, area.right - area.left);
        const height = Math.max(1, area.bottom - area.top);
        canvas.width = Math.ceil(width * escala);
        canvas.height = Math.ceil(height * escala);

        // Redimensionar o canvas zera o contexto, então tudo é reaplicado aqui.
        ctx.scale(escala, escala);
        ctx.translate(-area.left, -area.top);

        layers.forEach((layer) => {
          ctx.save();
          ctx.translate(layer.x, layer.y);
          ctx.rotate((layer.rotation * Math.PI) / 180);
          drawLayer(ctx, layer);
          ctx.restore();
        });

        return canvas.toDataURL("image/png");
      };

      // O palco sai em escala 1: é só o que a pessoa vê enquanto monta, e em 3x
      // ficaria um data URL enorme a cada mexida de camada.
      const doPalco = desenhar(palco, 1);
      const paraBaixar =
        trim && conteudo ? desenhar(conteudo, EXPORT_SCALE) : desenhar(palco, EXPORT_SCALE);

      setSizes(medidas);
      setStagePng(doPalco);
      setPng(paraBaixar);
    });

    return () => {
      cancelled = true;
    };
  }, [layers, trim]);

  const patch = useCallback(
    (over: Partial<Layer>) => {
      if (!selectedId) return;
      setLayers((atual) =>
        atual.map((l) => (l.id === selectedId ? { ...l, ...over } : l)),
      );
    },
    [selectedId],
  );

  /** Coordenadas do ponteiro convertidas pro tamanho real do palco. */
  function stagePoint(e: React.PointerEvent) {
    const rect = stageRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * STAGE.width,
      y: ((e.clientY - rect.top) / rect.height) * STAGE.height,
    };
  }

  function onPointerDown(e: React.PointerEvent) {
    const point = stagePoint(e);
    const alvo = topmostAt(point, layers, sizes);
    setSelectedId(alvo?.id ?? null);
    if (!alvo) return;
    dragRef.current = { id: alvo.id, dx: point.x - alvo.x, dy: point.y - alvo.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    const point = stagePoint(e);
    setLayers((atual) =>
      atual.map((l) =>
        l.id === drag.id ? { ...l, x: point.x - drag.dx, y: point.y - drag.dy } : l,
      ),
    );
  }

  function onPointerUp(e: React.PointerEvent) {
    dragRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  function mover(id: string, passo: -1 | 1) {
    setLayers((atual) => {
      const i = atual.findIndex((l) => l.id === id);
      const j = i + passo;
      if (i < 0 || j < 0 || j >= atual.length) return atual;
      const copia = [...atual];
      [copia[i], copia[j]] = [copia[j], copia[i]];
      return copia;
    });
  }

  async function loadFont(file: File) {
    setFontError(null);
    const label = file.name.replace(/\.[^.]+$/, "");
    const custom = `lettering-${label.replace(/[^a-zA-Z0-9]/g, "-")}-${Date.now()}`;
    try {
      const face = new FontFace(custom, await file.arrayBuffer());
      await face.load();
      document.fonts.add(face);
      setFonts((current) => [...current, { family: `"${custom}"`, label }]);
      patch({ family: `"${custom}"` });
    } catch {
      setFontError(
        `Não deu pra ler "${file.name}". O navegador aceita .ttf, .otf, .ttc, .woff e .woff2 — atalho do Finder e arquivo protegido não funcionam.`,
      );
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(300px,380px)_1fr]">
      <div className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
        <div className="space-y-2">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              className="flex-1"
              onClick={() => adicionar(novaCamada({ text: "Texto" }))}
            >
              <Type aria-hidden="true" data-icon="inline-start" />
              Texto
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="flex-1"
              onClick={() =>
                adicionar(
                  novaCamada({
                    kind: "emoji",
                    text: "✨",
                    family: EMOJI_FAMILY,
                    size: 200,
                  }),
                )
              }
            >
              <Smile aria-hidden="true" data-icon="inline-start" />
              Emoji
            </Button>
          </div>

          <ul className="space-y-1">
            {[...layers].reverse().map((layer) => (
              <li key={layer.id}>
                <div
                  className={`flex items-center gap-1 rounded-md border p-1 ${
                    layer.id === selectedId
                      ? "border-neutral-900 bg-neutral-50"
                      : "border-neutral-200"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedId(layer.id)}
                    className="flex-1 truncate px-2 py-1 text-left text-sm"
                  >
                    {layer.text.split("\n")[0] || "(vazio)"}
                  </button>
                  <button
                    type="button"
                    aria-label="Trazer pra frente"
                    onClick={() => mover(layer.id, 1)}
                    className="rounded p-1 text-neutral-500 hover:bg-neutral-100"
                  >
                    <ArrowUp aria-hidden="true" className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Mandar pra trás"
                    onClick={() => mover(layer.id, -1)}
                    className="rounded p-1 text-neutral-500 hover:bg-neutral-100"
                  >
                    <ArrowDown aria-hidden="true" className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Remover camada"
                    onClick={() => remover(layer.id)}
                    className="rounded p-1 text-neutral-500 hover:bg-neutral-100"
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {selected ? (
          <div className="space-y-4 border-t border-neutral-200 pt-4">
            <div className="space-y-1.5">
              <label className={LABEL} htmlFor="lettering-text">
                {selected.kind === "emoji" ? "Emoji" : "Texto"}
              </label>
              <textarea
                id="lettering-text"
                value={selected.text}
                onChange={(e) => patch({ text: e.target.value })}
                rows={selected.kind === "emoji" ? 1 : 3}
                className={INPUT}
              />
              {selected.kind === "emoji" ? (
                <div className="flex flex-wrap gap-1">
                  {EMOJI_RAPIDOS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => patch({ text: emoji })}
                      className="rounded border border-neutral-200 px-2 py-1 text-lg hover:bg-neutral-50"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {selected.kind === "text" ? (
              <div className="space-y-1.5">
                <label className={LABEL} htmlFor="lettering-font">
                  Fonte
                </label>
                <select
                  id="lettering-font"
                  value={selected.family}
                  onChange={(e) => patch({ family: e.target.value })}
                  className={INPUT}
                >
                  {fonts.map((font) => (
                    <option key={font.family} value={font.family}>
                      {font.label}
                    </option>
                  ))}
                </select>
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900">
                  <Upload aria-hidden="true" className="size-4" />
                  Carregar fonte do cliente
                  <input
                    type="file"
                    accept="font/*,.ttf,.otf,.ttc,.woff,.woff2,.TTF,.OTF"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void loadFont(file);
                      e.target.value = "";
                    }}
                  />
                </label>
                {fontError ? (
                  <p role="alert" className="text-sm text-red-600">
                    {fontError}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className={LABEL} htmlFor="lettering-size">
                  Tamanho
                </label>
                <input
                  id="lettering-size"
                  type="number"
                  min={8}
                  max={900}
                  value={selected.size}
                  onChange={(e) => patch({ size: Number(e.target.value) || 8 })}
                  className={INPUT}
                />
              </div>
              <div className="space-y-1.5">
                <label className={LABEL} htmlFor="lettering-rotation">
                  Girar
                </label>
                <input
                  id="lettering-rotation"
                  type="number"
                  min={-180}
                  max={180}
                  value={selected.rotation}
                  onChange={(e) => patch({ rotation: Number(e.target.value) || 0 })}
                  className={INPUT}
                />
              </div>
              <div className="space-y-1.5">
                <label className={LABEL} htmlFor="lettering-color">
                  Cor
                </label>
                <input
                  id="lettering-color"
                  type="color"
                  value={selected.color}
                  onChange={(e) => patch({ color: e.target.value })}
                  className="h-10 w-full rounded-md border border-neutral-200 bg-white p-1"
                />
              </div>
              <div className="space-y-1.5">
                <label className={LABEL} htmlFor="lettering-align">
                  Alinhamento
                </label>
                <select
                  id="lettering-align"
                  value={selected.align}
                  onChange={(e) =>
                    patch({ align: e.target.value as Layer["align"] })
                  }
                  className={INPUT}
                >
                  <option value="left">Esquerda</option>
                  <option value="center">Centro</option>
                  <option value="right">Direita</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className={LABEL} htmlFor="lettering-line-height">
                  Entrelinha
                </label>
                <input
                  id="lettering-line-height"
                  type="number"
                  step={0.05}
                  min={0.5}
                  max={3}
                  value={selected.lineHeight}
                  onChange={(e) =>
                    patch({ lineHeight: Number(e.target.value) || 1 })
                  }
                  className={INPUT}
                />
              </div>
              <div className="space-y-1.5">
                <label className={LABEL} htmlFor="lettering-tracking">
                  Espaçamento
                </label>
                <input
                  id="lettering-tracking"
                  type="number"
                  value={selected.tracking}
                  onChange={(e) => patch({ tracking: Number(e.target.value) || 0 })}
                  className={INPUT}
                />
              </div>
              <div className="space-y-1.5">
                <label className={LABEL} htmlFor="lettering-stroke">
                  Contorno
                </label>
                <input
                  id="lettering-stroke"
                  type="number"
                  min={0}
                  max={60}
                  value={selected.stroke}
                  onChange={(e) =>
                    patch({ stroke: Math.max(0, Number(e.target.value) || 0) })
                  }
                  className={INPUT}
                />
              </div>
              <div className="space-y-1.5">
                <label className={LABEL} htmlFor="lettering-stroke-color">
                  Cor do contorno
                </label>
                <input
                  id="lettering-stroke-color"
                  type="color"
                  value={selected.strokeColor}
                  onChange={(e) => patch({ strokeColor: e.target.value })}
                  disabled={selected.stroke === 0}
                  className="h-10 w-full rounded-md border border-neutral-200 bg-white p-1 disabled:opacity-50"
                />
              </div>
            </div>

            <fieldset className="space-y-3 rounded-md border border-neutral-200 p-3">
              <legend className="px-1">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-neutral-700">
                  <input
                    type="checkbox"
                    checked={selected.shadow}
                    onChange={(e) => patch({ shadow: e.target.checked })}
                    className="size-4 accent-neutral-900"
                  />
                  Sombra projetada
                </label>
              </legend>
              {selected.shadow ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className={LABEL} htmlFor="lettering-shadow-blur">
                      Desfoque
                    </label>
                    <input
                      id="lettering-shadow-blur"
                      type="number"
                      min={0}
                      value={selected.shadowBlur}
                      onChange={(e) =>
                        patch({
                          shadowBlur: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className={INPUT}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className={LABEL} htmlFor="lettering-shadow-color">
                      Cor da sombra
                    </label>
                    <input
                      id="lettering-shadow-color"
                      type="color"
                      value={selected.shadowColor}
                      onChange={(e) => patch({ shadowColor: e.target.value })}
                      className="h-10 w-full rounded-md border border-neutral-200 bg-white p-1"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className={LABEL} htmlFor="lettering-shadow-x">
                      Deslocar X
                    </label>
                    <input
                      id="lettering-shadow-x"
                      type="number"
                      value={selected.shadowX}
                      onChange={(e) => patch({ shadowX: Number(e.target.value) || 0 })}
                      className={INPUT}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className={LABEL} htmlFor="lettering-shadow-y">
                      Deslocar Y
                    </label>
                    <input
                      id="lettering-shadow-y"
                      type="number"
                      value={selected.shadowY}
                      onChange={(e) => patch({ shadowY: Number(e.target.value) || 0 })}
                      className={INPUT}
                    />
                  </div>
                </div>
              ) : null}
            </fieldset>

            <fieldset className="space-y-3 rounded-md border border-neutral-200 p-3">
              <legend className="px-1">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-neutral-700">
                  <input
                    type="checkbox"
                    checked={selected.box}
                    onChange={(e) => patch({ box: e.target.checked })}
                    className="size-4 accent-neutral-900"
                  />
                  Fundo atrás do texto
                </label>
              </legend>
              {selected.box ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className={LABEL} htmlFor="lettering-box-color">
                      Cor do fundo
                    </label>
                    <input
                      id="lettering-box-color"
                      type="color"
                      value={selected.boxColor}
                      onChange={(e) => patch({ boxColor: e.target.value })}
                      className="h-10 w-full rounded-md border border-neutral-200 bg-white p-1"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className={LABEL} htmlFor="lettering-box-radius">
                      Cantos
                    </label>
                    <input
                      id="lettering-box-radius"
                      type="number"
                      min={0}
                      value={selected.boxRadius}
                      onChange={(e) =>
                        patch({
                          boxRadius: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className={INPUT}
                    />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <label className={LABEL} htmlFor="lettering-box-padding">
                      Respiro
                    </label>
                    <input
                      id="lettering-box-padding"
                      type="number"
                      min={0}
                      value={selected.boxPadding}
                      onChange={(e) =>
                        patch({
                          boxPadding: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className={INPUT}
                    />
                    <p className="text-xs text-neutral-500">
                      O fundo acompanha o texto — cantos em 0 deixam quadrado.
                    </p>
                  </div>
                </div>
              ) : null}
            </fieldset>
          </div>
        ) : (
          <p className="border-t border-neutral-200 pt-4 text-sm text-neutral-500">
            Escolha uma camada na lista ou clique nela no palco pra editar.
          </p>
        )}

        <div className="space-y-2 border-t border-neutral-200 pt-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={trim}
              onChange={(e) => setTrim(e.target.checked)}
              className="size-4 accent-neutral-900"
            />
            Cortar no conteúdo (figurinha)
          </label>

          <Button
            render={<a href={png ?? "#"} download="lettering.png" />}
            // Baixar é um link com download, não um botão: sem isso o Base UI
            // avisa que as semânticas nativas de <button> se perdem.
            nativeButton={false}
            size="lg"
            className="w-full"
          >
            <Download aria-hidden="true" data-icon="inline-start" />
            Baixar PNG
          </Button>

          <p className="text-sm text-neutral-500">
            No celular: segure o dedo na imagem ao lado e escolha &quot;Adicionar
            às Fotos&quot;. Depois é só usar o sticker de foto no story.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div
          ref={stageRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{ background: CHECKERBOARD, aspectRatio: "1080 / 1920" }}
          className="relative mx-auto w-full max-w-sm touch-none overflow-hidden rounded-lg border border-neutral-200 select-none"
        >
          {stagePng ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={stagePng}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 size-full"
            />
          ) : null}

          {/* A moldura de seleção é uma div por cima, nunca parte do desenho —
              assim ela não tem como vazar pro PNG. */}
          {selected && sizes.has(selected.id) ? (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute border-2 border-dashed border-neutral-900/70"
              style={{
                left: `${(selected.x / STAGE.width) * 100}%`,
                top: `${(selected.y / STAGE.height) * 100}%`,
                width: `${(sizes.get(selected.id)!.width / STAGE.width) * 100}%`,
                height: `${(sizes.get(selected.id)!.height / STAGE.height) * 100}%`,
                transform: `translate(-50%, -50%) rotate(${selected.rotation}deg)`,
              }}
            />
          ) : null}
        </div>

        <div
          style={{ background: CHECKERBOARD }}
          className="grid min-h-32 place-items-center rounded-lg border border-neutral-200 p-4"
        >
          {png ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={png}
              alt="Prévia do lettering"
              className="max-h-64 w-auto max-w-full"
            />
          ) : (
            <p className="text-sm text-neutral-500">
              Escreva algo pra ver a prévia.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
