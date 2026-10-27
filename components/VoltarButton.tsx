"use client";

/**
 * Volta pra página anterior de verdade (de onde a pessoa veio: materiais,
 * calendário, roteiros). No app instalado não existe botão de voltar do
 * navegador, então isto é o único caminho. Aberto direto (link, notificação),
 * sem histórico, vai pro `fallback`.
 */
export function VoltarButton({ fallback, className = "" }: { fallback: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        // Não dá pra usar `document.referrer`: na navegação do Next ele não muda.
        if (window.history.length > 1) window.history.back();
        else window.location.href = fallback;
      }}
      className={`inline-flex min-h-12 items-center gap-1 text-sm font-medium ${className}`}
    >
      ← Voltar
    </button>
  );
}
