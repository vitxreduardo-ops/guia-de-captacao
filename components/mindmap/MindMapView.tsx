"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown, ChevronLeft, ChevronRight, CornerDownRight, Download, ExternalLink, Link2,
  Maximize, Minimize, Minus, Play, Plus, Redo2, Scan, SlidersHorizontal, StickyNote,
  Layers, Magnet, Move, Palette, RotateCcw, Trash2, Undo2, X,
} from "lucide-react";
import {
  DEFAULT_BOX, GRID, flipIfCrossed, PALETTE, isDark, setBoxColorAll, addChild, clearOffsets, addSibling, findNode, layout, moveNode, newId, preorder,
  removeNode, revealUpTo, snap, updateNode, type MindNode, type NodePatch, type Placed,
} from "@/lib/mindMap";
import { download, svgToPng, toSvg } from "@/lib/mindMapExport";

// Tema Tatú: fundo branco pontilhado, texto tinta, barras num cinza-esverdeado. As cores
// dos ramos e linhas (PALETTE) não entram aqui de propósito: são do mapa.
const DEFAULT_BG = "#ffffff";
const DEFAULT_DOT = 0.35;
const BOX_COLORS = ["#2f3b1e", "#e4e6d6", "#ffffff", "#fff6e3", ...PALETTE];
const BG_PRESETS = ["#ffffff", "#fff6e3", "#eef0e2", "#f1f1ef", "#eaf1fb", "#2b3236"];
const INK = "#2f3b1e";
const BAR =
  "rounded-lg border border-[#838059]/25 bg-[#e4e6d6]/95 text-[#2f3b1e] shadow-sm backdrop-blur";
const BTN =
  "grid size-8 place-items-center rounded-md text-[#2f3b1e]/75 transition hover:bg-[#838059]/15 hover:text-[#2f3b1e] active:scale-95 disabled:pointer-events-none disabled:opacity-30";

const EMOJIS = ["🎯", "📈", "💡", "🔥", "⭐", "✅", "📣", "🎬", "📸", "💰", "🧠", "❤️", "🚀", "👥", "🏆", "⚠️", "📅", "🛒"];

type View = { x: number; y: number; k: number };
type FreeDrag = { id: string; ox: number; oy: number };
type DragUi = {
  id: string; lx: number; ly: number;
  overId: string | null; pos: "before" | "after" | "child";
};

/**
 * O mapa. Com `onSave` é o editor; sem ele é a versão pra quem só olha.
 * Nas duas dá pra apresentar passo a passo e exportar.
 * `full` = ocupa toda a altura do pai; senão tem altura própria.
 */
export function MindMapView({
  initial,
  onSave,
  full = false,
}: {
  initial: MindNode;
  onSave?: (root: MindNode) => Promise<void>;
  full?: boolean;
}) {
  const editable = Boolean(onSave);
  const [root, setRoot] = useState(initial);
  // Histórico de desfazer/refazer: árvores inteiras (são imutáveis, então
  // guardar uma é guardar um ponteiro). `rootRef` é o valor mais novo, pros
  // atalhos e botões não dependerem do render.
  const rootRef = useRef(initial);
  const past = useRef<MindNode[]>([]);
  const future = useRef<MindNode[]>([]);
  const [hist, setHist] = useState({ undo: 0, redo: 0 });

  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 });
  const [saved, setSaved] = useState<"ok" | "pending" | "error">("ok");
  const [isFull, setIsFull] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [step, setStep] = useState(0);
  const [menu, setMenu] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [dragUi, setDragUi] = useState<DragUi | null>(null);
  const [freeDrag, setFreeDrag] = useState<FreeDrag | null>(null);
  // Arrastar: "livre" solta o nó (e os filhos) onde largar; "camadas" troca o
  // nó de pai/ordem. Alt inverte o modo durante o arrasto.
  const [dragMode, setDragMode] = useState<"free" | "layers">("free");
  const [snapOn, setSnapOn] = useState(true);
  const [bgMenu, setBgMenu] = useState(false);
  // Enquanto a pessoa arrasta o seletor, o valor é provisório; só vira passo do
  // desfazer (e é salvo) ao soltar.
  const [bgDraft, setBgDraft] = useState<{ bg?: string; dot?: number } | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const box = useRef<HTMLDivElement>(null);
  const pan = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const nodeDrag = useRef<{
    id: string; x: number; y: number; started: boolean; mode: "free" | "layers";
  } | null>(null);
  const fsPresent = useRef(false);

  const canEdit = editable && !presenting;
  const bg = bgDraft?.bg ?? root.bg ?? DEFAULT_BG;
  const dotA = bgDraft?.dot ?? root.dotOpacity ?? DEFAULT_DOT;
  const dark = isDark(bg);
  const ink = dark ? "#f5f5f0" : INK;
  const order = useMemo(() => preorder(root), [root]);
  const total = order.length;
  const shown = useMemo(
    () => (presenting ? revealUpTo(root, step) : root),
    [presenting, root, step]
  );
  const lay = useMemo(() => layout(shown), [shown]);
  // Durante o arrasto livre o desenho usa a posição provisória; o `lay` (e o
  // reenquadramento que depende dele) só muda quando a pessoa solta.
  const renderLay = useMemo(
    () =>
      freeDrag
        ? layout(flipIfCrossed(updateNode(shown, freeDrag.id, { ox: freeDrag.ox, oy: freeDrag.oy }), freeDrag.id))
        : lay,
    [freeDrag, shown, lay]
  );
  const currentId = presenting ? order[step] : null;

  const fit = useCallback(() => {
    const el = box.current;
    if (!el) return;
    const { minX, maxX, minY, maxY } = lay.bounds;
    const w = maxX - minX + 120;
    const h = maxY - minY + 120;
    const k = Math.min(1, el.clientWidth / w, el.clientHeight / h);
    setView({
      k,
      x: el.clientWidth / 2 - ((minX + maxX) / 2) * k,
      y: el.clientHeight / 2 - ((minY + maxY) / 2) * k,
    });
  }, [lay]);

  // Enquadra uma vez ao abrir; depois quem manda é a pessoa.
  useEffect(() => {
    fit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ramo novo que passa da borda reenquadra o mapa; se ainda cabe, a visão fica
  // onde a pessoa deixou. Na apresentação reenquadra a cada passo.
  const seen = useRef(lay);
  const wasPresenting = useRef(presenting);
  useEffect(() => {
    const toggled = wasPresenting.current !== presenting;
    if (seen.current === lay && !toggled) return;
    seen.current = lay;
    wasPresenting.current = presenting;
    const el = box.current;
    if (!el) return;
    const { minX, maxX, minY, maxY } = lay.bounds;
    const m = 40;
    const out =
      minX * view.k + view.x < m ||
      maxX * view.k + view.x > el.clientWidth - m ||
      minY * view.k + view.y < m ||
      maxY * view.k + view.y > el.clientHeight - m;
    if (presenting || toggled || out) fit();
    // Só reage a mudança de layout, não a pan/zoom.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lay, presenting]);

  // O cartão de detalhes precisa saber o tamanho da área pra não sair dela.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onChange = () => {
      const inFull = document.fullscreenElement === box.current;
      setIsFull(inFull);
      // Saiu da tela cheia que a própria apresentação pediu: a apresentação acaba.
      if (!inFull && fsPresent.current) {
        fsPresent.current = false;
        setPresenting(false);
      }
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Salva depois de uma pausa, ou na hora quando a seleção muda (tirar o
  // foco de um nó é o sinal de que a pessoa terminou). A última versão vale.
  const first = useRef(true);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const save = useCallback(() => {
    clearTimeout(timer.current);
    if (!onSave || !dirty.current) return;
    dirty.current = false;
    onSave(rootRef.current).then(
      () => setSaved(dirty.current ? "pending" : "ok"),
      () => {
        dirty.current = true;
        setSaved("error");
      }
    );
  }, [onSave]);

  useEffect(() => {
    if (!onSave) return;
    if (first.current) {
      first.current = false;
      return;
    }
    dirty.current = true;
    setSaved("pending");
    timer.current = setTimeout(save, 700);
    return () => clearTimeout(timer.current);
  }, [root, onSave, save]);

  useEffect(() => save(), [selected, save]);
  // Saiu da página com algo pendente: grava antes.
  useEffect(() => save, [save]);

  const zoomAt = useCallback((px: number, py: number, factor: number) => {
    setView((v) => {
      const k = Math.min(2.5, Math.max(0.2, v.k * factor));
      const f = k / v.k;
      return { k, x: px - (px - v.x) * f, y: py - (py - v.y) * f };
    });
  }, []);

  // Trackpad: dois dedos movem, pinça (ctrl+roda) dá zoom. Precisa ser
  // listener nativo: o do React é passivo e não deixa cancelar o scroll.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement).closest("[data-scroll]")) return;
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const r = el.getBoundingClientRect();
        zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.01));
      } else {
        setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  function zoomCenter(factor: number) {
    const el = box.current;
    if (el) zoomAt(el.clientWidth / 2, el.clientHeight / 2, factor);
  }

  // ------------------------------------------------------------ edição

  const syncHist = () => setHist({ undo: past.current.length, redo: future.current.length });

  function setTree(next: MindNode) {
    rootRef.current = next;
    setRoot(next);
    syncHist();
  }

  const patch = (fn: (r: MindNode) => MindNode) => {
    const next = fn(rootRef.current);
    if (next === rootRef.current) return;
    past.current.push(rootRef.current);
    if (past.current.length > 100) past.current.shift();
    future.current = [];
    setTree(next);
  };

  /** Desfaz o último passo sem deixar rastro (nó criado e largado vazio). */
  function discardLast() {
    const prev = past.current.pop();
    if (prev) setTree(prev);
    setSelected(null);
  }

  function undo() {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push(rootRef.current);
    setTree(prev);
    setEditing(null);
    setSelected((id) => (id && findNode(prev, id) ? id : null));
  }

  function redo() {
    const next = future.current.pop();
    if (!next) return;
    past.current.push(rootRef.current);
    setTree(next);
    setEditing(null);
    setSelected((id) => (id && findNode(next, id) ? id : null));
  }

  function add(kind: "child" | "sibling", from: string) {
    const node: MindNode = { id: newId(), text: "", children: [] };
    patch((r) => (kind === "child" ? addChild(r, from, node) : addSibling(r, from, node)));
    setSelected(node.id);
    setEditing(node.id);
  }

  function remove(id: string) {
    if (id === rootRef.current.id) return;
    patch((r) => removeNode(r, id));
    setSelected(null);
    setPanelOpen(false);
  }

  function toggle(id: string) {
    const node = findNode(rootRef.current, id);
    if (!node) return;
    // Na versão só de leitura o estado é de quem está olhando; no editor é do mapa.
    patch((r) => updateNode(r, id, { collapsed: !node.collapsed }));
  }

  const edit = (id: string, p: NodePatch) => patch((r) => updateNode(r, id, p));

  // ------------------------------------------------------------ apresentação

  function startPresent() {
    setSelected(null);
    setEditing(null);
    setPanelOpen(false);
    setMenu(false);
    setStep(0);
    setPresenting(true);
    const el = box.current;
    if (el && !document.fullscreenElement) {
      fsPresent.current = true;
      el.requestFullscreen().catch(() => (fsPresent.current = false));
    }
  }

  function stopPresent() {
    setPresenting(false);
    setPanelOpen(false);
    if (fsPresent.current && document.fullscreenElement) document.exitFullscreen();
    fsPresent.current = false;
  }

  const go = (d: number) => setStep((s) => Math.min(total - 1, Math.max(0, s + d)));

  // Atalhos na janela, não no mapa, pra valerem mesmo depois de clicar num
  // botão. Dentro de campo de texto o navegador manda (inclusive o desfazer).
  const keys = useRef({ undo, redo, go, stopPresent });
  useEffect(() => {
    keys.current = { undo, redo, go, stopPresent };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, select, [contenteditable]")) return;
      const k = e.key.toLowerCase();
      if (presenting) {
        if (["arrowright", "arrowdown", " ", "pagedown", "enter"].includes(k)) {
          e.preventDefault();
          keys.current.go(1);
        } else if (["arrowleft", "arrowup", "pageup", "backspace"].includes(k)) {
          e.preventDefault();
          keys.current.go(-1);
        } else if (k === "escape") keys.current.stopPresent();
        return;
      }
      if (!editable || !(e.metaKey || e.ctrlKey) || e.altKey) return;
      if (k === "z") {
        e.preventDefault();
        if (e.shiftKey) keys.current.redo();
        else keys.current.undo();
      } else if (k === "y") {
        e.preventDefault();
        keys.current.redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editable, presenting]);

  function onKeyDown(e: React.KeyboardEvent) {
    if ((e.target as HTMLElement).closest("input, textarea, select")) return;
    if (!canEdit || editing || !selected) return;
    if (e.key === "Tab") { e.preventDefault(); add("child", selected); }
    else if (e.key === "Enter") { e.preventDefault(); add("sibling", selected); }
    else if (e.key === "F2" || e.key === " ") { e.preventDefault(); setEditing(selected); }
    else if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); remove(selected); }
  }

  // ------------------------------------------------------------ arrastar nós

  /** Ponto da tela (relativo ao mapa) → ponto no espaço do desenho. */
  const toWorld = (lx: number, ly: number) => ({
    x: (lx - view.x) / view.k,
    y: (ly - view.y) / view.k,
  });

  function dropTarget(id: string, lx: number, ly: number): Pick<DragUi, "overId" | "pos"> {
    const moving = findNode(rootRef.current, id);
    const w = toWorld(lx, ly);
    const hit = lay.items.find(
      (i) =>
        i.node.id !== id &&
        !(moving && findNode(moving, i.node.id)) &&
        w.x >= i.x - 8 && w.x <= i.x + i.w + 8 &&
        w.y >= i.y - 19 && w.y <= i.y + 19
    );
    if (!hit) return { overId: null, pos: "child" };
    const dy = w.y - hit.y;
    const pos = hit.depth === 0 || Math.abs(dy) < 6 ? "child" : dy < 0 ? "before" : "after";
    return { overId: hit.node.id, pos };
  }

  function onNodePointerDown(e: React.PointerEvent, p: Placed) {
    e.stopPropagation();
    // Tira o foco de um campo aberto antes: o blur dele grava o que foi digitado.
    (document.activeElement as HTMLElement | null)?.blur?.();
    if (presenting || !editable) return;
    setSelected(p.node.id);
    if (editing && editing !== p.node.id) setEditing(null);
    if (p.depth > 0 && editing !== p.node.id) {
      const layers = (dragMode === "layers") !== e.altKey;
      nodeDrag.current = {
        id: p.node.id, x: e.clientX, y: e.clientY, started: false,
        mode: layers ? "layers" : "free",
      };
    }
  }

  function onBoxPointerMove(e: React.PointerEvent) {
    const nd = nodeDrag.current;
    if (nd) {
      if (!nd.started && Math.hypot(e.clientX - nd.x, e.clientY - nd.y) > 6) {
        nd.started = true;
        box.current?.setPointerCapture(e.pointerId);
      }
      if (nd.started && nd.mode === "free") {
        const p = lay.items.find((i) => i.node.id === nd.id);
        if (p) {
          // Deslocamento em unidades do desenho; com snap, a borda esquerda e o
          // centro do texto caem na grade de pontos.
          let dx = (e.clientX - nd.x) / view.k;
          let dy = (e.clientY - nd.y) / view.k;
          if (snapOn) {
            dx = snap(p.x + dx) - p.x;
            dy = snap(p.y + dy) - p.y;
          }
          setFreeDrag({
            id: nd.id,
            ox: Math.round((p.node.ox ?? 0) + dx),
            oy: Math.round((p.node.oy ?? 0) + dy),
          });
        }
      } else if (nd.started) {
        const r = box.current!.getBoundingClientRect();
        const lx = e.clientX - r.left;
        const ly = e.clientY - r.top;
        setDragUi({ id: nd.id, lx, ly, ...dropTarget(nd.id, lx, ly) });
      }
      return;
    }
    const d = pan.current;
    if (d) setView((v) => ({ ...v, x: d.vx + e.clientX - d.x, y: d.vy + e.clientY - d.y }));
  }

  function onBoxPointerUp() {
    const nd = nodeDrag.current;
    nodeDrag.current = null;
    if (nd?.started && nd.mode === "layers" && dragUi?.overId) {
      const { id, overId, pos } = dragUi;
      patch((r) => moveNode(r, id, overId, pos));
    } else if (nd?.started && nd.mode === "free" && freeDrag) {
      const { id, ox, oy } = freeDrag;
      patch((r) => flipIfCrossed(updateNode(r, id, { ox: ox || undefined, oy: oy || undefined }), id));
    }
    setFreeDrag(null);
    setDragUi(null);
    pan.current = null;
    setDragging(false);
  }

  // ------------------------------------------------------------ exportar

  async function exportAs(kind: "png" | "pdf") {
    setMenu(false);
    setExporting(true);
    try {
      const { svg, w, h } = toSvg(layout(rootRef.current), { bg, ink });
      const png = await svgToPng(svg, w, h);
      const name = (rootRef.current.text || "mapa").trim().replace(/[^\w-]+/g, "-").toLowerCase();
      if (kind === "png") {
        download(png, `${name}.png`);
      } else {
        // Carrega só quando pedem: é uma biblioteca grande.
        const { Document, Page, Image, pdf } = await import("@react-pdf/renderer");
        const blob = await pdf(
          <Document title={rootRef.current.text}>
            <Page size={[w, h]} style={{ padding: 0 }}>
              {/* eslint-disable-next-line jsx-a11y/alt-text -- Image do react-pdf, não é <img> */}
              <Image src={png} style={{ width: w, height: h }} />
            </Page>
          </Document>
        ).toBlob();
        const url = URL.createObjectURL(blob);
        download(url, `${name}.pdf`);
        URL.revokeObjectURL(url);
      }
    } finally {
      setExporting(false);
    }
  }

  // ------------------------------------------------------------ desenho

  const selectedNode = selected ? findNode(shown, selected) : null;
  const selectedPlaced = renderLay.items.find((i) => i.node.id === selected);
  const target = dragUi?.overId ? lay.items.find((i) => i.node.id === dragUi.overId) : null;
  const dragged = dragUi ? findNode(root, dragUi.id) : null;

  const panelPos =
    selectedPlaced && size.w
      ? {
          left: Math.max(8, Math.min(selectedPlaced.x * view.k + view.x, size.w - 304)),
          top: Math.max(8, Math.min((selectedPlaced.y + 22) * view.k + view.y, size.h - 420)),
        }
      : { left: 8, top: 8 };

  return (
    <div
      ref={box}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={(e) => {
        // Só o fundo arrasta; texto e botões cuidam do próprio clique.
        if ((e.target as HTMLElement).closest("[data-mm]")) return;
        (document.activeElement as HTMLElement | null)?.blur?.();
        setSelected(null);
        setEditing(null);
        setPanelOpen(false);
        setMenu(false);
        setBgMenu(false);
        pan.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
        setDragging(true);
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={onBoxPointerMove}
      onPointerUp={onBoxPointerUp}
      onPointerCancel={onBoxPointerUp}
      style={{
        backgroundColor: bg,
        color: ink,
        // Pontos que andam e crescem junto com o mapa; somem quando miúdos demais.
        backgroundImage: view.k >= 0.35 ? `radial-gradient(circle, color-mix(in srgb, ${dark ? "#ffffff" : "#838059"} ${Math.round(dotA * 100)}%, transparent) 1.2px, transparent 1.6px)` : "none",
        backgroundSize: `${GRID * view.k}px ${GRID * view.k}px`,
        backgroundPosition: `${view.x}px ${view.y}px`,
      }}
      className={`relative touch-none overflow-hidden outline-none select-none ${
        full ? "h-full" : "h-[calc(100svh-15rem)] min-h-[420px] rounded-lg"
      } ${dragUi || dragging ? "cursor-grabbing" : "cursor-grab"}`}
    >
      <div
        className={`absolute top-0 left-0 origin-top-left ${
          presenting && !dragging ? "transition-transform duration-300 ease-out" : ""
        }`}
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})` }}
      >
        <svg className="pointer-events-none absolute top-0 left-0 overflow-visible" width="1" height="1">
          {renderLay.edges.map((e) => {
            const [x1, y1] = e.from;
            const [x2, y2] = e.to;
            const mx = (x1 + x2) / 2;
            return (
              <path
                key={e.id}
                d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                stroke={e.color}
                strokeWidth={3}
                strokeLinecap="round"
                fill="none"
              />
            );
          })}
        </svg>

        {target && dragUi && (
          <div
            className="pointer-events-none absolute"
            style={
              dragUi.pos === "child"
                ? { left: target.x - 6, top: target.y - 19, width: target.w + 12, height: 38, border: `2px dashed ${ink}`, borderRadius: 8 }
                : { left: target.x, width: target.w, height: 3, borderRadius: 2, background: ink, top: dragUi.pos === "before" ? target.y - 19 : target.y + 18 }
            }
          />
        )}

        {renderLay.items.map((p) => {
          const isRoot = p.depth === 0;
          const fill = p.node.boxColor ?? (isRoot ? ink : DEFAULT_BOX);
          const onFill = isDark(fill) ? "#f5f5f0" : INK;
          const isSel = p.node.id === selected;
          const isEditing = p.node.id === editing;
          const right = p.side === 1;
          const hasMore = Boolean(p.node.note || p.node.link);
          return (
            <div key={p.node.id} style={{ opacity: dragUi?.id === p.node.id ? 0.35 : 1 }}>
              <div
                data-mm
                onPointerDown={(e) => onNodePointerDown(e, p)}
                onDoubleClick={() => canEdit && setEditing(p.node.id)}
                style={
                  isRoot
                    ? {
                        left: p.x, top: p.y - 22, width: p.w, height: 44, lineHeight: "44px",
                        textAlign: "center", background: fill, color: onFill, borderRadius: 16,
                      }
                    : p.node.box
                    ? {
                        left: p.x, top: p.y - 18, width: p.w, height: 36, lineHeight: "32px",
                        padding: "0 12px", background: fill, color: onFill, borderRadius: 12,
                        border: `2px solid ${p.node.boxColor ?? p.color}`,
                        textAlign: p.side === -1 ? "right" : "left",
                      }
                    : {
                        left: p.x - 4,
                        top: p.y - 16,
                        width: p.w + 8,
                        textAlign: p.side === -1 ? "right" : "left",
                      }
                }
                className={`absolute whitespace-nowrap ${
                  isRoot
                    ? "text-xl font-bold tracking-wide uppercase shadow-sm"
                    : p.node.box
                    ? "text-base shadow-sm"
                    : "h-8 rounded-md px-1 text-base leading-8"
                } ${canEdit ? "cursor-text" : "cursor-default"} ${
                  isSel ? (isRoot ? "ring-2 ring-[#838059] ring-offset-2" : "ring-2 ring-[#2f3b1e]/40") : ""
                } ${p.node.id === currentId ? "bg-[#838059]/15" : ""}`}
              >
                {isEditing ? (
                  <input
                    autoFocus
                    defaultValue={p.node.text}
                    onFocus={(e) => e.currentTarget.select()}
                    onBlur={(e) => {
                      const text = e.currentTarget.value.trim();
                      setEditing(null);
                      // Nó recém-criado e largado vazio some em vez de virar "Novo".
                      if (!text && !p.node.text && !isRoot) discardLast();
                      else edit(p.node.id, { text: text || p.node.text });
                    }}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Enter" || e.key === "Escape") e.currentTarget.blur();
                      if (e.key === "Tab") {
                        e.preventDefault();
                        const text = e.currentTarget.value.trim();
                        if (text) {
                          // Grava o texto e já abre o filho, sem tirar a mão do teclado.
                          const node: MindNode = { id: newId(), text: "", children: [] };
                          patch((r) => addChild(updateNode(r, p.node.id, { text }), p.node.id, node));
                          setSelected(node.id);
                          setEditing(node.id);
                        }
                      }
                    }}
                    style={{ textAlign: "inherit" }}
                    className={`w-full bg-transparent text-inherit outline-none ${isRoot ? "h-11 leading-[44px]" : "h-8 leading-8"}`}
                  />
                ) : (
                  <>
                    {p.node.icon && <span className="mr-1.5">{p.node.icon}</span>}
                    {p.node.text || <span className="opacity-50">Novo</span>}
                    {hasMore && (
                      <button
                        data-mm
                        type="button"
                        aria-label="Ver nota e link"
                        onClick={() => {
                          setSelected(p.node.id);
                          setPanelOpen(true);
                        }}
                        className="ml-1.5 inline-grid size-5 translate-y-0.5 cursor-pointer place-items-center rounded opacity-60 hover:bg-[#838059]/20 hover:opacity-100"
                      >
                        {p.node.note ? <StickyNote className="size-3.5" /> : <Link2 className="size-3.5" />}
                      </button>
                    )}
                  </>
                )}
              </div>

              {p.ring && !presenting && (
                <button
                  data-mm
                  type="button"
                  aria-label={p.node.collapsed ? "Abrir ramo" : "Fechar ramo"}
                  aria-expanded={!p.node.collapsed}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => toggle(p.node.id)}
                  style={{
                    left: right ? p.x + p.w + 6 : p.x - 6 - 18,
                    top: p.y - 9,
                    borderColor: p.color,
                    color: p.color,
                    background: bg,
                  }}
                  className="absolute grid size-[18px] cursor-pointer place-items-center rounded-full border-[3px] text-[10px] leading-none font-bold transition hover:scale-125 active:scale-95"
                >
                  {p.node.collapsed ? p.node.children.length : <span className="size-1.5 rounded-full bg-current" />}
                </button>
              )}
            </div>
          );
        })}

        {canEdit && selectedNode && selectedPlaced && !editing && !panelOpen && !dragUi && (
          <div
            data-mm
            onPointerDown={(e) => e.stopPropagation()}
            style={{ left: selectedPlaced.x, top: selectedPlaced.y + 22 }}
            className={`absolute z-10 flex items-center gap-0.5 p-1 ${BAR}`}
          >
            <button type="button" className={BTN} title="Filho (Tab)" onClick={() => add("child", selectedNode.id)}>
              <CornerDownRight className="size-4" />
            </button>
            {selectedNode.id !== root.id && (
              <>
                <button type="button" className={BTN} title="Irmão (Enter)" onClick={() => add("sibling", selectedNode.id)}>
                  <ArrowDown className="size-4" />
                </button>
                <button type="button" className={`${BTN} hover:!text-red-600`} title="Excluir (Delete)" onClick={() => remove(selectedNode.id)}>
                  <Trash2 className="size-4" />
                </button>
              </>
            )}
            <button type="button" className={BTN} title="Nota, link, ícone e cor" onClick={() => setPanelOpen(true)}>
              <SlidersHorizontal className="size-4" />
            </button>
          </div>
        )}
      </div>

      {dragUi && dragged && (
        <div
          className="pointer-events-none absolute z-20 rounded-md border border-[#838059]/30 bg-[#e4e6d6] px-2 py-1 text-sm shadow-md"
          style={{ left: dragUi.lx + 12, top: dragUi.ly + 8 }}
        >
          {dragged.icon} {dragged.text || "Novo"}
        </div>
      )}

      {panelOpen && selectedNode && (
        <NodePanel
          key={selectedNode.id}
          node={selectedNode}
          readOnly={!canEdit}
          isRoot={selectedNode.id === root.id}
          onBoxColorAll={(c) => patch((r) => setBoxColorAll(r, c))}
          style={panelPos}
          onChange={(p) => edit(selectedNode.id, p)}
          onClose={() => setPanelOpen(false)}
        />
      )}

      {canEdit && (
        <div
          data-mm
          onPointerDown={(e) => e.stopPropagation()}
          className={`absolute top-3 left-3 flex items-center gap-0.5 p-1 ${BAR}`}
        >
          <button type="button" className={BTN} title="Desfazer (Ctrl/⌘ Z)" aria-label="Desfazer" disabled={hist.undo === 0} onClick={undo}>
            <Undo2 className="size-4" />
          </button>
          <button type="button" className={BTN} title="Refazer (Ctrl/⌘ Shift Z)" aria-label="Refazer" disabled={hist.redo === 0} onClick={redo}>
            <Redo2 className="size-4" />
          </button>
          <span className="mx-0.5 h-4 w-px bg-[#838059]/30" />
          <button
            type="button"
            className={`${BTN} ${dragMode === "layers" ? "bg-[#838059]/25" : ""}`}
            title={dragMode === "free" ? "Arrastar: livre. Clique pra reorganizar em camadas (Alt inverte)" : "Arrastar: camadas. Clique pra mover livremente (Alt inverte)"}
            aria-label={dragMode === "free" ? "Modo livre" : "Modo camadas"}
            aria-pressed={dragMode === "layers"}
            onClick={() => setDragMode((m) => (m === "free" ? "layers" : "free"))}
          >
            {dragMode === "free" ? <Move className="size-4" /> : <Layers className="size-4" />}
          </button>
          <button
            type="button"
            className={`${BTN} ${snapOn ? "bg-[#838059]/25" : ""}`}
            title={snapOn ? "Snap nos pontos: ligado" : "Snap nos pontos: desligado"}
            aria-label="Snap nos pontos"
            aria-pressed={snapOn}
            onClick={() => setSnapOn((v) => !v)}
          >
            <Magnet className="size-4" />
          </button>
          <button
            type="button"
            className={`${BTN} ${bgMenu ? "bg-[#838059]/25" : ""}`}
            title="Fundo e pontos"
            aria-label="Fundo e pontos"
            aria-expanded={bgMenu}
            onClick={() => setBgMenu((v) => !v)}
          >
            <Palette className="size-4" />
          </button>
          <button type="button" className={BTN} title="Reorganizar tudo automaticamente" aria-label="Reorganizar" onClick={() => patch(clearOffsets)}>
            <RotateCcw className="size-4" />
          </button>
        </div>
      )}

      {canEdit && bgMenu && (
        <div
          data-mm
          onPointerDown={(e) => e.stopPropagation()}
          className={`absolute top-16 left-3 z-30 w-64 space-y-3 p-3 text-sm ${BAR}`}
        >
          <div>
            <span className="mb-1.5 block text-xs font-medium text-[#2f3b1e]/60">Cor do fundo</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {BG_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Fundo ${c}`}
                  onClick={() => edit(root.id, { bg: c === DEFAULT_BG ? undefined : c })}
                  style={{ background: c }}
                  className={`size-6 rounded-full border border-[#838059]/40 transition hover:scale-110 ${
                    bg === c ? "ring-2 ring-[#2f3b1e] ring-offset-1 ring-offset-[#e4e6d6]" : ""
                  }`}
                />
              ))}
              <input
                type="color"
                aria-label="Outra cor de fundo"
                value={bg}
                onChange={(e) => setBgDraft((d) => ({ ...d, bg: e.target.value }))}
                onBlur={() => {
                  if (bgDraft?.bg) edit(root.id, { bg: bgDraft.bg });
                  setBgDraft((d) => (d?.dot === undefined ? null : { dot: d.dot }));
                }}
                className="size-6 cursor-pointer rounded border border-[#838059]/40 bg-transparent p-0"
              />
            </div>
          </div>
          <div>
            <label htmlFor="mm-dot" className="mb-1.5 flex justify-between text-xs font-medium text-[#2f3b1e]/60">
              <span>Opacidade dos pontos</span>
              <span className="tabular-nums">{Math.round(dotA * 100)}%</span>
            </label>
            <input
              id="mm-dot"
              type="range"
              min={0}
              max={100}
              value={Math.round(dotA * 100)}
              onChange={(e) => setBgDraft((d) => ({ ...d, dot: Number(e.target.value) / 100 }))}
              onPointerUp={() => {
                if (bgDraft?.dot !== undefined) edit(root.id, { dotOpacity: bgDraft.dot });
                setBgDraft((d) => (d?.bg === undefined ? null : { bg: d.bg }));
              }}
              onKeyUp={() => {
                if (bgDraft?.dot !== undefined) edit(root.id, { dotOpacity: bgDraft.dot });
                setBgDraft((d) => (d?.bg === undefined ? null : { bg: d.bg }));
              }}
              className="w-full accent-[#838059]"
            />
          </div>
          <button
            type="button"
            className="text-xs underline"
            onClick={() => edit(root.id, { bg: undefined, dotOpacity: undefined })}
          >
            Voltar ao padrão
          </button>
        </div>
      )}

      {presenting && (
        <div
          data-mm
          onPointerDown={(e) => e.stopPropagation()}
          className={`absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 p-1 ${BAR}`}
        >
          <button type="button" className={BTN} aria-label="Anterior" title="Anterior (←)" disabled={step === 0} onClick={() => go(-1)}>
            <ChevronLeft className="size-4" />
          </button>
          <span className="min-w-14 text-center text-sm tabular-nums">{step + 1} / {total}</span>
          <button type="button" className={BTN} aria-label="Próximo" title="Próximo (→ ou espaço)" disabled={step >= total - 1} onClick={() => go(1)}>
            <ChevronRight className="size-4" />
          </button>
          <button type="button" className="flex h-8 items-center gap-1 rounded-md px-2 text-sm text-[#2f3b1e]/75 hover:bg-[#838059]/15 hover:text-[#2f3b1e]" onClick={stopPresent}>
            <X className="size-4" /> Sair
          </button>
        </div>
      )}

      <div
        data-mm
        onPointerDown={(e) => e.stopPropagation()}
        className={`absolute right-3 bottom-3 flex items-center gap-0.5 p-1 ${BAR} ${presenting ? "hidden" : ""}`}
      >
        {editable && (
          <span className="px-2 text-xs text-[#2f3b1e]/60">
            {saved === "ok" ? "Salvo" : saved === "pending" ? "Salvando…" : "Não salvou"}
          </span>
        )}
        <button type="button" className={BTN} title="Menos zoom" onClick={() => zoomCenter(0.8)}>
          <Minus className="size-4" />
        </button>
        <button type="button" className={BTN} title="Mais zoom" onClick={() => zoomCenter(1.25)}>
          <Plus className="size-4" />
        </button>
        <button type="button" className={BTN} title="Enquadrar tudo" onClick={fit}>
          <Scan className="size-4" />
        </button>
        <div className="relative">
          <button type="button" className={BTN} title="Exportar" aria-label="Exportar" disabled={exporting} onClick={() => setMenu((m) => !m)}>
            <Download className="size-4" />
          </button>
          {menu && (
            <div className={`absolute right-0 bottom-10 w-40 p-1 text-sm ${BAR}`}>
              <button type="button" className="block w-full rounded-md px-2 py-1.5 text-left hover:bg-[#838059]/15" onClick={() => exportAs("png")}>
                Imagem (PNG)
              </button>
              <button type="button" className="block w-full rounded-md px-2 py-1.5 text-left hover:bg-[#838059]/15" onClick={() => exportAs("pdf")}>
                PDF
              </button>
            </div>
          )}
        </div>
        <button type="button" className={BTN} title="Apresentar passo a passo" aria-label="Apresentar" onClick={startPresent}>
          <Play className="size-4" />
        </button>
        <button
          type="button"
          className={BTN}
          title={isFull ? "Sair da tela cheia" : "Tela cheia"}
          onClick={() =>
            document.fullscreenElement ? document.exitFullscreen() : box.current?.requestFullscreen()
          }
        >
          {isFull ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
        </button>
      </div>

      {canEdit && (
        <p className="pointer-events-none absolute bottom-3 left-3 hidden text-xs text-[#2f3b1e]/50 md:block">
          Tab filho · Enter irmão · duplo clique edita · arraste um texto pra mover (leva os filhos) · bolinha abre e fecha o ramo
        </p>
      )}
    </div>
  );
}

/**
 * Cartão com os detalhes do nó selecionado. Nota e link só gravam ao sair do
 * campo, pra cada tecla não virar um passo no desfazer.
 */
function NodePanel({
  node,
  readOnly,
  isRoot,
  onBoxColorAll,
  style,
  onChange,
  onClose,
}: {
  node: MindNode;
  readOnly: boolean;
  isRoot: boolean;
  onBoxColorAll: (c: string | undefined) => void;
  style: React.CSSProperties;
  onChange: (p: NodePatch) => void;
  onClose: () => void;
}) {
  const label = "mb-1 block text-xs font-medium text-[#2f3b1e]/60";
  const field =
    "w-full rounded-md border border-[#838059]/30 bg-white/70 px-2 py-1.5 text-sm outline-none focus:border-[#838059]";

  return (
    <div
      data-mm
      data-scroll
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape") onClose();
      }}
      style={{ ...style, position: "absolute", width: 288 }}
      className={`z-30 max-h-[calc(100%-16px)] overflow-y-auto p-3 text-left ${BAR}`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="min-w-0 text-sm font-medium break-words">
          {node.icon} {node.text || "Novo"}
        </p>
        <button type="button" aria-label="Fechar" className={`${BTN} !size-6 shrink-0`} onClick={onClose}>
          <X className="size-4" />
        </button>
      </div>

      {readOnly ? (
        <div className="space-y-2 text-sm">
          {node.note && <p className="whitespace-pre-wrap">{node.note}</p>}
          {node.link && (
            <a
              href={node.link}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 break-all underline"
            >
              <ExternalLink className="size-3.5 shrink-0" /> {node.link}
            </a>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className={label} htmlFor="mm-note">Nota</label>
            <textarea
              id="mm-note"
              rows={4}
              maxLength={2000}
              defaultValue={node.note ?? ""}
              placeholder="Texto de apoio pra apresentação"
              onBlur={(e) => onChange({ note: e.currentTarget.value.trim() || undefined })}
              className={`${field} resize-y`}
            />
          </div>
          <div>
            <label className={label} htmlFor="mm-link">Link</label>
            <input
              id="mm-link"
              type="url"
              defaultValue={node.link ?? ""}
              placeholder="https://"
              onBlur={(e) => {
                const v = e.currentTarget.value.trim();
                onChange({ link: v ? (/^https?:\/\//i.test(v) ? v : `https://${v}`) : undefined });
              }}
              className={field}
            />
          </div>
          <div>
            <span className={label}>Ícone</span>
            <div className="flex flex-wrap gap-1">
              {EMOJIS.map((em) => (
                <button
                  key={em}
                  type="button"
                  aria-label={`Ícone ${em}`}
                  onClick={() => onChange({ icon: node.icon === em ? undefined : em })}
                  className={`grid size-7 place-items-center rounded-md text-base hover:bg-[#838059]/15 ${
                    node.icon === em ? "bg-[#838059]/25" : ""
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
          </div>
          <div>
            {!isRoot && (
              <label className="mb-2 flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(node.box)}
                  onChange={(e) => onChange({ box: e.target.checked || undefined })}
                  className="size-4 accent-[#838059]"
                />
                Texto dentro de uma caixa
              </label>
            )}
            {(isRoot || node.box) && (
              <>
                <span className={label}>Cor da caixa</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {BOX_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`Caixa ${c}`}
                      onClick={() => onChange({ boxColor: c })}
                      style={{ background: c }}
                      className={`size-5 rounded-md border border-[#838059]/40 transition hover:scale-110 ${
                        node.boxColor === c ? "ring-2 ring-[#2f3b1e] ring-offset-1 ring-offset-[#e4e6d6]" : ""
                      }`}
                    />
                  ))}
                  {node.boxColor && (
                    <button type="button" className="ml-1 text-xs underline" onClick={() => onChange({ boxColor: undefined })}>
                      Padrão
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  className="mt-1.5 text-xs underline"
                  onClick={() => onBoxColorAll(node.boxColor)}
                >
                  Usar esta cor em todas as caixas
                </button>
              </>
            )}
          </div>
          {!isRoot && (
            <div>
              <span className={label}>Cor deste nó e do que sai dele</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Cor ${c}`}
                    onClick={() => onChange({ color: c })}
                    style={{ background: c }}
                    className={`size-5 rounded-full transition hover:scale-110 ${
                      node.color === c ? "ring-2 ring-[#2f3b1e] ring-offset-1 ring-offset-[#e4e6d6]" : ""
                    }`}
                  />
                ))}
                {node.color && (
                  <button type="button" className="ml-1 text-xs underline" onClick={() => onChange({ color: undefined })}>
                    Padrão
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
