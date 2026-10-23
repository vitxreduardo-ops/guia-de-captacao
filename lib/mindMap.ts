/**
 * Mapa mental: a árvore, as edições nela e o layout (onde cada texto cai).
 * Sem React e sem banco, pra dar pra testar sozinho.
 */

export interface MindNode {
  id: string;
  text: string;
  children: MindNode[];
  /** Só vale nos filhos diretos da raiz; o resto herda do ramo. */
  color?: string;
  /** Ramo fechado: os filhos existem mas não aparecem. */
  collapsed?: boolean;
  /** Emoji que vai na frente do texto. */
  icon?: string;
  /** Texto de apoio, que abre ao clicar no marcador do nó. */
  note?: string;
  /** Só http(s). */
  link?: string;
  /**
   * Deslocamento livre em relação à posição automática. Vale pro nó e pra tudo
   * que sai dele: arrastar um nó leva os filhos junto.
   */
  ox?: number;
  oy?: number;
  /**
   * Só nos filhos da raiz: de que lado ela fica. Sem isto o lado vem da ordem;
   * com isto, o ramo arrastado pro outro lado passa a abrir virado pra lá.
   */
  side?: 1 | -1;
  /** Texto dentro de uma caixa arredondada (a raiz sempre tem). */
  box?: boolean;
  /** Cor da caixa (#rrggbb); sem ela, a caixa usa o padrão. */
  boxColor?: string;
  /** Só na raiz: cor do fundo (#rrggbb) e opacidade dos pontos (0 a 1). */
  bg?: string;
  dotOpacity?: number;
}

/** Fundo escuro pede texto claro. */
export function isDark(hex: string): boolean {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}

/** Espaçamento da grade de pontos, e do snap. */
export const GRID = 24;
export const snap = (v: number) => Math.round(v / GRID) * GRID;

export type NodePatch = Partial<
  Pick<MindNode, "text" | "color" | "collapsed" | "icon" | "note" | "link" | "ox" | "oy" | "bg" | "dotOpacity" | "box" | "boxColor" | "side">
>;

export const PALETTE = [
  "#3b6df5",
  "#e8457c",
  "#a06cf0",
  "#e8a02c",
  "#f0432e",
  "#3fb67a",
  "#27b3c9",
];

const MAX_TEXT = 200;
const MAX_NODES = 500;
const MAX_NOTE = 2000;

export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export type TemplateKind = "blank" | "funil";

export const TEMPLATES: { kind: TemplateKind; name: string; hint: string }[] = [
  { kind: "blank", name: "Em branco", hint: "Só o centro. Você abre os ramos." },
  { kind: "funil", name: "Funil de estratégia", hint: "Topo, meio, fundo e pós-venda já montados." },
];

const leaf = (text: string, children: MindNode[] = []): MindNode => ({
  id: newId(), text, children,
});

export function newMap(title: string, kind: TemplateKind = "blank"): MindNode {
  if (kind === "funil") {
    return leaf(title, [
      leaf("Objetivo", ["Meta do período", "Indicador principal"].map((t) => leaf(t))),
      leaf("Público", ["Persona principal", "Dores e desejos"].map((t) => leaf(t))),
      leaf("Topo · Atração", [
        leaf("Canais", ["Reels", "Anúncios", "Parcerias"].map((t) => leaf(t))),
        leaf("Conteúdo", ["Dicas rápidas", "Bastidores"].map((t) => leaf(t))),
      ]),
      leaf("Meio · Consideração", [
        leaf("Conteúdo", ["Provas e resultados", "Quebra de objeções"].map((t) => leaf(t))),
        leaf("Captura", ["Isca digital", "WhatsApp"].map((t) => leaf(t))),
      ]),
      leaf("Fundo · Conversão", [
        leaf("Oferta", ["Proposta", "Condição especial"].map((t) => leaf(t))),
        leaf("Fechamento", ["Atendimento", "Follow-up"].map((t) => leaf(t))),
      ]),
      leaf("Pós-venda", ["Experiência do cliente", "Indicação", "Recompra"].map((t) => leaf(t))),
      leaf("Métricas", ["Alcance", "Leads", "Conversão"].map((t) => leaf(t))),
    ]);
  }
  return leaf(title);
}

/** O que vem do jsonb nunca é confiável: só passa o que tem o formato certo. */
export function parseMap(raw: unknown): MindNode {
  let count = 0;
  const walk = (value: unknown, depth: number): MindNode | null => {
    if (!value || typeof value !== "object" || depth > 12 || count >= MAX_NODES) {
      return null;
    }
    const v = value as Record<string, unknown>;
    count += 1;
    const node: MindNode = {
      id: typeof v.id === "string" && v.id ? v.id.slice(0, 40) : newId(),
      text: typeof v.text === "string" ? v.text.slice(0, MAX_TEXT) : "",
      children: [],
    };
    if (typeof v.color === "string" && /^#[0-9a-f]{6}$/i.test(v.color)) {
      node.color = v.color;
    }
    if (v.collapsed === true) node.collapsed = true;
    if (v.box === true) node.box = true;
    if (v.side === 1 || v.side === -1) node.side = v.side;
    if (typeof v.boxColor === "string" && /^#[0-9a-f]{6}$/i.test(v.boxColor)) {
      node.boxColor = v.boxColor.toLowerCase();
    }
    if (typeof v.bg === "string" && /^#[0-9a-f]{6}$/i.test(v.bg)) node.bg = v.bg.toLowerCase();
    if (typeof v.dotOpacity === "number" && Number.isFinite(v.dotOpacity)) {
      node.dotOpacity = Math.round(Math.max(0, Math.min(1, v.dotOpacity)) * 100) / 100;
    }
    for (const k of ["ox", "oy"] as const) {
      const n = v[k];
      if (typeof n === "number" && Number.isFinite(n) && n !== 0) {
        node[k] = Math.round(Math.max(-20000, Math.min(20000, n)));
      }
    }
    if (typeof v.icon === "string" && v.icon.trim()) node.icon = v.icon.trim().slice(0, 8);
    if (typeof v.note === "string" && v.note.trim()) node.note = v.note.slice(0, MAX_NOTE);
    // Só http(s): o link é aberto pelo cliente, então nada de javascript:.
    if (typeof v.link === "string" && /^https?:\/\//i.test(v.link.trim())) {
      node.link = v.link.trim().slice(0, 500);
    }
    if (Array.isArray(v.children)) {
      for (const child of v.children) {
        const parsed = walk(child, depth + 1);
        if (parsed) node.children.push(parsed);
      }
    }
    return node;
  };
  return walk(raw, 0) ?? { id: newId(), text: "Mapa", children: [] };
}

export function findNode(root: MindNode, id: string): MindNode | null {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}

/** Devolve uma árvore nova com `fn` aplicada ao nó `id` (o resto é reaproveitado). */
function mapNode(
  root: MindNode,
  id: string,
  fn: (node: MindNode) => MindNode
): MindNode {
  if (root.id === id) return fn(root);
  let changed = false;
  const children = root.children.map((child) => {
    const next = mapNode(child, id, fn);
    if (next !== child) changed = true;
    return next;
  });
  return changed ? { ...root, children } : root;
}

export function updateNode(
  root: MindNode,
  id: string,
  patch: NodePatch
): MindNode {
  return mapNode(root, id, (node) => ({ ...node, ...patch }));
}

export function addChild(root: MindNode, parentId: string, node: MindNode): MindNode {
  return mapNode(root, parentId, (parent) => ({
    ...parent,
    collapsed: false,
    children: [...parent.children, node],
  }));
}

/** Entra logo abaixo do irmão `siblingId`. A raiz não tem irmão: vira filho dela. */
export function addSibling(root: MindNode, siblingId: string, node: MindNode): MindNode {
  if (root.id === siblingId) return addChild(root, siblingId, node);
  const parent = findParent(root, siblingId);
  if (!parent) return root;
  return mapNode(root, parent.id, (p) => {
    const at = p.children.findIndex((c) => c.id === siblingId);
    const children = [...p.children];
    children.splice(at + 1, 0, node);
    return { ...p, children };
  });
}

export function findParent(root: MindNode, id: string): MindNode | null {
  for (const child of root.children) {
    if (child.id === id) return root;
    const found = findParent(child, id);
    if (found) return found;
  }
  return null;
}

/**
 * Muda `id` de lugar: vira filho de `targetId` ou entra antes/depois dele.
 * Não deixa o nó entrar no próprio ramo; nesse caso devolve a árvore igual.
 */
export function moveNode(
  root: MindNode,
  id: string,
  targetId: string,
  pos: "before" | "after" | "child"
): MindNode {
  if (id === root.id || id === targetId) return root;
  const moving = findNode(root, id);
  if (!moving || findNode(moving, targetId)) return root;
  const without = removeNode(root, id);
  if (pos === "child" || targetId === root.id) return addChild(without, targetId, moving);
  const parent = findParent(without, targetId);
  if (!parent) return root;
  return mapNode(without, parent.id, (p) => {
    const at = p.children.findIndex((c) => c.id === targetId);
    const children = [...p.children];
    children.splice(pos === "before" ? at : at + 1, 0, moving);
    return { ...p, children };
  });
}

/**
 * Se o ramo `id` (filho da raiz) foi arrastado pro outro lado da raiz, vira o
 * ramo pra abrir pra lá (filhos e texto acompanham) e ajusta o deslocamento
 * pra ele ficar exatamente onde foi solto. Qualquer outro nó volta igual.
 */
export function flipIfCrossed(root: MindNode, id: string): MindNode {
  if (!root.children.some((c) => c.id === id)) return root;
  const find = (t: MindNode) => layout(t).items.find((i) => i.node.id === id)!;
  const p = find(root);
  if ((p.x + p.w / 2) * p.side >= 0) return root;
  const flipped = updateNode(root, id, { side: p.side === 1 ? -1 : 1, ox: undefined, oy: undefined });
  const q = find(flipped);
  return updateNode(flipped, id, {
    ox: Math.round(p.x - q.x) || undefined,
    oy: Math.round(p.y - q.y) || undefined,
  });
}

/** Pinta (ou despinta) todas as caixas do mapa: as dos nós com caixa e a da raiz. */
export function setBoxColorAll(root: MindNode, color: string | undefined): MindNode {
  const walk = (n: MindNode, isRoot: boolean): MindNode => {
    const next = n.box || isRoot ? { ...n, boxColor: color } : n;
    return { ...next, children: n.children.map((c) => walk(c, false)) };
  };
  return walk(root, true);
}

/** Cor padrão da caixa dos filhos; a da raiz é a cor do texto do mapa. */
export const DEFAULT_BOX = "#e4e6d6";

/** Tira todos os deslocamentos livres: o mapa volta à organização automática. */
export function clearOffsets(root: MindNode): MindNode {
  const walk = (n: MindNode): MindNode => {
    const { ox: _ox, oy: _oy, side: _side, ...rest } = n;
    void _ox;
    void _oy;
    void _side;
    return { ...rest, children: n.children.map(walk) };
  };
  return walk(root);
}

/** Ids na ordem em que a apresentação passo a passo revela os nós. */
export function preorder(root: MindNode): string[] {
  return [root.id, ...root.children.flatMap(preorder)];
}

/** A árvore só até o passo `step` (0 = só a raiz), com tudo aberto. */
export function revealUpTo(root: MindNode, step: number): MindNode {
  let i = 0;
  const walk = (n: MindNode): MindNode => {
    i += 1;
    const children: MindNode[] = [];
    for (const c of n.children) {
      if (i > step) break;
      children.push(walk(c));
    }
    return { ...n, collapsed: false, children };
  };
  return walk(root);
}

/** A raiz não sai: um mapa sem raiz não tem o que mostrar. */
export function removeNode(root: MindNode, id: string): MindNode {
  if (root.id === id) return root;
  const parent = findParent(root, id);
  if (!parent) return root;
  return mapNode(root, parent.id, (p) => ({
    ...p,
    children: p.children.filter((c) => c.id !== id),
  }));
}

// ---------------------------------------------------------------- layout

export interface Placed {
  node: MindNode;
  depth: number;
  /** 1 = direita da raiz, -1 = esquerda, 0 = a própria raiz. */
  side: 1 | -1 | 0;
  color: string;
  /** Borda esquerda do texto e a largura dele, no espaço do mapa. */
  x: number;
  w: number;
  /** Centro vertical. */
  y: number;
  /** Tem filhos (aberto ou fechado): ganha a bolinha de abrir/fechar. */
  ring: boolean;
}

export interface Edge {
  id: string;
  color: string;
  from: [number, number];
  to: [number, number];
}

export interface Layout {
  items: Placed[];
  edges: Edge[];
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

const SLOT = 46;
const RING = 26;
const GAP = 60;
const CHAR = 8.6;
const ROOT_CHAR = 11.5;

export const textWidth = (text: string, depth: number) =>
  Math.max(40, Math.ceil((text || "Novo").length * (depth === 0 ? ROOT_CHAR : CHAR)) + 8);

/** Espaço extra do ícone e do marcador de nota/link, pra não empurrar o texto. */
const extra = (n: MindNode) =>
  (n.icon ? 26 : 0) + (n.note || n.link ? 22 : 0) + (n.box ? 28 : 0);
const widthOf = (n: MindNode, depth: number) => textWidth(n.text, depth) + extra(n);

/** Quantos "slots" de altura o nó ocupa: os de baixo somados, ou 1 se fechado/folha. */
function span(node: MindNode): number {
  if (node.collapsed || node.children.length === 0) return 1;
  return node.children.reduce((sum, c) => sum + span(c), 0);
}

export function layout(root: MindNode): Layout {
  const items: Placed[] = [];
  const edges: Edge[] = [];

  // A raiz vive numa caixa arredondada: 16px de respiro de cada lado.
  const rootW = widthOf(root, 0) + 32;
  items.push({
    node: root, depth: 0, side: 0, color: "#ffffff",
    x: -rootW / 2, w: rootW, y: 0, ring: false,
  });

  // Metade dos ramos pra cada lado; o da direita fica com o que sobrar.
  const total = root.children.length;
  const rightCount = Math.ceil(total / 2);
  const pairs = root.children.map((c, i) => [c, i] as [MindNode, number]);
  const sideOf = (c: MindNode, i: number): 1 | -1 => c.side ?? (i < rightCount ? 1 : -1);
  const sides: [1 | -1, [MindNode, number][]][] = [
    [1, pairs.filter(([c, i]) => sideOf(c, i) === 1)],
    [-1, pairs.filter(([c, i]) => sideOf(c, i) === -1)],
  ];

  for (const [side, branches] of sides) {
    if (branches.length === 0) continue;

    // Largura de cada coluna = o texto mais largo daquela profundidade.
    const colW: number[] = [];
    const measure = (n: MindNode, depth: number) => {
      colW[depth] = Math.max(colW[depth] ?? 0, widthOf(n, depth));
      if (!n.collapsed) n.children.forEach((c) => measure(c, depth + 1));
    };
    branches.forEach(([b]) => measure(b, 1));

    // Posição de entrada (borda do texto mais perto da raiz) de cada coluna.
    const near: number[] = [];
    near[1] = side * (rootW / 2 + GAP + 10);
    for (let d = 2; d < colW.length; d++) near[d] = near[d - 1] + side * (colW[d - 1] + RING + GAP);

    const totalSlots = branches.reduce((s, [b]) => s + span(b), 0);
    let cursor = (-totalSlots * SLOT) / 2;

    const place = (
      n: MindNode,
      depth: number,
      color: string,
      parentOut: [number, number],
      acc: { x: number; y: number }
    ) => {
      color = n.color ?? color;
      const ax = acc.x + (n.ox ?? 0);
      const ay = acc.y + (n.oy ?? 0);
      const slots = span(n);
      const y = cursor + (slots * SLOT) / 2;
      const w = widthOf(n, depth);
      const ring = n.children.length > 0;
      const x = side === 1 ? near[depth] : near[depth] - w;
      items.push({ node: n, depth, side, color, x: x + ax, w, y: y + ay, ring });
      edges.push({
        id: n.id, color,
        from: parentOut,
        to: [near[depth] - side * (n.box ? 0 : 8) + ax, y + ay],
      });
      const out: [number, number] = [near[depth] + side * (w + (ring ? RING : 8)) + ax, y + ay];
      if (n.collapsed || !ring) {
        cursor += SLOT;
        return;
      }
      // Os filhos avançam o cursor; o pai já ficou no meio do espaço deles.
      for (const c of n.children) place(c, depth + 1, color, out, { x: ax, y: ay });
    };

    for (const [branch, index] of branches) {
      const color = branch.color ?? PALETTE[index % PALETTE.length];
      place(branch, 1, color, [side * (rootW / 2 + 6), 0], { x: 0, y: 0 });
    }
  }

  const xs = items.flatMap((i) => [i.x, i.x + i.w + (i.ring ? RING : 0)]);
  const ys = items.map((i) => i.y);
  return {
    items,
    edges,
    bounds: {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys) - SLOT / 2,
      maxY: Math.max(...ys) + SLOT / 2,
    },
  };
}
