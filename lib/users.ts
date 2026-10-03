import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type UserRole = "admin" | "member" | "client";

export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  role: UserRole;
  /** Seções do menu liberadas. `null` = todas (sem restrição). */
  allowed_sections: string[] | null;
  /** Clientes liberados em Clientes/Galerias. `null` = todos. */
  allowed_client_ids: string[] | null;
  /** Só para role "client": o cliente a que este acesso pertence. */
  client_id: string | null;
  /** Nome da pessoa (logins de cliente) e função, ex.: "Gestor de tráfego". */
  full_name: string;
  portal_label: string;
  created_at: string;
}

export type PublicUser = Omit<User, "password_hash">;

const PBKDF2_ITERATIONS = 100_000;

function bufferToHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBuffer(hex: string) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

async function deriveKey(password: string, salt: Uint8Array, iterations: number) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return bufferToHex(bits);
}

/**
 * Gera o hash de uma senha no formato `iterations:saltHex:hashHex`, usando
 * PBKDF2 (Web Crypto nativo, sem dependência externa).
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await deriveKey(password, salt, PBKDF2_ITERATIONS);
  return `${PBKDF2_ITERATIONS}:${bufferToHex(salt.buffer as ArrayBuffer)}:${hash}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const [iterationsRaw, saltHex, hashHex] = storedHash.split(":");
  const iterations = Number(iterationsRaw);
  if (!iterations || !saltHex || !hashHex) return false;

  const salt = hexToBuffer(saltHex);
  const computed = await deriveKey(password, salt, iterations);
  return computed === hashHex;
}

function toPublicUser(user: User): PublicUser {
  const { password_hash: _password_hash, ...rest } = user;
  return rest;
}

export async function listUsers(): Promise<PublicUser[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .neq("role", "client")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(toPublicUser);
}

/**
 * O nome de quem está logado aparece no cabeçalho de toda tela do admin, e
 * a consulta ficava no caminho crítico de cada navegação — 200ms de ida ao
 * banco por página, para um dado que muda quase nunca. O cache curto vale
 * por processo e é limpo quando o usuário é alterado ou removido.
 */
const USER_TTL_MS = 60_000;
const userCache = new Map<
  string,
  { value: PublicUser | null; expiresAt: number }
>();

function forgetUser(id: string) {
  userCache.delete(id);
}

export async function getUserById(id: string): Promise<PublicUser | null> {
  const cached = userCache.get(id);
  if (cached && Date.now() < cached.expiresAt) return cached.value;

  const user = await requestUserById(id);
  userCache.set(id, { value: user, expiresAt: Date.now() + USER_TTL_MS });
  return user;
}

async function requestUserById(id: string): Promise<PublicUser | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? toPublicUser(data) : null;
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("username", username.trim().toLowerCase())
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createUser(fields: {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  clientId?: string;
  fullName?: string;
  portalLabel?: string;
}): Promise<PublicUser> {
  const supabase = getSupabaseServerClient();
  const password_hash = await hashPassword(fields.password);
  const { data, error } = await supabase
    .from("users")
    .insert({
      username: fields.username.trim().toLowerCase(),
      email: fields.email.trim(),
      password_hash,
      role: fields.role,
      client_id: fields.clientId ?? null,
      full_name: fields.fullName?.trim() ?? "",
      portal_label: fields.portalLabel?.trim() ?? "",
    })
    .select("*")
    .single();

  if (error) throw error;
  return toPublicUser(data);
}

export async function updateUser(
  id: string,
  fields: {
    username: string;
    email: string;
    role: UserRole;
    password?: string;
    allowedSections?: string[] | null;
    allowedClientIds?: string[] | null;
  }
): Promise<PublicUser> {
  const supabase = getSupabaseServerClient();
  const update: Record<string, unknown> = {
    username: fields.username.trim().toLowerCase(),
    email: fields.email.trim(),
    role: fields.role,
  };
  if (fields.password) {
    update.password_hash = await hashPassword(fields.password);
  }
  if (fields.allowedSections !== undefined) {
    update.allowed_sections = fields.allowedSections;
  }
  if (fields.allowedClientIds !== undefined) {
    update.allowed_client_ids = fields.allowedClientIds;
  }

  const { data, error } = await supabase
    .from("users")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  forgetUser(id);
  return toPublicUser(data);
}

export async function deleteUser(id: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("users").delete().eq("id", id);
  if (error) throw error;
  forgetUser(id);
}

/** Os logins do portal de um cliente, do mais antigo ao mais novo. */
export async function listClientUsers(clientId: string): Promise<PublicUser[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("role", "client")
    .eq("client_id", clientId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map(toPublicUser);
}

/** Todos os logins de cliente, pra visão geral (agrupa por `client_id`). */
export async function listAllClientUsers(): Promise<PublicUser[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("role", "client")
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map(toPublicUser);
}

/** clientId → quantos logins ele tem. */
export async function countClientLogins(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const user of await listAllClientUsers()) {
    if (user.client_id) counts[user.client_id] = (counts[user.client_id] ?? 0) + 1;
  }
  return counts;
}

/** Edita ou remove só logins de cliente, e só do cliente informado. */
export async function updateClientUser(
  id: string,
  clientId: string,
  fields: { fullName?: string; portalLabel?: string; password?: string }
) {
  const supabase = getSupabaseServerClient();
  const patch: Record<string, string> = {};
  if (fields.fullName !== undefined) patch.full_name = fields.fullName.trim();
  if (fields.portalLabel !== undefined) patch.portal_label = fields.portalLabel.trim();
  if (fields.password) patch.password_hash = await hashPassword(fields.password);
  if (!Object.keys(patch).length) return;

  const { error } = await supabase
    .from("users")
    .update(patch)
    .eq("id", id)
    .eq("role", "client")
    .eq("client_id", clientId);
  if (error) throw error;
  forgetUser(id);
}

export async function deleteClientUser(id: string, clientId: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("users")
    .delete()
    .eq("id", id)
    .eq("role", "client")
    .eq("client_id", clientId);
  if (error) throw error;
  forgetUser(id);
}
