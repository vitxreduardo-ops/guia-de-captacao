import { AdminHeader } from "@/components/admin/AdminHeader";
import {
  ApagarBotao,
  CopiaSelect,
  LocalForm,
  MaterialForm,
  UsadoInline,
} from "@/components/admin/ArmazenamentoForms";
import { listStorage } from "@/lib/armazenamento";
import { requireTeam } from "@/lib/session";
import {
  STORAGE_ROLE_LABELS,
  formatGb,
  freeGb,
  isFull,
  onlyOnePlace,
  usedPercent,
  type StorageItem,
  type StorageLocation,
} from "@/lib/storageTypes";

export const dynamic = "force-dynamic";

function Secao({ titulo, dica, children }: { titulo: string; dica?: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold text-neutral-900">{titulo}</h2>
      {dica ? <p className="mb-3 text-base text-neutral-600">{dica}</p> : <div className="mb-3" />}
      {children}
    </section>
  );
}

function Cartao({ l }: { l: StorageLocation }) {
  const pct = usedPercent(l);
  const cheio = isFull(l);
  return (
    <li className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-base font-medium text-neutral-900">{l.name}</p>
        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-sm text-neutral-700">
          {STORAGE_ROLE_LABELS[l.role]}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={Math.min(pct, 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${l.name} ${pct}% cheio`}
        className="my-3 h-2 overflow-hidden rounded-full bg-neutral-100"
      >
        <div
          className={`h-full ${cheio ? "bg-red-600" : "bg-emerald-600"}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <p className="text-sm text-neutral-600 tabular-nums">
        {formatGb(l.usedGb)} de {formatGb(l.capacityGb)} · {formatGb(freeGb(l))} livres ({pct}%)
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        {l.deviceKey ? (
          <p className="text-sm text-neutral-600">
            {l.connected ? "Lido pelo app do Mac" : "Desconectado"}
            {l.readAt ? ` · ${new Date(l.readAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" })}` : ""}
          </p>
        ) : (
          <UsadoInline id={l.id} usedGb={l.usedGb} />
        )}
        <ApagarBotao id={l.id} tipo="espaco" nome={l.name} />
      </div>
    </li>
  );
}

export default async function ArmazenamentoPage() {
  await requireTeam("armazenamento");
  const { locations, items } = await listStorage();
  const cheios = locations.filter(isFull);
  const sozinhos = onlyOnePlace(items, locations).sort((a, b) => b.sizeGb - a.sizeGb);
  const totalCap = locations.reduce((s, l) => s + l.capacityGb, 0);
  const totalFree = locations.reduce((s, l) => s + freeGb(l), 0);
  const nome = (id: string) => locations.find((l) => l.id === id)?.name;
  const linha = (i: StorageItem) => {
                const aqui = i.locationIds.map(nome).filter(Boolean);
                const outros = locations.filter((l) => !l.deviceKey && !i.locationIds.includes(l.id));
                return (
                  <li key={i.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                    <div className="min-w-0 flex-1 basis-44">
                      <p className="text-base font-medium text-neutral-900">{i.name}</p>
                      <p className="text-sm text-neutral-500">
                        {formatGb(i.sizeGb)} · {aqui.length ? `só em ${aqui.join(", ")}` : "sem lugar marcado"}
                      </p>
                    </div>
                    <CopiaSelect id={i.id} options={outros} />
                    {i.locationIds.some((id) => locations.find((l) => l.id === id)?.deviceKey) ? (
                      <span className="text-sm text-neutral-600">Copie a pasta para outro disco; some daqui na próxima leitura.</span>
                    ) : null}
                    <ApagarBotao id={i.id} tipo="material" nome={i.name} />
                  </li>
                );
              };

  return (
    <div className="mx-auto w-full max-w-4xl pb-12">
      <AdminHeader
        title="Armazenamento"
        trail={[{ label: "Admin", href: "/admin" }, { label: "Armazenamento" }]}
      />

      <Secao
        titulo="Onde está seu material e quanto espaço você tem?"
        dica={
          locations.length
            ? `${formatGb(totalCap)} em ${locations.length} ${locations.length === 1 ? "espaço" : "espaços"} · ${formatGb(totalFree)} livres`
            : "Cadastre seus SSDs e a nuvem para ver quanto cabe em cada um."
        }
      >
        {locations.length ? (
          <ul className="mb-4 grid gap-3 sm:grid-cols-2">
            {locations.map((l) => <Cartao key={l.id} l={l} />)}
          </ul>
        ) : null}
        <LocalForm />
      </Secao>

      <Secao
        titulo="Gestão do espaço"
        dica="O que merece atenção antes que o disco de edição encha ou um material fique sem cópia."
      >
        <h3 className="mb-2 text-base font-medium text-neutral-900">Espaço cheio</h3>
        {cheios.length ? (
          <ul className="mb-6 space-y-2">
            {cheios.map((l) => (
              <li key={l.id} role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-base text-neutral-900">
                <strong>{l.name}</strong> está {usedPercent(l)}% cheio. Sobram {formatGb(freeGb(l))}, e o aviso é a
                partir de {l.limitPercent}%. Mova o que já tem cópia para outro lugar.
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-6 text-base text-neutral-600">Nenhum espaço passou do limite. Tudo certo por aqui.</p>
        )}

        <h3 className="mb-2 text-base font-medium text-neutral-900">Só existem num lugar</h3>
        {sozinhos.length ? (
          <>
            <p className="mb-2 text-base text-red-700">
              {sozinhos.length} {sozinhos.length === 1 ? "material tem" : "materiais têm"} cópia em menos de dois lugares.
              Se esse disco falhar, perde.
            </p>
            <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
              {sozinhos.slice(0, 8).map(linha)}
            </ul>
            {sozinhos.length > 8 ? (
              <details className="mt-2 mb-6">
                <summary className="min-h-11 cursor-pointer text-base text-neutral-700 underline">
                  Ver os outros {sozinhos.length - 8}
                </summary>
                <ul className="mt-2 divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
                  {sozinhos.slice(8).map(linha)}
                </ul>
              </details>
            ) : <div className="mb-6" />}
          </>
        ) : (
          <p className="mb-6 text-base text-neutral-600">
            {items.length ? "Todos os materiais têm cópia em dois lugares ou mais." : "Nenhum material cadastrado ainda."}
          </p>
        )}

        <h3 className="mb-2 text-base font-medium text-neutral-900">Cadastrar material</h3>
        {locations.length ? <MaterialForm locations={locations} /> : (
          <p className="text-base text-neutral-600">Cadastre um espaço primeiro.</p>
        )}
      </Secao>
    </div>
  );
}
