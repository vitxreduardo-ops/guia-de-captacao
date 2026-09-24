"use client";

import { useState } from "react";

type Props = {
  tags: string[];
  onChange: (tags: string[]) => void;
  compact?: boolean;
};

export default function TagEditor({ tags, onChange, compact }: Props) {
  const [novaTag, setNovaTag] = useState("");

  function adicionar() {
    const valor = novaTag.trim();
    if (!valor) return;
    if (tags.includes(valor)) {
      setNovaTag("");
      return;
    }
    onChange([...tags, valor]);
    setNovaTag("");
  }

  function remover(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  return (
    <div className={compact ? "" : "mt-2"}>
      <div className="mb-1.5 flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] text-neutral-900"
          >
            {tag}
            <button
              type="button"
              onClick={() => remover(tag)}
              className="text-neutral-500 hover:text-red-600"
              title="Remover tag"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-1.5">
        <input
          type="text"
          value={novaTag}
          onChange={(e) => setNovaTag(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              adicionar();
            }
          }}
          placeholder="cliente ou tag..."
          className="w-full max-w-[180px] rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={adicionar}
          className="rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
        >
          + tag
        </button>
      </div>
    </div>
  );
}
