"use client";

import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { confirmar } from "@/components/ConfirmHost";
import { STORAGE_ROLE_LABELS, type StorageLocation } from "@/lib/storageTypes";
import {
  addCopyAction,
  addItemAction,
  addLocationAction,
  deleteItemAction,
  deleteLocationAction,
  updateUsedAction,
} from "@/app/admin/armazenamento/actions";

const CAMPO =
  "min-h-11 w-full rounded-lg border border-neutral-300 bg-white px-3 text-base focus:border-neutral-500 focus:outline-none";
const BOTAO =
  "inline-flex min-h-11 items-center rounded-lg border border-neutral-300 px-4 text-base hover:bg-neutral-50 transition-transform focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.97] disabled:opacity-50";

/** Roda a ação e limpa o formulário: o cadastro é uma linha só, sem sair da tela. */
function useEnvio(action: (f: FormData) => Promise<void>) {
  const [pending, start] = useTransition();
  const ref = useRef<HTMLFormElement>(null);
  const submit = (f: FormData) =>
    start(async () => {
      await action(f);
      ref.current?.reset();
    });
  return { pending, ref, submit };
}

export function LocalForm() {
  const { pending, ref, submit } = useEnvio(addLocationAction);
  return (
    <form
      ref={ref}
      action={submit}
      className="grid gap-3 rounded-xl border border-neutral-200 bg-white p-4 sm:grid-cols-2"
    >
      <label className="block sm:col-span-2">
        <span className="mb-1 block text-sm font-medium text-neutral-700">Nome do espaço</span>
        <input name="nome" required placeholder="Ex.: Extreme SSD" className={CAMPO} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-neutral-700">Função</span>
        <select name="papel" className={CAMPO}>
          {Object.entries(STORAGE_ROLE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-neutral-700">Avisar quando passar de (%)</span>
        <input name="limite" inputMode="numeric" defaultValue="80" className={CAMPO} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-neutral-700">Capacidade</span>
        <input name="capacidade" required inputMode="decimal" placeholder="2" className={CAMPO} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-neutral-700">Já usado</span>
        <input name="usado" inputMode="decimal" placeholder="0" className={CAMPO} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-neutral-700">Medida</span>
        <select name="unidade" defaultValue="TB" className={CAMPO}>
          <option>TB</option>
          <option>GB</option>
        </select>
      </label>
      <div className="flex items-end">
        <button disabled={pending} className={BOTAO}>
          {pending ? "Salvando…" : "Adicionar espaço"}
        </button>
      </div>
    </form>
  );
}

export function MaterialForm({ locations }: { locations: StorageLocation[] }) {
  const { pending, ref, submit } = useEnvio(addItemAction);
  // Disco lido pelo app é a verdade: a próxima leitura desfaria a marcação à mão.
  locations = locations.filter((l) => !l.deviceKey);
  return (
    <form
      ref={ref}
      action={submit}
      className="grid gap-3 rounded-xl border border-neutral-200 bg-white p-4 sm:grid-cols-[1fr_8rem]"
    >
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-neutral-700">Material</span>
        <input name="nome" required placeholder="Ex.: Clínica Sorriso, bruto de outubro" className={CAMPO} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-neutral-700">Tamanho (GB)</span>
        <input name="tamanho" inputMode="decimal" placeholder="120" className={CAMPO} />
      </label>
      <fieldset className="sm:col-span-2">
        <legend className="mb-1 text-sm font-medium text-neutral-700">Onde tem cópia?</legend>
        <div className="flex flex-wrap gap-2">
          {locations.map((l) => (
            <label key={l.id} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-neutral-300 px-3 text-base">
              <input type="checkbox" name="lugares" value={l.id} />
              {l.name}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <button disabled={pending} className={BOTAO}>
          {pending ? "Salvando…" : "Adicionar material"}
        </button>
      </div>
    </form>
  );
}

/** Atualizar quanto está usado: um campo, Enter, pronto. */
export function UsadoInline({ id, usedGb }: { id: string; usedGb: number }) {
  const tb = usedGb >= 1000;
  const [pending, start] = useTransition();
  return (
    <form action={(f) => start(() => updateUsedAction(f))} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="unidade" value={tb ? "TB" : "GB"} />
      <label className="text-sm text-neutral-600" htmlFor={`usado-${id}`}>Usado agora ({tb ? "TB" : "GB"})</label>
      <input
        id={`usado-${id}`}
        name="usado"
        inputMode="decimal"
        defaultValue={(tb ? usedGb / 1000 : usedGb).toFixed(tb ? 2 : 0).replace(".", ",")}
        className="min-h-11 w-24 rounded-lg border border-neutral-300 bg-white px-2 text-base"
      />
      <button disabled={pending} className={BOTAO}>{pending ? "…" : "Salvar"}</button>
    </form>
  );
}

export function CopiaSelect({ id, options }: { id: string; options: StorageLocation[] }) {
  const [pending, start] = useTransition();
  if (options.length === 0) return null;
  return (
    <form action={(f) => start(() => addCopyAction(f))} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <select name="lugar" aria-label="Copiar para" className="min-h-11 rounded-lg border border-neutral-300 bg-white px-2 text-base">
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.name}</option>
        ))}
      </select>
      <button disabled={pending} className={BOTAO}>{pending ? "…" : "Já copiei"}</button>
    </form>
  );
}

export function ApagarBotao({ id, tipo, nome }: { id: string; tipo: "espaco" | "material"; nome: string }) {
  const [pending, start] = useTransition();
  const action = tipo === "espaco" ? deleteLocationAction : deleteItemAction;
  return (
    <button
      type="button"
      disabled={pending}
      aria-label={`Apagar ${nome}`}
      onClick={async () => {
        if (!(await confirmar(`Apagar "${nome}" só do sistema Tatú? Os arquivos no disco não são apagados.`, "Apagar"))) return;
        const f = new FormData();
        f.set("id", id);
        start(() => action(f));
      }}
      className="inline-flex min-h-11 items-center rounded-lg px-3 text-base text-neutral-600 underline hover:text-neutral-900 disabled:opacity-50"
    >
      {pending ? "Apagando…" : "Apagar"}
    </button>
  );
}

/** Ponte que o app do Mac abre na página (window.webkit.messageHandlers.guia). No navegador comum não existe. */
function ponte() {
  return (
    window as unknown as { webkit?: { messageHandlers?: { guia?: { postMessage(m: unknown): void } } } }
  ).webkit?.messageHandlers?.guia;
}

/** Pede ao app do Mac para reler só este disco e atualiza a tela quando ele termina. */
export function SincronizarBotao({ deviceKey, conectado }: { deviceKey: string; conectado: boolean }) {
  const router = useRouter();
  const noApp = useSyncExternalStore(
    () => () => {},
    () => Boolean(ponte()),
    () => false
  );
  const [estado, setEstado] = useState<"parado" | "lendo" | "ok" | "erro" | "semApp">("parado");

  useEffect(() => {
    function fim(e: Event) {
      const d = (e as CustomEvent<{ key: string; ok: boolean }>).detail;
      if (d?.key !== deviceKey) return;
      setEstado(d.ok ? "ok" : "erro");
      if (d.ok) router.refresh();
    }
    window.addEventListener("guia-sync", fim);
    return () => window.removeEventListener("guia-sync", fim);
  }, [deviceKey, router]);

  const rotulo = {
    parado: "Sincronizar este disco",
    lendo: "Sincronizando… pode levar alguns minutos",
    ok: "Sincronizado agora",
    erro: "Não consegui ler o disco",
    semApp: "Só o app do Mac lê o disco. Abra por lá.",
  }[estado];

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={!conectado || estado === "lendo"}
        onClick={() => {
          if (!noApp) return setEstado("semApp");
          setEstado("lendo");
          ponte()?.postMessage({ acao: "sincronizar", key: deviceKey });
        }}
        className={BOTAO}
      >
        {estado === "lendo" ? "Sincronizando…" : "Sincronizar este disco"}
      </button>
      {estado !== "parado" ? (
        <span role="status" className="text-sm text-neutral-600">
          {rotulo}
        </span>
      ) : !conectado ? (
        <span className="text-sm text-neutral-500">Conecte o disco para sincronizar</span>
      ) : null}
    </div>
  );
}

/** Busca ao digitar: espera 250 ms parado e põe o termo no endereço, que a página lê. */
export function BuscaArmazenamento({ inicial }: { inicial: string }) {
  const router = useRouter();
  const [valor, setValor] = useState(inicial);
  const [pending, start] = useTransition();
  const espera = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function ir(v: string) {
    clearTimeout(espera.current);
    espera.current = setTimeout(
      () =>
        start(() =>
          router.replace(v.trim() ? `/admin/armazenamento?q=${encodeURIComponent(v.trim())}` : "/admin/armazenamento")
        ),
      250
    );
  }

  return (
    <div className="relative mb-5" role="search">
      <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-neutral-400" />
      <input
        type="text"
        value={valor}
        onChange={(e) => {
          setValor(e.target.value);
          ir(e.target.value);
        }}
        placeholder="Buscar pasta ou cliente em todos os discos"
        aria-label="Buscar pasta ou cliente em todos os discos"
        className="min-h-12 w-full rounded-2xl border border-neutral-200 bg-white pr-12 pl-11 text-base shadow-[0_1px_2px_rgba(30,28,24,0.04)] focus:border-neutral-400 focus:outline-none"
      />
      {valor ? (
        <button
          type="button"
          aria-label="Limpar busca"
          onClick={() => {
            setValor("");
            ir("");
          }}
          className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-neutral-500 hover:bg-neutral-100 pointer-coarse:size-11"
        >
          {pending ? <span className="size-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-700" /> : <X aria-hidden="true" className="size-4" />}
        </button>
      ) : null}
    </div>
  );
}

/** Pede ao app do Mac para reler todos os discos conectados de uma vez e mostra quantos estão conectados. */
export function SincronizarTodosBotao({ conectados, discos }: { conectados: number; discos: number }) {
  const router = useRouter();
  const noApp = useSyncExternalStore(
    () => () => {},
    () => Boolean(ponte()),
    () => false
  );
  const [estado, setEstado] = useState<"parado" | "lendo" | "ok" | "erro" | "semApp">("parado");

  useEffect(() => {
    function fim(e: Event) {
      const d = (e as CustomEvent<{ key: string; ok: boolean }>).detail;
      if (d?.key !== "todos") return;
      setEstado(d.ok ? "ok" : "erro");
      if (d.ok) router.refresh();
    }
    window.addEventListener("guia-sync", fim);
    return () => window.removeEventListener("guia-sync", fim);
  }, [router]);

  const texto = {
    parado: "",
    lendo: "Sincronizando… pode levar alguns minutos",
    ok: "Tudo sincronizado agora",
    erro: "Não consegui ler os discos",
    semApp: "Só o app do Mac lê os discos. Abra por lá.",
  }[estado];

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <span className="inline-flex items-center gap-2 text-sm text-neutral-600">
        <span
          aria-hidden="true"
          className={`size-2.5 rounded-full ${
            conectados ? "bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.2)]" : "bg-neutral-300"
          }`}
        />
        {conectados} de {discos} {discos === 1 ? "disco conectado" : "discos conectados"}
      </span>
      <button
        type="button"
        disabled={!conectados || estado === "lendo"}
        onClick={() => {
          if (!noApp) return setEstado("semApp");
          setEstado("lendo");
          ponte()?.postMessage({ acao: "sincronizar", key: "todos" });
        }}
        className={BOTAO}
      >
        {estado === "lendo" ? "Sincronizando…" : "Sincronizar todos os conectados"}
      </button>
      {texto ? (
        <span role="status" className="text-sm text-neutral-600">
          {texto}
        </span>
      ) : null}
    </div>
  );
}
