import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Conta Google de cada usuário, usada só pro calendário do backlog.
 *
 * Separada de propósito da conta do Drive (google_oauth_tokens, linha
 * singleton): aquela é do estúdio e sustenta as galerias dos clientes, essa
 * é pessoal e descartável. Misturar as duas fazia desconectar uma derrubar a
 * outra.
 */

/** Só o calendário — o Drive tem seu próprio fluxo e seu próprio escopo. */
const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar";

/**
 * O callback do OAuth é compartilhado com o fluxo do Drive, e o `state` diz
 * qual dos dois está voltando. Assim não é preciso cadastrar uma segunda URL
 * de redirecionamento no Google Cloud Console.
 */
export const CALENDAR_OAUTH_STATE = "calendar";

function getEnv() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Google não configurado: defina GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_OAUTH_REDIRECT_URI no .env.local"
    );
  }
  return { clientId, clientSecret, redirectUri };
}

export function buildCalendarAuthUrl(): string {
  const { clientId, redirectUri } = getEnv();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: CALENDAR_SCOPE,
    access_type: "offline",
    // Sem isso o Google devolve consentimento em cache e não manda
    // refresh_token de volta — a conexão parece dar certo e morre na
    // primeira renovação.
    prompt: "consent",
    state: CALENDAR_OAUTH_STATE,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}

/**
 * Endereço da conta conectada, só pra mostrar na tela.
 *
 * Vem da própria API de Agenda (o id do calendário principal É o e-mail da
 * conta) em vez do endpoint de userinfo, que exigiria pedir escopo de perfil
 * e colocar mais uma permissão na tela de autorização. O objetivo era um
 * clique só.
 */
async function fetchAccountEmail(accessToken: string): Promise<string> {
  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!response.ok) return "";
  const data = await response.json();
  return (data.id as string) ?? "";
}

export interface UserCalendarAccount {
  userId: string;
  email: string;
  calendarId: string;
}

/**
 * A conta conectada é lida em toda visita à agenda e muda só quando alguém
 * conecta ou desconecta — uma ida ao banco por navegação era o item mais
 * caro do caminho. O cache curto vale por usuário e é limpo nos dois pontos
 * em que a conta muda.
 */
const ACCOUNT_TTL_MS = 60_000;
const accountCache = new Map<
  string,
  { value: UserCalendarAccount | null; expiresAt: number }
>();

export async function getUserCalendarAccount(
  userId: string
): Promise<UserCalendarAccount | null> {
  const cached = accountCache.get(userId);
  if (cached && Date.now() < cached.expiresAt) return cached.value;

  const account = await requestUserCalendarAccount(userId);
  accountCache.set(userId, {
    value: account,
    expiresAt: Date.now() + ACCOUNT_TTL_MS,
  });
  return account;
}

async function requestUserCalendarAccount(
  userId: string
): Promise<UserCalendarAccount | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_calendar_accounts")
    .select("user_id, email, calendar_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    userId: data.user_id as string,
    email: data.email as string,
    calendarId: data.calendar_id as string,
  };
}

/** Todo mundo que conectou — é a lista que o sync percorre. */
export async function listConnectedCalendarAccounts(): Promise<
  UserCalendarAccount[]
> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_calendar_accounts")
    .select("user_id, email, calendar_id");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    userId: row.user_id as string,
    email: row.email as string,
    calendarId: row.calendar_id as string,
  }));
}

export async function connectUserCalendar(userId: string, code: string) {
  const { clientId, clientSecret, redirectUri } = getEnv();

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!response.ok) {
    throw new Error(
      `Falha ao trocar código OAuth por tokens: ${await response.text()}`
    );
  }

  const tokens: GoogleTokenResponse = await response.json();
  if (!tokens.refresh_token) {
    throw new Error(
      "Google não retornou refresh_token — revogue o acesso do app em myaccount.google.com/permissions e conecte de novo."
    );
  }

  const email = await fetchAccountEmail(tokens.access_token);
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("user_calendar_accounts").upsert({
    user_id: userId,
    refresh_token: tokens.refresh_token,
    email,
    calendar_id: "primary",
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
  clearCachedAccessToken(userId);
}

export async function disconnectUserCalendar(userId: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase
    .from("user_calendar_accounts")
    .delete()
    .eq("user_id", userId);
  if (error) throw error;
  clearCachedAccessToken(userId);
}

// Mesmo esquema do Drive: o access token vale cerca de uma hora e uma
// sincronização dispara várias chamadas seguidas, então guarda em memória e
// deixa as simultâneas dividirem um único refresh. A chave é o usuário, já
// que agora são vários tokens em jogo.
const cachedTokens = new Map<string, { token: string; expiresAt: number }>();
const inFlight = new Map<string, Promise<string>>();
const TOKEN_EXPIRY_MARGIN_MS = 60_000;

function clearCachedAccessToken(userId: string) {
  cachedTokens.delete(userId);
  inFlight.delete(userId);
  accountCache.delete(userId);
}

async function requestAccessToken(userId: string): Promise<string> {
  const { clientId, clientSecret } = getEnv();
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_calendar_accounts")
    .select("refresh_token")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Agenda não conectada para este usuário.");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: data.refresh_token as string,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) {
    throw new Error(
      `Falha ao renovar acesso ao Google Agenda: ${await response.text()}`
    );
  }

  const tokens: GoogleTokenResponse = await response.json();
  cachedTokens.set(userId, {
    token: tokens.access_token,
    expiresAt: Date.now() + tokens.expires_in * 1000 - TOKEN_EXPIRY_MARGIN_MS,
  });
  return tokens.access_token;
}

export async function getUserAccessToken(userId: string): Promise<string> {
  const cached = cachedTokens.get(userId);
  if (cached && Date.now() < cached.expiresAt) return cached.token;

  const pending = inFlight.get(userId);
  if (pending) return pending;

  const request = requestAccessToken(userId).finally(() => {
    inFlight.delete(userId);
  });
  inFlight.set(userId, request);
  return request;
}
