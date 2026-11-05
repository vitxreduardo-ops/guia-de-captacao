import { tagKey } from "@/lib/tags";

// Lógica pura do Notion: árvore de páginas e texto para busca. Sem I/O.

export interface PageMeta {
  id: string;
  parent_id: string | null;
  title: string;
  icon: string;
  position: number;
  favorite: boolean;
  tags: string[];
  archived_at: string | null;
  updated_at: string;
}

export type TreeNode = PageMeta & { children: TreeNode[] };

export function buildTree(pages: PageMeta[]): TreeNode[] {
  const nodes = new Map<string, TreeNode>(pages.map((p) => [p.id, { ...p, children: [] }]));
  const roots: TreeNode[] = [];
  for (const n of nodes.values()) {
    const parent = n.parent_id ? nodes.get(n.parent_id) : undefined;
    (parent ? parent.children : roots).push(n);
  }
  const sort = (list: TreeNode[]) => {
    list.sort((a, b) => a.position - b.position);
    list.forEach((n) => sort(n.children));
  };
  sort(roots);
  return roots;
}

export function descendantIds(pages: PageMeta[], id: string): string[] {
  const out: string[] = [];
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const p of pages) {
      if (p.parent_id === cur) {
        out.push(p.id);
        stack.push(p.id);
      }
    }
  }
  return out;
}

/** Não deixa mover uma página para dentro dela mesma ou de uma descendente (ciclo). */
export function canMove(pages: PageMeta[], id: string, newParent: string | null): boolean {
  if (newParent === null) return true;
  return newParent !== id && !descendantIds(pages, id).includes(newParent);
}

type Block = {
  type?: string;
  content?: unknown;
  props?: Record<string, unknown>;
  children?: unknown;
};

/** Texto corrido dos blocos, usado só na busca (ILIKE). */
export function blocksToPlainText(blocks: unknown): string {
  if (!Array.isArray(blocks)) return "";
  const lines: string[] = [];
  for (const raw of blocks as Block[]) {
    if (!raw || typeof raw !== "object") continue;
    if (Array.isArray(raw.content)) {
      const text = raw.content
        .map((c) => (c && typeof c === "object" && "text" in c ? String((c as { text: unknown }).text) : ""))
        .join("");
      if (text) lines.push(text);
    }
    if (raw.type === "bookmark" || raw.type === "embed") {
      const t = [raw.props?.title, raw.props?.url, raw.props?.note].filter(Boolean).join(" ");
      if (t) lines.push(t);
    }
    const kids = blocksToPlainText(raw.children);
    if (kids) lines.push(kids);
  }
  return lines.join("\n");
}

/** Caminho da raiz até a página (inclusive), pro breadcrumb do topo. */
export function pagePath(pages: PageMeta[], id: string): PageMeta[] {
  const byId = new Map(pages.map((p) => [p.id, p]));
  const out: PageMeta[] = [];
  const seen = new Set<string>();
  for (let p = byId.get(id); p && !seen.has(p.id); p = p.parent_id ? byId.get(p.parent_id) : undefined) {
    seen.add(p.id);
    out.unshift(p);
  }
  return out;
}

/** Trecho do texto em volta da 1ª ocorrência do termo (ou o começo, se não achar). */
export function makeSnippet(text: string, term: string, radius = 45): string {
  const flat = text.replace(/\s+/g, " ").trim();
  const i = term ? flat.toLowerCase().indexOf(term.toLowerCase()) : -1;
  if (i < 0) return flat.slice(0, radius * 2);
  const start = Math.max(0, i - radius);
  const end = Math.min(flat.length, i + term.length + radius);
  return `${start > 0 ? "…" : ""}${flat.slice(start, end)}${end < flat.length ? "…" : ""}`;
}

/** Tags em uso, da mais usada pra menos, com a grafia preferida de cada uma. */
export function tagCounts(pages: PageMeta[], spelling: Map<string, string>): { tag: string; key: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const p of pages) for (const t of new Set(p.tags.map(tagKey))) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts]
    .map(([key, count]) => ({ key, count, tag: spelling.get(key) ?? key }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "pt-BR"));
}

/** Páginas que têm TODAS as tags escolhidas (chaves normalizadas). */
export function filterByTags(pages: PageMeta[], keys: string[]): PageMeta[] {
  if (keys.length === 0) return pages;
  return pages.filter((p) => {
    const have = new Set(p.tags.map(tagKey));
    return keys.every((k) => have.has(k));
  });
}
