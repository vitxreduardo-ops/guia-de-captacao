"use client";

import { useState, useTransition } from "react";
import { Check, Copy, KeyRound, Link2, Pencil, RefreshCw, Trash2, UserPlus } from "lucide-react";
import {
  createClientInviteAction,
  createClientLoginAction,
  deleteClientLoginAction,
  revokeClientInviteAction,
  setGalleryArticleAction,
  updateClientLoginAction,
} from "@/app/admin/area-do-cliente/actions";
import { driveTitle } from "@/lib/editorialMonths";
import { generatePassword } from "@/lib/passwords";

export interface LoginView {
  id: string;
  username: string;
  full_name: string;
  portal_label: string;
}
export interface InviteView {
  id: string;
  token: string;
  label: string;
  created_at: string;
}

const field = "min-h-11 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm";
const btn =
  "inline-flex min-h-11 items-center gap-1.5 rounded-md border border-neutral-300 px-3 text-sm hover:bg-neutral-50 disabled:opacity-50";
const btnPrimary =
  "inline-flex min-h-11 items-center gap-1.5 rounded-md bg-neutral-900 px-4 text-sm font-medium text-white disabled:opacity-50";

const portalUrl = () => `${window.location.origin}/cliente`;
const inviteUrl = (token: string) => `${window.location.origin}/convite/${token}`;

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  return {
    copied,
    copy: async (key: string, text: string) => {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 2000);
    },
  };
}

function CopyButton({ id, text, children, state }: { id: string; text: () => string; children: string; state: ReturnType<typeof useCopy> }) {
  const done = state.copied === id;
  return (
    <button type="button" onClick={() => state.copy(id, text())} className={btn}>
      {done ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      {done ? "Copiado" : children}
    </button>
  );
}

function LoginRow({ login, clientId, clientName }: { login: LoginView; clientId: string; clientName: string }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(login.full_name);
  const [label, setLabel] = useState(login.portal_label);
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const clip = useCopy();

  const message = (password: string) =>
    `Olá! Seu acesso ao portal da Tatú Estúdio Criativo (${clientName}):\n${portalUrl()}\nUsuário: ${login.username}\nSenha: ${password}`;

  return (
    <li className="space-y-2 px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1 basis-44">
          <p className="truncate font-medium">
            {login.full_name || login.username}
            {login.portal_label ? (
              <span className="ml-2 rounded bg-neutral-100 px-1.5 py-0.5 text-xs font-normal text-neutral-700">
                {login.portal_label}
              </span>
            ) : null}
          </p>
          <p className="text-xs text-neutral-500">Usuário: {login.username}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              const password = generatePassword();
              startTransition(async () => {
                await updateClientLoginAction({ id: login.id, clientId, password });
                setNewPassword(password);
              });
            }}
            className={btn}
          >
            <KeyRound className="size-4" aria-hidden /> Nova senha
          </button>
          <button type="button" onClick={() => setEditing((v) => !v)} aria-expanded={editing} className={btn}>
            <Pencil className="size-4" aria-hidden /> Editar
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (window.confirm(`Remover o acesso de ${login.full_name || login.username}? A pessoa deixa de entrar no portal.`)) {
                startTransition(() => deleteClientLoginAction(login.id, clientId));
              }
            }}
            className={`${btn} text-red-700`}
          >
            <Trash2 className="size-4" aria-hidden /> Remover
          </button>
        </div>
      </div>

      {newPassword ? (
        <div className="flex flex-wrap items-center gap-2 rounded-md bg-neutral-50 p-2 text-sm">
          <span>
            Nova senha: <code className="font-mono font-semibold">{newPassword}</code>
          </span>
          <CopyButton id={`pw-${login.id}`} text={() => message(newPassword)} state={clip}>
            Copiar mensagem
          </CopyButton>
        </div>
      ) : null}

      {editing ? (
        <form
          className="flex flex-wrap items-end gap-2 rounded-md bg-neutral-50 p-2"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              await updateClientLoginAction({ id: login.id, clientId, fullName: name, label });
              setEditing(false);
            });
          }}
        >
          <label className="min-w-36 flex-1 text-xs font-medium text-neutral-600">
            Nome
            <input value={name} onChange={(e) => setName(e.target.value)} className={`${field} mt-1 font-normal`} />
          </label>
          <label className="min-w-36 flex-1 text-xs font-medium text-neutral-600">
            Função
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex.: Gestor de tráfego"
              className={`${field} mt-1 font-normal`}
            />
          </label>
          <button disabled={pending} className={btnPrimary}>Salvar</button>
        </form>
      ) : null}
    </li>
  );
}

export function ClientLoginsManager({
  clientId,
  clientName,
  article,
  logins,
  invites,
}: {
  clientId: string;
  clientName: string;
  article: "do" | "da";
  logins: LoginView[];
  invites: InviteView[];
}) {
  const clip = useCopy();
  const [pending, startTransition] = useTransition();
  const [inviteLabel, setInviteLabel] = useState("");
  const [current, setCurrent] = useState(article);

  // criar login manualmente
  const [manual, setManual] = useState({ fullName: "", label: "", username: "", password: generatePassword() });
  const [created, setCreated] = useState<{ username: string; password: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inviteMessage = (token: string) =>
    `Olá! A Tatú Estúdio Criativo preparou o seu acesso ao portal de ${clientName}. Crie o seu login por este link (válido por 14 dias):\n${inviteUrl(token)}`;

  return (
    <div className="space-y-8">
      <section aria-labelledby="pessoas" className="space-y-2">
        <h2 id="pessoas" className="text-base font-semibold">
          Pessoas com acesso ({logins.length})
        </h2>
        {logins.length ? (
          <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200">
            {logins.map((login) => (
              <LoginRow key={login.id} login={login} clientId={clientId} clientName={clientName} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-500">Ninguém tem acesso ainda. Envie um convite abaixo.</p>
        )}
      </section>

      <section aria-labelledby="convidar" className="space-y-3">
        <div>
          <h2 id="convidar" className="text-base font-semibold">Convidar por link</h2>
          <p className="text-sm text-neutral-600">
            A pessoa abre o link e cria o próprio nome de usuário e senha. O link vale por 14 dias e serve para uma pessoa.
          </p>
        </div>
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(async () => {
              const token = await createClientInviteAction(clientId, inviteLabel);
              setInviteLabel("");
              await clip.copy("novo", inviteMessage(token));
            });
          }}
        >
          <label className="min-w-48 flex-1 text-xs font-medium text-neutral-600">
            Função (opcional)
            <input
              value={inviteLabel}
              onChange={(e) => setInviteLabel(e.target.value)}
              placeholder="Ex.: Gestor de tráfego"
              className={`${field} mt-1 font-normal`}
            />
          </label>
          <button disabled={pending} className={btnPrimary}>
            <Link2 className="size-4" aria-hidden />
            {clip.copied === "novo" ? "Convite copiado" : "Gerar e copiar convite"}
          </button>
        </form>

        {invites.length ? (
          <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200">
            {invites.map((invite) => (
              <li key={invite.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm">
                <span className="min-w-0 flex-1">
                  Convite pendente{invite.label ? ` · ${invite.label}` : ""}
                  <span className="block text-xs text-neutral-500">
                    criado em {new Date(invite.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </span>
                <CopyButton id={invite.id} text={() => inviteMessage(invite.token)} state={clip}>
                  Copiar convite
                </CopyButton>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => startTransition(() => revokeClientInviteAction(invite.id, clientId))}
                  className={`${btn} text-red-700`}
                >
                  Revogar
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <details className="rounded-xl border border-neutral-200">
        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 text-sm font-semibold [&::-webkit-details-marker]:hidden">
          <UserPlus className="size-4" aria-hidden /> Criar login manualmente
        </summary>
        <form
          className="space-y-3 border-t border-neutral-200 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            startTransition(async () => {
              const data = new FormData();
              data.set("clientId", clientId);
              data.set("fullName", manual.fullName);
              data.set("label", manual.label);
              data.set("username", manual.username);
              data.set("password", manual.password);
              try {
                await createClientLoginAction(data);
                setCreated({ username: manual.username, password: manual.password });
                setManual({ fullName: "", label: "", username: "", password: generatePassword() });
              } catch (err) {
                setError(err instanceof Error ? err.message : "Não foi possível criar o login.");
              }
            });
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-neutral-600">
              Nome
              <input value={manual.fullName} onChange={(e) => setManual({ ...manual, fullName: e.target.value })} className={`${field} mt-1 font-normal`} />
            </label>
            <label className="text-xs font-medium text-neutral-600">
              Função (opcional)
              <input value={manual.label} onChange={(e) => setManual({ ...manual, label: e.target.value })} placeholder="Ex.: Gestor de tráfego" className={`${field} mt-1 font-normal`} />
            </label>
            <label className="text-xs font-medium text-neutral-600">
              Usuário
              <input value={manual.username} onChange={(e) => setManual({ ...manual, username: e.target.value })} required className={`${field} mt-1 font-normal`} />
            </label>
            <label className="text-xs font-medium text-neutral-600">
              Senha
              <div className="mt-1 flex gap-1">
                <input value={manual.password} onChange={(e) => setManual({ ...manual, password: e.target.value })} className={`${field} font-mono font-normal`} />
                <button type="button" onClick={() => setManual({ ...manual, password: generatePassword() })} aria-label="Gerar outra senha" className="grid size-11 shrink-0 place-items-center rounded-md border border-neutral-300 hover:bg-neutral-50">
                  <RefreshCw className="size-4" aria-hidden />
                </button>
              </div>
            </label>
          </div>
          {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
          <div className="flex flex-wrap items-center gap-2">
            <button disabled={pending} className={btnPrimary}>Criar login</button>
            {created ? (
              <CopyButton
                id="created"
                text={() => `Olá! Seu acesso ao portal da Tatú Estúdio Criativo (${clientName}):\n${portalUrl()}\nUsuário: ${created.username}\nSenha: ${created.password}`}
                state={clip}
              >
                Copiar dados de acesso
              </CopyButton>
            ) : null}
          </div>
        </form>
      </details>

      <section aria-labelledby="galeria" className="space-y-2">
        <h2 id="galeria" className="text-base font-semibold">Nome do Drive</h2>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={current}
            aria-label="Do ou da"
            onChange={(e) => {
              const next = e.target.value as "do" | "da";
              setCurrent(next);
              startTransition(() => setGalleryArticleAction(clientId, next));
            }}
            className="min-h-11 rounded-lg border border-neutral-300 bg-white px-3 text-sm"
          >
            <option value="do">Drive do…</option>
            <option value="da">Drive da…</option>
          </select>
          <p className="text-sm text-neutral-600">
            No portal: <strong>{driveTitle(clientName, current)}</strong>
          </p>
        </div>
      </section>
    </div>
  );
}
