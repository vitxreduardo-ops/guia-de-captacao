"use client";

import {
  Download,
  GripVertical,
  Layers,
  Move,
  RotateCw,
  Smile,
  Trash2,
  Type,
  Upload,
  X,
} from "lucide-react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  angle,
  clamp,
  distance,
  layerCorners,
  shortestTurn,
  topmostAt,
  unionBounds,
  type Layer,
  type Point,
  type Size,
} from "@/lib/lettering";
import {
  drawLayer,
  measureLayer,
  safeScale,
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
  "w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-base text-neutral-900 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:outline-none";

const LABEL = "block text-sm font-medium text-neutral-700";

/** Xadrez de fundo: é assim que se enxerga que o PNG saiu mesmo transparente. */
const CHECKERBOARD =
  "repeating-conic-gradient(#e5e5e5 0% 25%, #ffffff 0% 50%) 50% / 16px 16px";

type Aba = "conteudo" | "estilo" | "efeitos";

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
  const [inicial] = useState(novaCamada);
  const [layers, setLayers] = useState<Layer[]>(() => [inicial]);
  // A primeira camada já entra escolhida: abrir a tela num estado em que nada
  // pode ser editado só rende um toque a mais.
  const [selectedId, setSelectedId] = useState<string | null>(inicial.id);
  const [fonts, setFonts] = useState(SYSTEM_FONTS);
  const [fontError, setFontError] = useState<string | null>(null);
  const [trim, setTrim] = useState(true);
  const [aba, setAba] = useState<Aba>("conteudo");
  const [camadasAbertas, setCamadasAbertas] = useState(false);
  const [sizes, setSizes] = useState<Map<string, Size>>(new Map());
  /** PNG só existe depois de pedir: gerar em 3x a cada toque trava o celular. */
  const [png, setPng] = useState<string | null>(null);

  const stageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const exportCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  /** Dedos em cima do palco, por pointerId. */
  const pointersRef = useRef<Map<number, Point>>(new Map());
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const pinchRef = useRef<{
    id: string;
    distancia: number;
    angulo: number;
    size: number;
    rotation: number;
  } | null>(null);
  /** Mesma conta da pinça, mas com um dedo só, puxando a alça do canto. */
  const alcaRef = useRef<{
    id: string;
    distancia: number;
    angulo: number;
    size: number;
    rotation: number;
  } | null>(null);

  const selected = layers.find((l) => l.id === selectedId) ?? null;

  const sensors = useSensors(
    // Sem a distância mínima, o toque que escolhe a camada viraria arraste.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  /** Desenha o palco na resolução da tela — é a única visualização que existe. */
  useEffect(() => {
    const canvas = stageCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fonte recém-carregada só mede certo depois que o navegador confirma que
    // ela está pronta — sem isso a primeira medição sai com a fonte de sistema.
    const usadas = [...new Set(layers.map((l) => `${l.size}px ${l.family}`))];
    let cancelled = false;

    // Se o navegador recusar a string da fonte — o Safari é mais rígido com a
    // lista de famílias — o desenho tem que acontecer do mesmo jeito, com a
    // fonte que houver. Antes, uma recusa aqui deixava o palco vazio.
    const prontas = Promise.all(
      usadas.map((f) => document.fonts.load(f).catch(() => null)),
    );

    prontas.then(() => {
      if (cancelled) return;

      const medidas = new Map<string, Size>();
      layers.forEach((layer) => medidas.set(layer.id, measureLayer(ctx, layer)));

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(canvas.width / STAGE.width, canvas.height / STAGE.height);

      layers.forEach((layer) => {
        ctx.save();
        ctx.translate(layer.x, layer.y);
        ctx.rotate((layer.rotation * Math.PI) / 180);
        drawLayer(ctx, layer);
        ctx.restore();
      });

      setSizes(medidas);
    });

    return () => {
      cancelled = true;
    };
  }, [layers]);

  /**
   * Rede de segurança pros gestos do palco: se o dedo levantar fora dele — ou
   * o navegador cancelar o toque — o gesto tem que morrer junto, senão ele
   * continua valendo no toque seguinte.
   */
  useEffect(() => {
    const encerrar = () => {
      pointersRef.current.clear();
      pinchRef.current = null;
      dragRef.current = null;
    };
    window.addEventListener("pointerup", encerrar);
    window.addEventListener("pointercancel", encerrar);
    return () => {
      window.removeEventListener("pointerup", encerrar);
      window.removeEventListener("pointercancel", encerrar);
    };
  }, []);

  const patch = useCallback(
    (over: Partial<Layer>) => {
      if (!selectedId) return;
      setLayers((atual) =>
        atual.map((l) => (l.id === selectedId ? { ...l, ...over } : l)),
      );
    },
    [selectedId],
  );

  /** Coordenadas do dedo convertidas pro tamanho real do palco. */
  function stagePoint(e: React.PointerEvent): Point {
    const rect = stageRef.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * STAGE.width,
      y: ((e.clientY - rect.top) / rect.height) * STAGE.height,
    };
  }

  function onPointerDown(e: React.PointerEvent) {
    const point = stagePoint(e);
    pointersRef.current.set(e.pointerId, point);

    const dedos = [...pointersRef.current.values()];
    if (dedos.length === 2 && selected) {
      // Dois dedos no palco: escala e gira a camada já escolhida, em vez de
      // trocar de camada no meio do gesto.
      dragRef.current = null;
      pinchRef.current = {
        id: selected.id,
        distancia: distance(dedos[0], dedos[1]),
        angulo: angle(dedos[0], dedos[1]),
        size: selected.size,
        rotation: selected.rotation,
      };
      capturar(e);
      return;
    }

    const alvo = topmostAt(point, layers, sizes);
    setSelectedId(alvo?.id ?? null);
    if (!alvo) return;
    dragRef.current = { id: alvo.id, dx: point.x - alvo.x, dy: point.y - alvo.y };
    capturar(e);
  }

  /**
   * A captura é o que mantém o arrastar vivo quando o dedo sai do palco. Ela
   * pode ser recusada (ponteiro já solto, por exemplo), e aí o gesto continua
   * valendo — por isso nunca pode derrubar o resto do toque.
   */
  function capturar(e: React.PointerEvent) {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // sem captura o arrastar ainda funciona dentro do palco
    }
  }

  /**
   * Puxar a alça: a distância até o centro vira tamanho, o ângulo vira giro.
   *
   * O gesto é acompanhado no window, não no próprio botão. Esperar o
   * "pointerup" chegar na alça deixava o giro preso quando o evento se perdia
   * — e só soltava ao tocar em outro lugar da tela.
   */
  function onAlcaDown(e: React.PointerEvent) {
    if (!selected) return;
    // Sem isto o toque na alça viraria arrastar da camada logo abaixo dela.
    e.stopPropagation();
    const centro = { x: selected.x, y: selected.y };
    const inicio = stagePoint(e);
    const base = {
      id: selected.id,
      distancia: Math.max(1, distance(centro, inicio)),
      angulo: angle(centro, inicio),
      size: selected.size,
      rotation: selected.rotation,
    };
    alcaRef.current = base;

    const mover = (ev: PointerEvent) => {
      const rect = stageRef.current?.getBoundingClientRect();
      if (!rect) return;
      const point = {
        x: ((ev.clientX - rect.left) / rect.width) * STAGE.width,
        y: ((ev.clientY - rect.top) / rect.height) * STAGE.height,
      };
      const escala = distance(centro, point) / base.distancia;
      const giro = shortestTurn(base.angulo, angle(centro, point));
      setLayers((atual) =>
        atual.map((l) =>
          l.id === base.id
            ? {
                ...l,
                size: Math.round(clamp(base.size * escala, 8, 900)),
                rotation: Math.round(clamp(base.rotation + giro, -180, 180)),
              }
            : l,
        ),
      );
    };

    const soltar = () => {
      alcaRef.current = null;
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
      window.removeEventListener("pointercancel", soltar);
    };

    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
    window.addEventListener("pointercancel", soltar);
  }

  /**
   * Botão de mover: a camada anda o mesmo tanto que o dedo, em vez de pular
   * pra baixo dele — o dedo está no canto do palco, longe da peça.
   */
  function onMoverDown(e: React.PointerEvent) {
    if (!selected) return;
    e.stopPropagation();
    const inicio = stagePoint(e);
    const base = { id: selected.id, x: selected.x, y: selected.y };

    const mover = (ev: PointerEvent) => {
      const rect = stageRef.current?.getBoundingClientRect();
      if (!rect) return;
      const ponto = {
        x: ((ev.clientX - rect.left) / rect.width) * STAGE.width,
        y: ((ev.clientY - rect.top) / rect.height) * STAGE.height,
      };
      setLayers((atual) =>
        atual.map((l) =>
          l.id === base.id
            ? {
                ...l,
                x: base.x + (ponto.x - inicio.x),
                y: base.y + (ponto.y - inicio.y),
              }
            : l,
        ),
      );
    };

    const soltar = () => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
      window.removeEventListener("pointercancel", soltar);
    };

    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
    window.addEventListener("pointercancel", soltar);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, stagePoint(e));
    const dedos = [...pointersRef.current.values()];

    const pinch = pinchRef.current;
    if (pinch && dedos.length < 2) pinchRef.current = null;
    if (pinch && dedos.length >= 2) {
      const escala = distance(dedos[0], dedos[1]) / (pinch.distancia || 1);
      const giro = shortestTurn(pinch.angulo, angle(dedos[0], dedos[1]));
      setLayers((atual) =>
        atual.map((l) =>
          l.id === pinch.id
            ? {
                ...l,
                size: Math.round(clamp(pinch.size * escala, 8, 900)),
                rotation: Math.round(clamp(pinch.rotation + giro, -180, 180)),
              }
            : l,
        ),
      );
      return;
    }

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
    pointersRef.current.delete(e.pointerId);
    const dedos = [...pointersRef.current.values()];

    // Tirar um dedo tem que encerrar a pinça na hora. Enquanto isso dependia
    // de todos os "pointerup" chegarem, um evento perdido deixava o giro
    // ligado pra sempre: a camada seguia girando ao encostar no palco.
    if (dedos.length < 2) pinchRef.current = null;

    if (dedos.length === 0) {
      dragRef.current = null;
    } else if (dedos.length === 1 && selected && !dragRef.current) {
      // Sobrou um dedo depois da pinça: ele volta a arrastar, em vez de a
      // camada ficar presa até levantar tudo.
      dragRef.current = {
        id: selected.id,
        dx: dedos[0].x - selected.x,
        dy: dedos[0].y - selected.y,
      };
    }

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // ponteiro já solto pelo navegador
    }
  }

  /** O navegador pode tirar a captura sozinho — aí o gesto acabou. */
  function onLostCapture(e: React.PointerEvent) {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (pointersRef.current.size === 0) dragRef.current = null;
  }

  /**
   * O PNG de verdade sai só quando pedido, num canvas separado: é 3x maior que
   * o palco e recortado, e refazer isso a cada arrastada engasga no celular.
   */
  function gerarPng() {
    const canvas =
      exportCanvasRef.current ?? document.createElement("canvas");
    exportCanvasRef.current = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cantos = layers.map((l) => layerCorners(l, sizes.get(l.id)!));
    const cru = unionBounds(cantos);
    // Uma folga em volta do recorte: cortar rente ao glifo deixa o
    // antisserrilhado das bordas encostando no limite do PNG.
    const folga = Math.max(...layers.map((l) => l.size), 0) * 0.08;
    const area =
      trim && cru
        ? {
            left: cru.left - folga,
            top: cru.top - folga,
            right: cru.right + folga,
            bottom: cru.bottom + folga,
          }
        : { left: 0, top: 0, right: STAGE.width, bottom: STAGE.height };

    const width = Math.max(1, area.right - area.left);
    const height = Math.max(1, area.bottom - area.top);
    const escala = safeScale(width, height);
    canvas.width = Math.ceil(width * escala);
    canvas.height = Math.ceil(height * escala);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(escala, escala);
    ctx.translate(-area.left, -area.top);

    layers.forEach((layer) => {
      ctx.save();
      ctx.translate(layer.x, layer.y);
      ctx.rotate((layer.rotation * Math.PI) / 180);
      drawLayer(ctx, layer);
      ctx.restore();
    });

    setPng(canvas.toDataURL("image/png"));
  }

  function adicionar(layer: Layer) {
    setLayers((atual) => [...atual, layer]);
    setSelectedId(layer.id);
    setAba("conteudo");
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

  /**
   * A lista mostra a camada da frente em cima; o desenho pinta na ordem
   * inversa. A conversão fica só aqui, pra não espalhar índice invertido.
   */
  const daFrentePraTras = [...layers].reverse();

  function reordenar(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const de = daFrentePraTras.findIndex((l) => l.id === active.id);
    const para = daFrentePraTras.findIndex((l) => l.id === over.id);
    if (de < 0 || para < 0) return;
    setLayers(arrayMove(daFrentePraTras, de, para).reverse());
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

  const chip =
    "shrink-0 rounded-full border px-3 py-2 text-sm whitespace-nowrap";

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3 lg:max-w-none lg:grid lg:grid-cols-[1fr_minmax(320px,400px)] lg:items-start">
      {/* O palco é a peça: no celular ele fica no topo e gruda, pra editar
          vendo o resultado sem precisar rolar a página. */}
      <div className="sticky top-0 z-10 -mx-4 bg-neutral-50 px-4 py-2 lg:static lg:mx-0 lg:bg-transparent lg:p-0">
        <div
          ref={stageRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={onPointerUp}
          onLostPointerCapture={onLostCapture}
          style={{
            background: CHECKERBOARD,
            aspectRatio: `${STAGE.width} / ${STAGE.height}`,
          }}
          className="relative w-full touch-none overflow-hidden rounded-lg border border-neutral-200 select-none"
        >
          <canvas
            ref={stageCanvasRef}
            width={STAGE.width}
            height={STAGE.height}
            className="size-full"
          />

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

          {/* A alça mora num canto do palco, não em cima da camada. No canto
              da moldura ela cobria justamente a área que se quer arrastar — e
              sumia da tela quando a camada passava da borda. */}
          {selected ? (
            <>
              <button
                type="button"
                aria-label="Mover a camada"
                onPointerDown={onMoverDown}
                className="absolute bottom-3 left-3 grid size-12 touch-none place-items-center rounded-full border border-neutral-200 bg-white/95 text-neutral-700 shadow-md"
              >
                <Move aria-hidden="true" className="size-5" />
              </button>
              <button
                type="button"
                aria-label="Girar e redimensionar"
                onPointerDown={onAlcaDown}
                className="absolute right-3 bottom-3 grid size-12 touch-none place-items-center rounded-full border border-neutral-200 bg-white/95 text-neutral-700 shadow-md"
              >
                <RotateCw aria-hidden="true" className="size-5" />
              </button>
            </>
          ) : null}
        </div>

        <p className="mt-1 text-center text-xs text-neutral-500">
          Arraste a peça ou use os botões do palco: um move, o outro gira e
          muda o tamanho. Dois dedos fazem as duas coisas juntas.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => adicionar(novaCamada({ text: "Texto" }))}
            className={`${chip} flex-1 border-neutral-900 bg-neutral-900 text-white`}
          >
            <Type aria-hidden="true" className="mr-1 inline size-4" />
            Texto
          </button>
          <button
            type="button"
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
            className={`${chip} flex-1 border-neutral-900 bg-neutral-900 text-white`}
          >
            <Smile aria-hidden="true" className="mr-1 inline size-4" />
            Emoji
          </button>
          <button
            type="button"
            onClick={() => setCamadasAbertas((aberto) => !aberto)}
            aria-expanded={camadasAbertas}
            aria-controls="lettering-camadas-lista"
            className={`${chip} flex-1 ${
              camadasAbertas
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-200 bg-white text-neutral-700"
            }`}
          >
            <Layers aria-hidden="true" className="mr-1 inline size-4" />
            Camadas
          </button>
        </div>

        {/* A lista vem de cima pra baixo como as camadas aparecem na peça: a
            primeira linha é a que fica na frente. */}
        <div
          id="lettering-camadas-lista"
          hidden={!camadasAbertas}
          className="rounded-lg border border-neutral-200 bg-white p-2"
        >
          <DndContext
            // Id fixo: sem ele o dnd-kit numera os textos de acessibilidade em
            // ordem de montagem, e servidor e cliente chegam a números
            // diferentes.
            id="lettering-camadas"
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={reordenar}
          >
            <SortableContext
              items={daFrentePraTras.map((l) => l.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-1">
                {daFrentePraTras.map((layer) => (
                  <LinhaDeCamada
                    key={layer.id}
                    layer={layer}
                    selecionada={layer.id === selectedId}
                    onSelecionar={() => setSelectedId(layer.id)}
                    onRemover={() => remover(layer.id)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </div>

        {selected ? (
          <div className="rounded-lg border border-neutral-200 bg-white">
            <div className="flex items-center gap-1 border-b border-neutral-200 p-2">
              {(
                [
                  ["conteudo", "Conteúdo"],
                  ["estilo", "Estilo"],
                  ["efeitos", "Efeitos"],
                ] as const
              ).map(([id, rotulo]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setAba(id)}
                  className={`flex-1 rounded-md px-2 py-2 text-sm ${
                    aba === id
                      ? "bg-neutral-900 text-white"
                      : "text-neutral-600 hover:bg-neutral-100"
                  }`}
                >
                  {rotulo}
                </button>
              ))}
            </div>

            <div className="space-y-3 p-3">
              {aba === "conteudo" ? (
                <>
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
                            className="rounded border border-neutral-200 px-3 py-2 text-lg hover:bg-neutral-50"
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
                      <label className="inline-flex cursor-pointer items-center gap-2 py-2 text-sm text-neutral-600">
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
                </>
              ) : null}

              {aba === "estilo" ? (
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
                      onChange={(e) =>
                        patch({ rotation: Number(e.target.value) || 0 })
                      }
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
                      className="h-11 w-full rounded-md border border-neutral-200 bg-white p-1"
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
                      onChange={(e) =>
                        patch({ tracking: Number(e.target.value) || 0 })
                      }
                      className={INPUT}
                    />
                  </div>
                </div>
              ) : null}

              {aba === "efeitos" ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
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
                        className="h-11 w-full rounded-md border border-neutral-200 bg-white p-1 disabled:opacity-50"
                      />
                    </div>
                  </div>

                  <label className="flex cursor-pointer items-center gap-2 py-1 text-sm font-medium text-neutral-700">
                    <input
                      type="checkbox"
                      checked={selected.shadow}
                      onChange={(e) => patch({ shadow: e.target.checked })}
                      className="size-5 accent-neutral-900"
                    />
                    Sombra projetada
                  </label>
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
                          className="h-11 w-full rounded-md border border-neutral-200 bg-white p-1"
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
                          onChange={(e) =>
                            patch({ shadowX: Number(e.target.value) || 0 })
                          }
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
                          onChange={(e) =>
                            patch({ shadowY: Number(e.target.value) || 0 })
                          }
                          className={INPUT}
                        />
                      </div>
                    </div>
                  ) : null}

                  <label className="flex cursor-pointer items-center gap-2 py-1 text-sm font-medium text-neutral-700">
                    <input
                      type="checkbox"
                      checked={selected.box}
                      onChange={(e) => patch({ box: e.target.checked })}
                      className="size-5 accent-neutral-900"
                    />
                    Fundo atrás do texto
                  </label>
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
                          className="h-11 w-full rounded-md border border-neutral-200 bg-white p-1"
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
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-500">
            Toque numa camada no palco ou na fita acima pra editar.
          </p>
        )}

        <div className="space-y-2 rounded-lg border border-neutral-200 bg-white p-3">
          <label className="flex cursor-pointer items-center gap-2 py-1 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={trim}
              onChange={(e) => setTrim(e.target.checked)}
              className="size-5 accent-neutral-900"
            />
            Cortar no conteúdo (figurinha)
          </label>

          <Button size="lg" className="w-full" onClick={gerarPng}>
            <Download aria-hidden="true" data-icon="inline-start" />
            Gerar PNG
          </Button>
        </div>
      </div>

      {/* O PNG aparece numa folha por cima: no celular é aqui que se segura o
          dedo pra salvar em Fotos, que é o único caminho que o iOS oferece. */}
      {png ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-neutral-900/80 p-4">
          <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-3 overflow-auto rounded-lg bg-white p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-medium text-neutral-900">
                Seu lettering
              </h2>
              <button
                type="button"
                aria-label="Fechar"
                onClick={() => setPng(null)}
                className="rounded-md p-2 text-neutral-500 hover:bg-neutral-100"
              >
                <X aria-hidden="true" className="size-5" />
              </button>
            </div>

            <div
              style={{ background: CHECKERBOARD }}
              className="grid flex-1 place-items-center rounded-md border border-neutral-200 p-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={png}
                alt="Lettering pronto"
                className="max-h-[50svh] w-auto max-w-full"
              />
            </div>

            <p className="text-sm text-neutral-600">
              No celular: segure o dedo na imagem e escolha &quot;Adicionar às
              Fotos&quot;. Depois é só usar o sticker de foto no story.
            </p>

            <Button
              render={<a href={png} download="lettering.png" />}
              // Baixar é um link com download, não um botão: sem isso o Base UI
              // avisa que as semânticas nativas de <button> se perdem.
              nativeButton={false}
              size="lg"
              className="w-full"
            >
              <Download aria-hidden="true" data-icon="inline-start" />
              Baixar no computador
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function LinhaDeCamada({
  layer,
  selecionada,
  onSelecionar,
  onRemover,
}: {
  layer: Layer;
  selecionada: boolean;
  onSelecionar: () => void;
  onRemover: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: layer.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "opacity-40" : ""}
    >
      <div
        className={`flex items-center gap-1 rounded-md border ${
          selecionada
            ? "border-neutral-900 bg-neutral-50"
            : "border-neutral-200 bg-white"
        }`}
      >
        <button
          type="button"
          aria-label="Mudar a ordem"
          className="cursor-grab touch-none p-2 text-neutral-400"
          {...attributes}
          {...listeners}
        >
          <GripVertical aria-hidden="true" className="size-4" />
        </button>
        <button
          type="button"
          onClick={onSelecionar}
          className="flex-1 truncate py-3 pr-2 text-left text-sm"
        >
          {layer.text.split("\n")[0] || "(vazio)"}
        </button>
        <button
          type="button"
          aria-label="Remover camada"
          onClick={onRemover}
          className="p-3 text-neutral-500"
        >
          <Trash2 aria-hidden="true" className="size-4" />
        </button>
      </div>
    </li>
  );
}
