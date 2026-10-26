import { AdminHeader, type BreadcrumbItem } from "@/components/admin/AdminHeader";
import { explicarErro } from "@/lib/repertorioTypes";

/**
 * Página do Repertório quando o banco falha. Em produção o Next esconde a
 * mensagem de erro do servidor atrás de um código; aqui a equipe vê o motivo
 * e o que fazer (quase sempre: rodar a migração).
 */
export function ErroRepertorio({
  erro,
  title,
  trail,
}: {
  erro: unknown;
  title: string;
  trail: BreadcrumbItem[];
}) {
  const mensagem = erro instanceof Error ? erro.message : String(erro);
  const { titulo, acao } = explicarErro(mensagem);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col pb-10">
      <AdminHeader title={title} trail={trail} />
      <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-900">{titulo}</p>
        <p className="mt-1 max-w-[65ch] text-sm text-amber-900">{acao}</p>
        <p className="mt-3 rounded bg-white/70 px-2 py-1.5 font-mono text-xs break-words text-neutral-600">
          {mensagem}
        </p>
      </div>
    </div>
  );
}
