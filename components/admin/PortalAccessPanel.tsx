"use client";

import { useState, useTransition } from "react";
import { Check, Copy, RefreshCw } from "lucide-react";
import { saveClientAccessAction } from "@/app/admin/area-do-cliente/acessos/actions";
import { generatePassword } from "@/lib/passwords";

/** "Dra. Juliana" → "dra.juliana"; sugestão, o admin pode trocar. */
function suggestUsername(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

/**
 * Acesso do cliente ao portal num painel só: usuário sugerido, senha já
 * gerada, e o convite pronto pra colar no WhatsApp. O admin não digita nada
 * que o sistema possa decidir por ele.
 */
export function PortalAccessPanel({
  clientId,
  clientName,
  login,
}: {
  clientId: string;
  clientName: string;
  login: string | null;
}) {
  const [username, setUsername] = useState(login ?? suggestUsername(clientName));
  const [password, setPassword] = useState(() => generatePassword());
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const invite = `Oi! Seu acesso ao portal da Tatú Estúdio Criativo:\n${
    typeof window === "undefined" ? "" : window.location.origin
  }/admin/login\nUsuário: ${username}\nSenha: ${password}`;

  function save() {
    setError(null);
    startTransition(async () => {
      const data = new FormData();
      data.set("clientId", clientId);
      data.set("username", username);
      data.set("password", password);
      try {
        await saveClientAccessAction(data);
        setSaved(true);
      } catch {
        setError("Não deu para salvar. Usuário com 3+ caracteres e já não usado por outra pessoa.");
      }
    });
  }

  async function copyInvite() {
    await navigator.clipboard.writeText(invite);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="basis-full rounded-lg bg-neutral-50 p-3">
      <p className="mb-2 text-sm text-neutral-700">
        {login ? `Acesso atual: ${login}. Gerar nova senha troca a anterior.` : "Cria o login que este cliente usa para entrar em /cliente."}
      </p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-36 flex-1 text-xs font-medium text-neutral-600">
          Usuário
          <input
            value={username}
            onChange={(e) => { setUsername(e.target.value); setSaved(false); }}
            className="mt-1 min-h-11 w-full rounded-md border border-neutral-300 px-3 text-sm font-normal text-neutral-900"
          />
        </label>
        <label className="min-w-36 flex-1 text-xs font-medium text-neutral-600">
          Senha
          <div className="mt-1 flex gap-1">
            <input
              value={password}
              onChange={(e) => { setPassword(e.target.value); setSaved(false); }}
              className="min-h-11 w-full rounded-md border border-neutral-300 px-3 font-mono text-sm font-normal text-neutral-900"
            />
            <button
              type="button"
              onClick={() => { setPassword(generatePassword()); setSaved(false); }}
              aria-label="Gerar outra senha"
              className="grid size-11 shrink-0 place-items-center rounded-md border border-neutral-300 hover:bg-white"
            >
              <RefreshCw className="size-4" aria-hidden />
            </button>
          </div>
        </label>
        <button
          type="button"
          onClick={save}
          disabled={pending || saved || username.trim().length < 3 || password.length < 6}
          className="min-h-11 rounded-md bg-neutral-900 px-4 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Salvando…" : saved ? "Salvo ✓" : login ? "Trocar senha" : "Criar acesso"}
        </button>
      </div>

      {error ? <p role="alert" className="mt-2 text-sm text-red-700">{error}</p> : null}

      {saved ? (
        <button
          type="button"
          onClick={copyInvite}
          className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-md border border-neutral-900 px-4 text-sm font-medium hover:bg-white"
        >
          {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {copied ? "Convite copiado" : "Copiar convite para o WhatsApp"}
        </button>
      ) : null}
    </div>
  );
}
