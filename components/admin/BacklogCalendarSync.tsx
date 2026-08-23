import Link from "next/link";

/**
 * Faixa de status da agenda no calendário do backlog.
 *
 * A conexão em si mora em /admin/agenda: é uma preferência de cada pessoa, e
 * ficava estranha no meio de uma tela que todo mundo usa. Aqui fica só o
 * aviso de que os posts podem ir pro Google, com o caminho pra ligar.
 */
export function BacklogCalendarSync({
  connected,
  accountEmail,
}: {
  connected: boolean;
  accountEmail: string | null;
}) {
  return (
    <section className="mb-6 rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-neutral-900">Google Agenda</h2>
          <p className="text-xs text-neutral-500">
            {connected
              ? `Sincronizando na sua agenda${accountEmail ? ` (${accountEmail})` : ""}. Todo material com data vira um evento.`
              : "Sua agenda não está conectada — os materiais com data não aparecem no seu Google Agenda."}
          </p>
        </div>

        <Link
          href="/admin/agenda"
          className={
            connected
              ? "rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
              : "rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
          }
        >
          {connected ? "Gerenciar" : "Conectar minha agenda"}
        </Link>
      </div>
    </section>
  );
}
