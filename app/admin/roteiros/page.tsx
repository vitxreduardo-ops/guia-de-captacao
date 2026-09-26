import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import ChatRoteiro from "@/components/admin/roteiros/ChatRoteiro";
import GeradorRoteiro from "@/components/admin/roteiros/GeradorRoteiro";
import { getRoteiro } from "@/lib/roteiros";
import { preenchimentoDe } from "@/lib/roteiroTypes";

export default async function RoteirosPage({
  searchParams,
}: PageProps<"/admin/roteiros">) {
  // ?de=<id> vem do "Usar como base" do histórico: abre o formulário
  // preenchido com aquele roteiro, sem gerar nada.
  const { de } = await searchParams;
  const base = typeof de === "string" ? await getRoteiro(de) : null;

  return (
    // No desktop a página inteira cabe na janela (o cartão do admin tem 0,5rem
    // de margem e 1px de borda em cima e embaixo): o formulário rola por dentro
    // e o chat fica inteiro à vista, com o campo de mensagem sempre visível.
    <div className="mx-auto w-full max-w-3xl pb-10 xl:flex xl:h-[calc(100svh-1rem-2px)] xl:max-w-[88rem] xl:flex-col xl:pb-4">
      <AdminHeader
        title="Roteiros"
        trail={[{ label: "Admin", href: "/admin" }, { label: "Roteiros" }]}
      />

      {/* No celular a linha é só dos dois botões, dividindo a largura; a
          descrição volta a partir do sm, onde cabe ao lado deles. */}
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <p className="hidden text-sm text-neutral-500 sm:block">
          AIDA · PAS · Midtrack · 6 Chapéus — roteiros de vídeos curtos para redes sociais
        </p>
        <div className="flex flex-1 gap-2 sm:flex-none sm:shrink-0">
          {/* Em tela larga o chat já está ao lado: o botão só existe onde não cabe. */}
          <Link
            href="/admin/roteiros/chat"
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-center text-sm text-neutral-700 hover:bg-neutral-50 sm:flex-none sm:py-1.5 xl:hidden"
          >
            Chat
          </Link>
          <Link
            href="/admin/roteiros/historico"
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-center text-sm text-neutral-700 hover:bg-neutral-50 sm:flex-none sm:py-1.5"
          >
            Histórico
          </Link>
        </div>
      </div>

      {/* Em tela larga o formulário sozinho deixava metade da tela vazia:
          o chat vai pra coluna da direita. */}
      {/* A altura da linha vem só do formulário (o chat é absoluto e não
          empurra): formulário curto, chat do mesmo tamanho; formulário maior
          que a janela, os dois param na janela e o formulário rola. */}
      <div className="xl:grid xl:min-h-0 xl:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] xl:grid-rows-[minmax(0,1fr)] xl:gap-6">
        <div className="xl:min-h-0 xl:overflow-y-auto xl:pr-1">
          {/* key: trocar de base remonta o formulário em vez de manter o anterior. */}
          <GeradorRoteiro key={base?.id ?? "novo"} inicial={base ? preenchimentoDe(base) : null} />
        </div>

        <aside aria-label="Chat de roteiros" className="relative hidden xl:block">
          <div className="absolute inset-0">
            <ChatRoteiro preencher />
          </div>
        </aside>
      </div>
    </div>
  );
}
