"use client";

import { useActionState, useState } from "react";
import { Copy, Check, Trash2, ChevronDown, Download, Search } from "lucide-react";
import { criarLinkAction, apagarLinkAction, atualizarLinkAction } from "@/app/admin/links/actions";
import type { ShortLinkComStats } from "@/lib/shortLinks";

const DOMINIO = "tatuestudio.com.br";
const CAMPO = "block w-full rounded-md border border-neutral-300 px-3 py-2 text-sm";
const FUSO = "America/Sao_Paulo";

type Cliente = { id: string; name: string };

const quando = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: FUSO });

function Copiar({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(texto);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 1500);
      }}
      className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 pointer-coarse:min-h-11"
    >
      {copiado ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
      {copiado ? "Copiado" : "Copiar"}
    </button>
  );
}

function SelectCliente({ clientes, defaultValue = "" }: { clientes: Cliente[]; defaultValue?: string }) {
  return (
    <select name="client_id" defaultValue={defaultValue} className={CAMPO}>
      <option value="">Nenhum</option>
      {clientes.map((c) => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  );
}

function Barras({ dias }: { dias: { dia: string; n: number }[] }) {
  const max = Math.max(1, ...dias.map((d) => d.n));
  return (
    <div className="flex h-12 items-end gap-1" role="img" aria-label={`Cliques nos últimos ${dias.length} dias`}>
      {dias.map((d) => (
        <div
          key={d.dia}
          title={`${d.dia.split("-").reverse().slice(0, 2).join("/")}: ${d.n}`}
          style={{ height: `${Math.max(d.n ? 12 : 4, (d.n / max) * 100)}%` }}
          className={`flex-1 rounded-sm ${d.n ? "bg-neutral-800" : "bg-neutral-200"}`}
        />
      ))}
    </div>
  );
}

function Linha({ l, clientes }: { l: ShortLinkComStats; clientes: Cliente[] }) {
  const [aberto, setAberto] = useState(false);
  const [salvo, salvar, salvando] = useActionState(atualizarLinkAction, null);
  const cliente = clientes.find((c) => c.id === l.client_id);
  const curto = `${DOMINIO}/${l.slug}`;
  const ultimo = l.stats.ultimos[0];
  const estado = !l.ativo ? "Desativado" : l.expirado ? "Expirado" : l.expiraDia ? `Vai até ${l.expiraDia.split("-").reverse().slice(0, 2).join("/")}` : null;
  const fora = !l.ativo || l.expirado;
  return (
    <li className="p-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setAberto(!aberto)}
          aria-expanded={aberto}
          aria-label={`Detalhes de ${curto}`}
          className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 pointer-coarse:min-h-11 pointer-coarse:min-w-11"
        >
          <ChevronDown className={`size-4 transition-transform ${aberto ? "rotate-180" : ""}`} aria-hidden="true" />
        </button>
        <div className="min-w-0 flex-1">
          <p className={`truncate text-sm font-medium ${fora ? "text-neutral-500" : "text-neutral-900"}`}>
            {l.rotulo || curto}
            {estado && (
              <span className={`ml-2 rounded px-1.5 py-0.5 text-xs font-normal ${fora ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                {estado}
              </span>
            )}
            {cliente && <span className="ml-2 rounded bg-neutral-100 px-1.5 py-0.5 text-xs font-normal text-neutral-600">{cliente.name}</span>}
          </p>
          <p className="truncate text-xs text-neutral-500">
            {l.rotulo && <>{curto} · </>}{l.url}
          </p>
        </div>
        <div className="shrink-0 text-right text-xs text-neutral-500">
          <p>{l.cliques} {l.cliques === 1 ? "clique" : "cliques"}</p>
          <p>{ultimo ? `último ${quando(ultimo.em)}` : l.primeiro_clique_em ? "" : "ainda não aberto"}</p>
        </div>
        <Copiar texto={`https://${curto}`} />
      </div>

      {aberto && (
        <div className="mt-3 grid gap-4 border-t border-neutral-100 pt-3 sm:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {/* Tamanho fixo: a imagem carrega depois e não pode empurrar o resto. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/admin/links/${l.slug}/qr`} alt={`QR code de ${curto}`} width={96} height={96} className="size-24 rounded-md border border-neutral-200" />
              <a
                href={`/admin/links/${l.slug}/qr?baixar=1`}
                download
                className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 pointer-coarse:min-h-11"
              >
                <Download className="size-3.5" aria-hidden="true" /> Baixar QR
              </a>
            </div>
            <p className="text-xs font-medium text-neutral-700">Últimos 14 dias</p>
            <Barras dias={l.stats.dias} />
            <p className="text-xs text-neutral-500">
              {Object.entries(l.stats.aparelhos).map(([a, n]) => `${n} ${a}`).join(" · ") || "Sem cliques no período"}
            </p>
            {l.stats.ultimos.length > 0 && (
              <ul className="space-y-0.5 text-xs text-neutral-600">
                {l.stats.ultimos.map((c, i) => (
                  <li key={i}>
                    {quando(c.em)} · {c.aparelho}{c.pais ? ` · ${c.pais}` : ""}{c.origem ? ` · via ${c.origem}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <form action={salvar} className="space-y-2">
            <input type="hidden" name="id" value={l.id} />
            <label className="block text-xs font-medium text-neutral-700">
              Destino <span className="font-normal text-neutral-500">(o link curto continua o mesmo)</span>
              <input name="url" type="url" required defaultValue={l.url} className={`${CAMPO} mt-1`} />
            </label>
            <label className="block text-xs font-medium text-neutral-700">
              Rótulo
              <input name="rotulo" defaultValue={l.rotulo} className={`${CAMPO} mt-1`} />
            </label>
            <label className="block text-xs font-medium text-neutral-700">
              Cliente
              <span className="mt-1 block"><SelectCliente clientes={clientes} defaultValue={l.client_id ?? ""} /></span>
            </label>
            <label className="block text-xs font-medium text-neutral-700">
              Vale até <span className="font-normal text-neutral-500">(vazio = sem prazo)</span>
              <input name="expira" type="date" defaultValue={l.expiraDia} className={`${CAMPO} mt-1`} />
            </label>
            <label className="flex items-center gap-2 text-xs text-neutral-700">
              <input type="checkbox" name="ativo" defaultChecked={l.ativo} />
              Ativo (desmarcado, o link cai na home)
            </label>
            <label className="flex items-center gap-2 text-xs text-neutral-700">
              <input type="checkbox" name="utm" defaultChecked={l.utm} />
              Adicionar UTM ao abrir
            </label>
            <label className="flex items-center gap-2 text-xs text-neutral-700">
              <input type="checkbox" name="avisar" defaultChecked={l.avisar_primeiro_clique} />
              Me avisar no primeiro clique
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button disabled={salvando} className="rounded-md bg-(--tatu-ink) px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60 pointer-coarse:min-h-11">
                {salvando ? "Salvando…" : "Salvar"}
              </button>
              {salvo?.erro && <span role="alert" className="text-xs text-red-600">{salvo.erro}</span>}
              {salvo?.ok && <span className="text-xs text-emerald-600">Salvo</span>}
              <button
                formAction={apagarLinkAction}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-neutral-500 hover:bg-neutral-100 hover:text-red-600 pointer-coarse:min-h-11"
              >
                <Trash2 className="size-3.5" aria-hidden="true" /> Apagar
              </button>
            </div>
          </form>
        </div>
      )}
    </li>
  );
}

export function ShortLinksManager({ links, clientes }: { links: ShortLinkComStats[]; clientes: Cliente[] }) {
  const [estado, criar, pendente] = useActionState(criarLinkAction, null);
  const [busca, setBusca] = useState("");
  const termo = busca.trim().toLowerCase();
  const visiveis = termo
    ? links.filter((l) =>
        [l.rotulo, l.slug, l.url, clientes.find((c) => c.id === l.client_id)?.name ?? ""].some((t) => t.toLowerCase().includes(termo)),
      )
    : links;

  return (
    <div className="space-y-6">
      <form action={criar} className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
        <label className="block text-sm font-medium text-neutral-800">
          Link grande
          <input name="url" type="url" required placeholder="https://…" className={`${CAMPO} mt-1`} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-neutral-800">
            Rótulo <span className="font-normal text-neutral-500">(opcional)</span>
            <input name="rotulo" placeholder="Proposta, galeria…" className={`${CAMPO} mt-1`} />
          </label>
          <label className="block text-sm font-medium text-neutral-800">
            Cliente <span className="font-normal text-neutral-500">(opcional)</span>
            <span className="mt-1 block"><SelectCliente clientes={clientes} /></span>
          </label>
        </div>
        <label className="block text-sm font-medium text-neutral-800">
          Nome curto <span className="font-normal text-neutral-500">(opcional, sem preencher eu gero um)</span>
          <span className="mt-1 flex items-center rounded-md border border-neutral-300 text-sm">
            <span className="pl-3 text-neutral-500">{DOMINIO}/</span>
            <input name="slug" maxLength={40} className="w-full rounded-md bg-transparent py-2 pr-3 pl-0.5 outline-none" />
          </span>
        </label>
        <label className="block text-sm font-medium text-neutral-800">
          Vale até <span className="font-normal text-neutral-500">(opcional)</span>
          <input name="expira" type="date" className={`${CAMPO} mt-1 sm:w-56`} />
        </label>
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input type="checkbox" name="utm" />
          Adicionar UTM ao abrir <span className="text-neutral-500">(pra link que vai pra site com análise)</span>
        </label>
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input type="checkbox" name="avisar" defaultChecked />
          Me avisar quando for aberto pela primeira vez
        </label>
        <div className="flex items-center gap-3">
          <button
            disabled={pendente}
            className="rounded-md bg-(--tatu-ink) px-4 py-2 text-sm font-medium text-white disabled:opacity-60 pointer-coarse:min-h-11"
          >
            {pendente ? "Criando…" : "Encurtar"}
          </button>
          {estado?.erro && <p role="alert" className="text-sm text-red-600">{estado.erro}</p>}
          {estado?.ok && (
            <p className="flex items-center gap-2 text-sm text-neutral-700">
              {DOMINIO}/{estado.ok} <Copiar texto={`https://${DOMINIO}/${estado.ok}`} />
            </p>
          )}
        </div>
      </form>

      {links.length > 0 && (
        <label className="relative block">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={`Buscar entre ${links.length} links (rótulo, cliente, nome ou destino)`}
            aria-label="Buscar links"
            className={`${CAMPO} pl-9`}
          />
        </label>
      )}

      <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
        {links.length === 0 && <li className="p-4 text-sm text-neutral-500">Nenhum link ainda.</li>}
        {links.length > 0 && visiveis.length === 0 && <li className="p-4 text-sm text-neutral-500">Nada encontrado pra “{busca}”.</li>}
        {visiveis.map((l) => <Linha key={l.id} l={l} clientes={clientes} />)}
      </ul>
    </div>
  );
}
