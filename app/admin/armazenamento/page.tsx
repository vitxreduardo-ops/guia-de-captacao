import { ChevronDown, ChevronRight, Cloud, HardDrive, Plus, ShieldCheck, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import {
  ApagarBotao,
  CopiaSelect,
  LocalForm,
  MaterialForm,
  SincronizarBotao,
  UsadoInline,
} from "@/components/admin/ArmazenamentoForms";
import { listStorage } from "@/lib/armazenamento";
import { requireTeam } from "@/lib/session";
import {
  STORAGE_ROLE_LABELS,
  formatGb,
  freeGb,
  isFull,
  normalizeStorageRole,
  onlyOnePlace,
  usedPercent,
  type StorageItem,
  type StorageLocation,
  type StorageRole,
} from "@/lib/storageTypes";

export const dynamic = "force-dynamic";

/** Cada função tem uma cor só: a mesma na rosca, no ícone e na etiqueta. */
const PAPEL: Record<StorageRole, { cor: string; etiqueta: string }> = {
  estudio: { cor: "#6366f1", etiqueta: "bg-indigo-50 text-indigo-700" },
  backup: { cor: "#10b981", etiqueta: "bg-emerald-50 text-emerald-700" },
  entrega: { cor: "#f59e0b", etiqueta: "bg-amber-50 text-amber-700" },
};

const CARTAO = "rounded-2xl border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(30,28,24,0.04)]";
const FOCO =
  "focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none";

function lido(l: StorageLocation): string {
  if (!l.deviceKey) return "Cadastrado à mão";
  const quando = l.readAt
    ? new Date(l.readAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })
    : "";
  return `${l.connected ? "Lido pelo app do Mac" : "Desconectado"}${quando ? ` · ${quando}` : ""}`;
}

/** Rosca de uso total: um arco por função, o resto fica no trilho cinza. */
function Rosca({ partes, totalGb, usadoGb }: { partes: { cor: string; gb: number }[]; totalGb: number; usadoGb: number }) {
  const r = 70;
  const c = 2 * Math.PI * r;
  const pct = totalGb ? Math.round((usadoGb / totalGb) * 100) : 0;
  const comecos = partes.map((_, i) => partes.slice(0, i).reduce((s, p) => s + (totalGb ? (p.gb / totalGb) * c : 0), 0));
  return (
    <div className="relative size-44 shrink-0" role="img" aria-label={`${pct}% do espaço total usado`}>
      <svg viewBox="0 0 180 180" className="size-full -rotate-90">
        <circle cx="90" cy="90" r={r} fill="none" strokeWidth="18" className="stroke-neutral-100" />
        {partes.map((p, i) => {
          const len = totalGb ? (p.gb / totalGb) * c : 0;
          return (
            <circle
              key={i}
              cx="90"
              cy="90"
              r={r}
              fill="none"
              stroke={p.cor}
              strokeWidth="18"
              strokeLinecap="butt"
              strokeDasharray={`${Math.max(0, len - 2)} ${c}`}
              strokeDashoffset={-comecos[i]}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-semibold text-neutral-900 tabular-nums">{pct}%</span>
        <span className="text-sm text-neutral-500">usado</span>
      </div>
    </div>
  );
}

function Barra({ pct, cheio, nome }: { pct: number; cheio: boolean; nome: string }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.min(pct, 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${nome} ${pct}% cheio`}
      className="h-2 overflow-hidden rounded-full bg-neutral-100"
    >
      <div
        className={`h-full rounded-full ${cheio ? "bg-red-500" : "bg-neutral-800"}`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

function Material({
  i,
  locId,
  cor,
  maior,
  n,
}: {
  i: StorageItem;
  locId: string;
  cor: string;
  maior: number;
  n: number;
}) {
  const subs = i.subfolders[locId] ?? [];
  const maiorSub = subs[0]?.sizeGb || 1;
  const linha = (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 sm:grid-cols-[12rem_minmax(0,1fr)_5rem_6rem]">
      <span className="flex min-w-0 items-center gap-1 text-sm font-medium text-neutral-900">
        {subs.length ? (
          <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 text-neutral-400 transition-transform group-open/sub:rotate-90" />
        ) : (
          <span className="w-3.5 shrink-0" />
        )}
        <span className="truncate">{i.name}</span>
      </span>
      <span className="order-last col-span-2 h-1.5 overflow-hidden rounded-full bg-neutral-100 sm:order-none sm:col-span-1">
        <span className="block h-full rounded-full" style={{ width: `${Math.max(2, (i.sizeGb / maior) * 100)}%`, backgroundColor: cor }} />
      </span>
      <span className="text-right text-sm text-neutral-600 tabular-nums">{formatGb(i.sizeGb)}</span>
      <span
        className={`justify-self-end rounded-full px-2 py-0.5 text-xs font-medium ${
          n < 2 ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
        }`}
      >
        {n < 2 ? "só aqui" : `${n} cópias`}
      </span>
    </div>
  );
  if (!subs.length) return <li>{linha}</li>;
  return (
    <li>
      <details className="group/sub">
        <summary className={`cursor-pointer list-none rounded-md [&::-webkit-details-marker]:hidden ${FOCO}`}>{linha}</summary>
        <ul className="mt-2 mb-1 ml-1.5 space-y-1.5 border-l border-neutral-200 pl-4">
          {subs.map((x) => (
            <li key={x.name} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_5rem]">
              <span className="truncate text-sm text-neutral-700">{x.name}</span>
              <span className="order-last col-span-2 h-1 overflow-hidden rounded-full bg-neutral-100 sm:order-none sm:col-span-1">
                <span className="block h-full rounded-full opacity-60" style={{ width: `${Math.max(2, (x.sizeGb / maiorSub) * 100)}%`, backgroundColor: cor }} />
              </span>
              <span className="text-right text-sm text-neutral-500 tabular-nums">{formatGb(x.sizeGb)}</span>
            </li>
          ))}
        </ul>
      </details>
    </li>
  );
}

function Espaco({ l, items, copias }: { l: StorageLocation; items: StorageItem[]; copias: Map<string, number> }) {
  const pct = usedPercent(l);
  const cheio = isFull(l);
  const cor = PAPEL[l.role].cor;
  const aqui = items.filter((i) => i.locationIds.includes(l.id)).sort((a, b) => b.sizeGb - a.sizeGb);
  const maior = aqui[0]?.sizeGb || 1;
  const Icone = l.deviceKey ? HardDrive : Cloud;

  return (
    <details open={cheio} className={`group ${CARTAO}`}>
      <summary
        className={`flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl p-4 pointer-coarse:min-h-11 [&::-webkit-details-marker]:hidden ${FOCO}`}
      >
        <span
          className="grid size-11 shrink-0 place-items-center rounded-xl"
          style={{ backgroundColor: `${cor}1a`, color: cor }}
        >
          <Icone aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0 flex-1 basis-40">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-base font-semibold text-neutral-900">{l.name}</p>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PAPEL[l.role].etiqueta}`}>
              {STORAGE_ROLE_LABELS[l.role]}
            </span>
            {cheio ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                <TriangleAlert aria-hidden="true" className="size-3" /> Quase cheio
              </span>
            ) : null}
          </div>
          <p className="text-sm text-neutral-500">{lido(l)}</p>
        </div>
        <div className="order-last w-full sm:order-none sm:w-52">
          <Barra pct={pct} cheio={cheio} nome={l.name} />
        </div>
        <div className="text-right">
          <p className="text-base font-semibold text-neutral-900 tabular-nums">
            {formatGb(l.usedGb)} <span className="font-normal text-neutral-500">de {formatGb(l.capacityGb)}</span>
          </p>
          <p className="text-sm text-neutral-500 tabular-nums">{formatGb(freeGb(l))} livres</p>
        </div>
        <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-neutral-400 transition-transform group-open:rotate-180" />
      </summary>

      <div className="border-t border-neutral-100 p-4">
        {aqui.length ? (
          <>
            <ul className="space-y-2.5">
              {aqui.slice(0, 8).map((i) => (
                <Material key={i.id} i={i} locId={l.id} cor={cor} maior={maior} n={copias.get(i.id) ?? 0} />
              ))}
            </ul>
            {aqui.length > 8 ? (
              <details className="mt-3">
                <summary className={`inline-flex min-h-9 cursor-pointer items-center rounded-md text-sm text-neutral-700 underline ${FOCO}`}>
                  Ver os outros {aqui.length - 8} menores
                </summary>
                <ul className="mt-2 space-y-2.5">
                  {aqui.slice(8).map((i) => (
                    <Material key={i.id} i={i} locId={l.id} cor={cor} maior={maior} n={copias.get(i.id) ?? 0} />
                  ))}
                </ul>
              </details>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-neutral-500">
            {l.deviceKey ? "Nenhuma pasta lida neste disco ainda." : "Nenhum material marcado aqui."}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 pt-3">
          {l.deviceKey ? (
            <SincronizarBotao deviceKey={l.deviceKey} conectado={l.connected} />
          ) : (
            <UsadoInline id={l.id} usedGb={l.usedGb} />
          )}
          <ApagarBotao id={l.id} tipo="espaco" nome={l.name} />
        </div>
      </div>
    </details>
  );
}

export default async function ArmazenamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ papel?: string }>;
}) {
  await requireTeam("armazenamento");
  const { papel } = await searchParams;
  const filtro = papel === "estudio" || papel === "backup" || papel === "entrega" ? normalizeStorageRole(papel) : null;
  const { locations, items } = await listStorage();

  const cheios = locations.filter(isFull);
  const sozinhos = onlyOnePlace(items, locations).sort((a, b) => b.sizeGb - a.sizeGb);
  const ids = new Set(locations.map((l) => l.id));
  const copias = new Map(items.map((i) => [i.id, i.locationIds.filter((id) => ids.has(id)).length]));
  const totalCap = locations.reduce((s, l) => s + l.capacityGb, 0);
  const totalUsado = locations.reduce((s, l) => s + l.usedGb, 0);
  const partes = (Object.keys(PAPEL) as StorageRole[]).map((role) => ({
    role,
    cor: PAPEL[role].cor,
    gb: locations.filter((l) => l.role === role).reduce((s, l) => s + l.usedGb, 0),
    n: locations.filter((l) => l.role === role).length,
  }));
  const visiveis = filtro ? locations.filter((l) => l.role === filtro) : locations;
  const nome = (id: string) => locations.find((l) => l.id === id)?.name;

  const linha = (i: StorageItem) => {
    const aqui = i.locationIds.map(nome).filter(Boolean);
    const outros = locations.filter((l) => !l.deviceKey && !i.locationIds.includes(l.id));
    const doDisco = i.locationIds.some((id) => locations.find((l) => l.id === id)?.deviceKey);
    return (
      <li key={i.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <div className="min-w-0 flex-1 basis-44">
          <p className="text-base font-medium text-neutral-900">{i.name}</p>
          <p className="text-sm text-neutral-500">
            {formatGb(i.sizeGb)} · {aqui.length ? `só em ${aqui.join(", ")}` : "sem lugar marcado"}
          </p>
        </div>
        <CopiaSelect id={i.id} options={outros} />
        {doDisco && outros.length === 0 ? (
          <span className="text-sm text-neutral-500">Copie a pasta para outro disco</span>
        ) : null}
        <ApagarBotao id={i.id} tipo="material" nome={i.name} />
      </li>
    );
  };

  return (
    <div className="mx-auto w-full max-w-5xl pb-12">
      <AdminHeader
        title="Armazenamento"
        trail={[{ label: "Admin", href: "/admin" }, { label: "Armazenamento" }]}
      />

      {locations.length ? (
        <section className="mb-6 grid gap-4 lg:grid-cols-[1fr_19rem]">
          <div className={`${CARTAO} flex flex-wrap items-center gap-x-8 gap-y-5 p-5`}>
            <Rosca partes={partes} totalGb={totalCap} usadoGb={totalUsado} />
            <div className="min-w-0 flex-1 basis-56">
              <h2 className="text-lg font-semibold text-neutral-900">Onde está seu material</h2>
              <p className="mb-4 text-sm text-neutral-500">
                {locations.length} {locations.length === 1 ? "espaço" : "espaços"}, {formatGb(totalCap)} no total
              </p>
              <ul className="mb-4 space-y-1.5">
                {partes.filter((p) => p.n).map((p) => (
                  <li key={p.role} className="flex items-center gap-2 text-sm text-neutral-700">
                    <span aria-hidden="true" className="size-2.5 rounded-full" style={{ backgroundColor: p.cor }} />
                    <span className="flex-1">{STORAGE_ROLE_LABELS[p.role]}</span>
                    <span className="tabular-nums text-neutral-500">{formatGb(p.gb)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex gap-6 border-t border-neutral-100 pt-3">
                <div>
                  <p className="text-xl font-semibold text-neutral-900 tabular-nums">{formatGb(totalCap - totalUsado)}</p>
                  <p className="text-sm text-neutral-500">livres</p>
                </div>
                <div>
                  <p className="text-xl font-semibold text-neutral-900 tabular-nums">{items.length}</p>
                  <p className="text-sm text-neutral-500">materiais</p>
                </div>
              </div>
            </div>
          </div>

          <aside className={`${CARTAO} p-5`} aria-label="Atenção">
            <h2 className="mb-3 text-lg font-semibold text-neutral-900">Atenção</h2>
            {cheios.length + sozinhos.length === 0 ? (
              <p className="flex items-start gap-2 text-sm text-neutral-600">
                <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                Nada pra resolver agora. Todo material tem cópia e há espaço em todos os discos.
              </p>
            ) : (
              <ul className="space-y-3">
                {cheios.map((l) => (
                  <li key={l.id} role="alert" className="flex items-start gap-2 text-sm text-neutral-800">
                    <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-red-600" />
                    <span>
                      <strong>{l.name}</strong> está {usedPercent(l)}% cheio. Sobram {formatGb(freeGb(l))}; o aviso é a
                      partir de {l.limitPercent}%.
                    </span>
                  </li>
                ))}
                {sozinhos.length ? (
                  <li className="flex items-start gap-2 text-sm text-neutral-800">
                    <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-amber-600" />
                    <span>
                      {sozinhos.length} {sozinhos.length === 1 ? "material existe" : "materiais existem"} num lugar só.{" "}
                      <a href="#so-um-lugar" className="underline">Ver quais</a>
                    </span>
                  </li>
                ) : null}
              </ul>
            )}
          </aside>
        </section>
      ) : (
        <p className={`${CARTAO} mb-6 p-6 text-base text-neutral-600`}>
          Nenhum espaço ainda. Abra o app do Mac com um SSD conectado e ele aparece aqui sozinho, ou adicione um à mão abaixo.
        </p>
      )}

      {locations.length ? (
        <nav aria-label="Filtrar por função" className="mb-3 flex flex-wrap gap-2">
          {[{ id: null, label: "Todos", n: locations.length }, ...partes.filter((p) => p.n).map((p) => ({ id: p.role, label: STORAGE_ROLE_LABELS[p.role], n: p.n }))].map((c) => {
            const ativo = filtro === c.id;
            return (
              <Link
                key={c.label}
                href={c.id ? `/admin/armazenamento?papel=${c.id}` : "/admin/armazenamento"}
                aria-current={ativo ? "page" : undefined}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm transition-transform active:scale-[0.97] pointer-coarse:min-h-11 ${FOCO} ${
                  ativo ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                {c.label}
                <span className={ativo ? "text-white/70" : "text-neutral-400"}>{c.n}</span>
              </Link>
            );
          })}
        </nav>
      ) : null}

      <div className="mb-4 space-y-3">
        {visiveis.map((l) => (
          <Espaco key={l.id} l={l} items={items} copias={copias} />
        ))}
      </div>

      <details className="group mb-10">
        <summary className={`inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-full border border-neutral-300 bg-white px-4 text-sm font-medium text-neutral-800 hover:bg-neutral-50 [&::-webkit-details-marker]:hidden ${FOCO}`}>
          <Plus aria-hidden="true" className="size-4 transition-transform group-open:rotate-45" /> Adicionar espaço à mão
        </summary>
        <div className="mt-3 max-w-xl">
          <LocalForm />
        </div>
      </details>

      <section id="so-um-lugar" className="scroll-mt-4">
        <h2 className="text-lg font-semibold text-neutral-900">Gestão do espaço</h2>
        <p className="mb-3 text-sm text-neutral-500">
          Material com cópia em menos de dois lugares. Se esse disco falhar, perde.
        </p>
        {sozinhos.length ? (
          <>
            <ul className={`${CARTAO} divide-y divide-neutral-100`}>{sozinhos.slice(0, 8).map(linha)}</ul>
            {sozinhos.length > 8 ? (
              <details className="mt-2">
                <summary className={`min-h-11 cursor-pointer text-sm text-neutral-700 underline ${FOCO}`}>
                  Ver os outros {sozinhos.length - 8}
                </summary>
                <ul className={`${CARTAO} mt-2 divide-y divide-neutral-100`}>{sozinhos.slice(8).map(linha)}</ul>
              </details>
            ) : null}
          </>
        ) : (
          <p className={`${CARTAO} p-4 text-sm text-neutral-600`}>
            {items.length ? "Todos os materiais têm cópia em dois lugares ou mais." : "Nenhum material cadastrado ainda."}
          </p>
        )}

        {locations.some((l) => !l.deviceKey) ? (
          <details className="group mt-4">
            <summary className={`inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-full border border-neutral-300 bg-white px-4 text-sm font-medium text-neutral-800 hover:bg-neutral-50 [&::-webkit-details-marker]:hidden ${FOCO}`}>
              <Plus aria-hidden="true" className="size-4 transition-transform group-open:rotate-45" /> Cadastrar material à mão
            </summary>
            <div className="mt-3 max-w-xl">
              <MaterialForm locations={locations} />
            </div>
          </details>
        ) : null}
      </section>
    </div>
  );
}
