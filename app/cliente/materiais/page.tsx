import { getPortalSession, listPortalCards } from "@/lib/clientPortal";
import { CardItem } from "../CardItem";

export const dynamic = "force-dynamic";

const HEADING = { fontFamily: "Bootzy, sans-serif", letterSpacing: "0.02em" };

export default async function MateriaisPage() {
  const { clientId, preview } = await getPortalSession();
  const cards = await listPortalCards(clientId);
  const waiting = cards.filter((c) => !c.approved_at);
  const done = cards.filter((c) => c.approved_at);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl leading-none" style={HEADING}>
          Materiais
        </h1>
        <p className="mt-2 text-[var(--tatu-muted)]">
          Confira os materiais preparados pela nossa equipe e registre a sua aprovação.
        </p>
      </header>

      {preview ? (
        <p className="rounded-2xl bg-white p-3 text-sm text-[var(--tatu-muted)]">
          Você está na visualização do painel. Aprovações e solicitações feitas
          aqui ficam registradas como da equipe, em nome do cliente.
        </p>
      ) : null}

      <section aria-labelledby="esperando" className="space-y-3">
        <h2 id="esperando" className="text-2xl" style={HEADING}>
          Aguardando aprovação
        </h2>
        {waiting.length ? (
          <ul className="space-y-4">
            {waiting.map((c) => (
              <CardItem key={c.id} card={c} />
            ))}
          </ul>
        ) : (
          <p className="text-[var(--tatu-muted)]">Nenhum material aguardando aprovação.</p>
        )}
      </section>

      {done.length ? (
        <section aria-labelledby="aprovados" className="space-y-3">
          <h2 id="aprovados" className="text-2xl" style={HEADING}>
            Aprovados
          </h2>
          <ul className="space-y-4">
            {done.map((c) => (
              <CardItem key={c.id} card={c} readOnly />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
