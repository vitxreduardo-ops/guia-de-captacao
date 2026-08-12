import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type UserRole = "admin" | "member";

export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  role: UserRole;
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
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map(toPublicUser);
}

export async function getUserById(id: string): Promise<PublicUser | null> {
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
    })
    .select("*")
    .single();

  if (error) throw error;
  return toPublicUser(data);
}

export async function updateUser(
  id: string,
  fields: { username: string; email: string; role: UserRole; password?: string }
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

  const { data, error } = await supabase
    .from("users")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return toPublicUser(data);
}

export async function deleteUser(id: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("users").delete().eq("id", id);
  if (error) throw error;
}
