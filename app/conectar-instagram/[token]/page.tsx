import { notFound } from "next/navigation";
import { TatuLogo } from "@/components/TatuLogo";
import { getPortalClientName } from "@/lib/clientPortal";
import { readInstagramInviteToken } from "@/lib/instagram";

export const dynamic = "force-dynamic";

const MENSAGENS: Record<string, string> = {
  conectado: "Pronto! Sua conta do Instagram está conectada. Pode fechar esta página.",
  negado: "A conexão foi cancelada. Se foi sem querer, toque em Conectar de novo.",
  erro: "Não deu pra conectar agora. Tente de novo ou avise a Tatu.",
};

/** Página pública: o cliente abre no celular dele e autoriza o próprio Instagram. */
export default async function ConectarInstagramPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ instagram?: string }>;
}) {
  const { token } = await params;
  const { instagram } = await searchParams;
  const clientId = readInstagramInviteToken(decodeURIComponent(token));
  if (!clientId) notFound();
  const nome = await getPortalClientName(clientId);
  const resultado = instagram ? MENSAGENS[instagram] : null;

  return (
    <div className="flex min-h-svh items-center justify-center bg-[var(--tatu-cream)] px-[max(1.25rem,env(safe-area-inset-left),env(safe-area-inset-right))] pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(2.5rem,env(safe-area-inset-top))] text-[var(--tatu-ink)]">
      <div className="w-full max-w-sm">
        <TatuLogo className="mb-8 h-6 w-auto" />
        <h1 className="text-3xl leading-tight">Conectar o Instagram{nome ? ` de ${nome}` : ""}</h1>
        <p className="mt-3 text-base opacity-75">
          Você autoriza a Tatu Estúdio Criativo a agendar e publicar os posts na sua conta. Dá pra desfazer quando quiser.
        </p>
        {resultado ? (
          <p className="mt-6 rounded-xl border border-[var(--tatu-border)] bg-white p-4 text-base">{resultado}</p>
        ) : null}
        {instagram === "conectado" ? null : (
          <a
            href={`/api/instagram/oauth/start?convite=${encodeURIComponent(decodeURIComponent(token))}`}
            className="mt-6 flex min-h-12 w-full items-center justify-center rounded-xl bg-[var(--tatu-ink)] px-4 text-base text-white"
          >
            Conectar meu Instagram
          </a>
        )}
      </div>
    </div>
  );
}
