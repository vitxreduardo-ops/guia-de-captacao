"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import "./notas.css";
import { useEffect, useRef, useState } from "react";
import { filterSuggestionItems } from "@blocknote/core";
import { pt } from "@blocknote/core/locales";
import { SuggestionMenuController, getDefaultReactSlashMenuItems, useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { fetchLinkInfo, schema } from "./blocks";

type Editor = typeof schema.BlockNoteEditor;

/** Menu que abre no cursor depois de colar uma URL. */
type PasteMenu = { url: string; blockId: string; x: number; y: number };
type Choice = "link" | "bookmark" | "embed";
const CHOICES: { id: Choice; title: string; hint: string }[] = [
  { id: "link", title: "Só o link", hint: "Texto clicável" },
  { id: "bookmark", title: "Anotação", hint: "Cartão com sua legenda" },
  { id: "embed", title: "Embed", hint: "Mostra dentro da página" },
];

export default function BlockEditor({
  initialContent,
  onChange,
}: {
  initialContent: unknown[];
  onChange: (blocks: unknown[]) => void;
}) {
  const [menu, setMenu] = useState<PasteMenu | null>(null);
  const [cursor, setCursor] = useState(0);
  const openMenu = useRef(setMenu);

  const editor = useCreateBlockNote({
    schema,
    dictionary: pt,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    initialContent: initialContent.length ? (initialContent as any) : undefined,
    pasteHandler: ({ event, editor, defaultPasteHandler }) => {
      const text = event.clipboardData?.getData("text/plain")?.trim() ?? "";
      if (!/^https?:\/\/\S+$/i.test(text)) return defaultPasteHandler();
      editor.insertInlineContent([{ type: "link", href: text, content: text }, " "]);
      const blockId = editor.getTextCursorPosition().block.id;
      // O cursor só está no lugar final depois do DOM atualizar.
      requestAnimationFrame(() => {
        const sel = window.getSelection();
        const rect = sel && sel.rangeCount ? sel.getRangeAt(0).getBoundingClientRect() : null;
        const x = Math.min(Math.max(8, rect?.left ?? 120), window.innerWidth - 270);
        const y = Math.min((rect?.bottom ?? 160) + 8, window.innerHeight - 190);
        setCursor(0);
        openMenu.current({ url: text, blockId, x, y });
      });
      return true;
    },
  });

  const choose = async (kind: Choice) => {
    if (!menu) return;
    const { url, blockId } = menu;
    setMenu(null);
    if (kind === "link") return;
    const info = await fetchLinkInfo(url);
    const block = editor.getBlock(blockId);
    if (!block) return;
    const next =
      kind === "bookmark"
        ? { type: "bookmark" as const, props: { url, title: info?.title ?? "", description: info?.description ?? "", image: info?.image ?? "" } }
        : { type: "embed" as const, props: { url, embedUrl: info?.embedUrl ?? "", title: info?.title ?? "" } };
    // Parágrafo que era só o link vira o bloco; com mais texto, o bloco entra logo abaixo.
    const onlyLink =
      Array.isArray(block.content) &&
      block.content.every((c) => (c.type === "text" ? !c.text.trim() : c.type === "link"));
    if (onlyLink) editor.replaceBlocks([blockId], [next]);
    else editor.insertBlocks([next], blockId, "after");
  };

  // Teclado do menu: ↑↓ escolhe, Enter confirma, Esc ou qualquer outra tecla deixa como link.
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault(); e.stopPropagation();
        setCursor((c) => (c + (e.key === "ArrowDown" ? 1 : CHOICES.length - 1)) % CHOICES.length);
      } else if (e.key === "Enter") {
        e.preventDefault(); e.stopPropagation();
        void choose(CHOICES[cursor].id);
      } else if (!["Shift", "Control", "Meta", "Alt"].includes(e.key)) {
        setMenu(null);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu, cursor]);

  const items = (query: string) =>
    filterSuggestionItems(
      [
        ...getDefaultReactSlashMenuItems(editor),
        {
          title: "Link com anotação",
          subtext: "Cartão de um link, com legenda sua",
          aliases: ["bookmark", "link", "anotacao", "marcador"],
          group: "Mídia",
          onItemClick: () => insertEmpty(editor, "bookmark"),
        },
        {
          title: "Embed / Artifact",
          subtext: "Mostra um link dentro da página",
          aliases: ["embed", "artifact", "incorporar", "iframe"],
          group: "Mídia",
          onItemClick: () => insertEmpty(editor, "embed"),
        },
      ],
      query
    );

  return (
    <>
      <BlockNoteView editor={editor} theme="light" slashMenu={false} onChange={() => onChange(editor.document as unknown[])}>
        <SuggestionMenuController triggerCharacter="/" getItems={async (q) => items(q)} />
      </BlockNoteView>

      {menu && (
        <>
          <div className="fixed inset-0 z-[80]" onMouseDown={() => setMenu(null)} />
          <div
            role="menu"
            aria-label="Como mostrar o link colado"
            style={{ left: menu.x, top: menu.y }}
            className="fixed z-[81] w-64 rounded-xl border border-neutral-200 bg-white p-1 shadow-xl"
          >
            {CHOICES.map((c, i) => (
              <button
                key={c.id}
                type="button"
                role="menuitem"
                onMouseEnter={() => setCursor(i)}
                onClick={() => void choose(c.id)}
                className={`flex w-full flex-col rounded-lg px-3 py-1.5 text-left ${i === cursor ? "bg-neutral-100" : ""}`}
              >
                <span className="text-sm font-medium text-neutral-900">{c.title}</span>
                <span className="text-xs text-neutral-500">{c.hint}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function insertEmpty(editor: Editor, type: "bookmark" | "embed") {
  const cur = editor.getTextCursorPosition().block;
  const empty = Array.isArray(cur.content) && cur.content.length === 0;
  if (empty) editor.replaceBlocks([cur.id], [{ type }]);
  else editor.insertBlocks([{ type }], cur.id, "after");
}
