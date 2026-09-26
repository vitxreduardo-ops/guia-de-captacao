import type { Scene } from "@/lib/guides";

function Lista({ titulo, itens }: { titulo: string; itens: string[] }) {
  if (itens.length === 0) return null;
  return (
    <div className="rounded-md border border-neutral-200 bg-white p-3">
      <p className="mb-1 font-mono text-xs uppercase tracking-wide text-neutral-500">{titulo}</p>
      <ul className="list-inside list-disc space-y-0.5 text-sm text-neutral-900">
        {itens.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

/** Hooks e CTAs alternativos de uma cena do guia. */
export function AlternativasCena({ scene }: { scene: Scene }) {
  const { hooks_alternativos: hooks, ctas_alternativos: ctas } = scene;
  if (hooks.length === 0 && ctas.length === 0) return null;

  const resumo = [
    hooks.length ? `${hooks.length} ${hooks.length === 1 ? "hook" : "hooks"}` : "",
    ctas.length ? `${ctas.length} ${ctas.length === 1 ? "CTA" : "CTAs"}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  // Fechado por padrão: o roteiro da cena é o que importa na gravação, as
  // alternativas são consulta. <details> nativo dispensa JS no guia público.
  return (
    <details className="group detalhes-animados mt-2">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 rounded text-xs text-neutral-500 hover:text-neutral-800 focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
        <span aria-hidden className="transition-transform group-open:rotate-90 motion-reduce:transition-none">
          ▸
        </span>
        Alternativas
        <span className="text-neutral-400">· {resumo}</span>
      </summary>
      <div className="mt-2 space-y-2">
        <Lista titulo="Hooks alternativos" itens={hooks} />
        <Lista titulo="CTAs alternativos" itens={ctas} />
      </div>
    </details>
  );
}

/** Notas de produção do vídeo, depois da última cena. */
export function NotasProducao({ notas }: { notas: string }) {
  if (!notas) return null;
  return (
    <p className="rounded-md border border-neutral-200 bg-neutral-50 p-3 text-xs leading-relaxed text-neutral-600">
      <strong className="text-neutral-700">Notas de produção:</strong>{" "}
      <span className="whitespace-pre-wrap">{notas}</span>
    </p>
  );
}
