import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";

// Instagram Login (graph.instagram.com): não exige Página do Facebook.
const GRAPH = "https://graph.instagram.com/v26.0";
const SCOPES = "instagram_business_basic,instagram_business_content_publish";
const DAY_MS = 86_400_000;

function appConfig() {
  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  const redirectUri = process.env.INSTAGRAM_OAUTH_REDIRECT_URI;
  if (!appId || !appSecret || !redirectUri) {
    throw new Error(
      "Faltam INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET ou INSTAGRAM_OAUTH_REDIRECT_URI no ambiente."
    );
  }
  return { appId, appSecret, redirectUri };
}

/** O `state` carrega o cliente que está conectando. */
export const INSTAGRAM_STATE_PREFIX = "ig:";

/** Sufixo do `state` que manda o callback de volta pro cadastro do cliente. */
export const INSTAGRAM_STATE_CADASTRO = ":cadastro";

export function buildInstagramAuthUrl(clientId: string, voltarAoCadastro = false): string {
  const { appId, redirectUri } = appConfig();
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    state:
      INSTAGRAM_STATE_PREFIX + clientId + (voltarAoCadastro ? INSTAGRAM_STATE_CADASTRO : ""),
  });
  return `https://www.instagram.com/oauth/authorize?${params}`;
}

async function igJson<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => ({}))) as T & {
    error?: { message?: string };
    error_message?: string;
  };
  if (!res.ok || body.error) {
    throw new Error(
      body.error?.message ?? body.error_message ?? `Instagram respondeu ${res.status}`
    );
  }
  return body;
}

export async function connectInstagramAccount(clientId: string, code: string) {
  const { appId, appSecret, redirectUri } = appConfig();

  const short = await igJson<{ access_token: string }>(
    await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      body: new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code,
      }),
    })
  );
  const long = await igJson<{ access_token: string; expires_in: number }>(
    await fetch(
      `https://graph.instagram.com/access_token?${new URLSearchParams({
        grant_type: "ig_exchange_token",
        client_secret: appSecret,
        access_token: short.access_token,
      })}`
    )
  );
  const me = await igJson<{ user_id: string; username: string }>(
    await fetch(
      `${GRAPH}/me?${new URLSearchParams({
        fields: "user_id,username",
        access_token: long.access_token,
      })}`
    )
  );

  const { error } = await getSupabaseServerClient()
    .from("instagram_accounts")
    .upsert({
      client_id: clientId,
      ig_user_id: me.user_id,
      username: me.username,
      access_token: long.access_token,
      expires_at: new Date(Date.now() + long.expires_in * 1000).toISOString(),
    });
  if (error) throw new Error(`Falha ao salvar conta: ${error.message}`);
}

/**
 * Só apaga o vínculo aqui. O token não é revogado no Instagram (a API de
 * Instagram Login não tem endpoint pra isso); ele expira sozinho em 60 dias.
 * Posts agendados desse cliente falham com "Cliente sem Instagram conectado".
 */
export async function disconnectInstagramAccount(clientId: string) {
  const { error } = await getSupabaseServerClient()
    .from("instagram_accounts")
    .delete()
    .eq("client_id", clientId);
  if (error) throw new Error(`Falha ao desconectar conta: ${error.message}`);
}

/** @ conectado de cada cliente, por id. */
export async function listInstagramUsernames(): Promise<Record<string, string>> {
  const { data } = await getSupabaseServerClient()
    .from("instagram_accounts")
    .select("client_id, username");
  return Object.fromEntries(
    (data ?? []).map((row) => [row.client_id as string, row.username as string])
  );
}

/** Renova tokens que vencem em até 10 dias. Devolve quantas contas falharam. */
export async function refreshExpiringTokens(): Promise<number> {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("instagram_accounts")
    .select("client_id, access_token")
    .lt("expires_at", new Date(Date.now() + 10 * DAY_MS).toISOString());

  let failed = 0;
  for (const account of data ?? []) {
    try {
      const fresh = await igJson<{ access_token: string; expires_in: number }>(
        await fetch(
          `https://graph.instagram.com/refresh_access_token?${new URLSearchParams({
            grant_type: "ig_refresh_token",
            access_token: account.access_token as string,
          })}`
        )
      );
      await supabase
        .from("instagram_accounts")
        .update({
          access_token: fresh.access_token,
          expires_at: new Date(Date.now() + fresh.expires_in * 1000).toISOString(),
        })
        .eq("client_id", account.client_id);
    } catch (err) {
      failed += 1;
      console.error("Falha ao renovar token do Instagram", account.client_id, err);
    }
  }
  return failed;
}

// ---- Publicação ----

const VIDEO_EXT = /\.(mp4|mov)(\?|$)/i;

export interface PublishInput {
  format: string;
  urls: string[];
  caption: string;
}

type ContainerParams = Record<string, string>;

/** Traduz formato + mídia nos parâmetros do container. Pura, testável. */
export function buildContainerParams(input: PublishInput): {
  children?: ContainerParams[];
  main: ContainerParams;
} {
  const { format, urls, caption } = input;
  if (urls.length === 0) throw new Error("Card sem mídia pública pra publicar.");
  const isVideo = (u: string) => VIDEO_EXT.test(u);

  // Card com mais de uma arte sai como carrossel; com uma, como foto.
  if (format === "carrossel" || (format === "card" && urls.length > 1)) {
    if (urls.length < 2 || urls.length > 20) {
      throw new Error("Carrossel precisa de 2 a 20 mídias.");
    }
    return {
      children: urls.map((u) => ({
        is_carousel_item: "true",
        ...(isVideo(u) ? { media_type: "VIDEO", video_url: u } : { image_url: u }),
      })),
      main: { media_type: "CAROUSEL", caption },
    };
  }
  const url = urls[0];
  if (format === "reel") {
    return { main: { media_type: "REELS", video_url: url, caption } };
  }
  if (format === "story") {
    return {
      main: {
        media_type: "STORIES",
        ...(isVideo(url) ? { video_url: url } : { image_url: url }),
      },
    };
  }
  return { main: { image_url: url, caption } };
}

async function createContainer(
  igUserId: string,
  token: string,
  params: ContainerParams
): Promise<string> {
  const { id } = await igJson<{ id: string }>(
    await fetch(`${GRAPH}/${igUserId}/media`, {
      method: "POST",
      body: new URLSearchParams({ ...params, access_token: token }),
    })
  );
  return id;
}

/** Passo 1: cria o container (e os filhos do carrossel). Devolve o id. */
export async function startPublish(
  account: { ig_user_id: string; access_token: string },
  input: PublishInput
): Promise<string> {
  const plan = buildContainerParams(input);
  const { ig_user_id: igId, access_token: token } = account;
  if (!plan.children) return createContainer(igId, token, plan.main);

  const childIds: string[] = [];
  for (const child of plan.children) {
    childIds.push(await createContainer(igId, token, child));
  }
  return createContainer(igId, token, { ...plan.main, children: childIds.join(",") });
}

export type ContainerState = "pronto" | "processando" | "erro";

export async function containerState(
  containerId: string,
  token: string
): Promise<ContainerState> {
  const { status_code } = await igJson<{ status_code: string }>(
    await fetch(
      `${GRAPH}/${containerId}?${new URLSearchParams({
        fields: "status_code",
        access_token: token,
      })}`
    )
  );
  if (status_code === "FINISHED") return "pronto";
  if (status_code === "IN_PROGRESS") return "processando";
  return "erro"; // ERROR, EXPIRED
}

/** Passo 2: publica o container já processado. Devolve o id da mídia. */
export async function finishPublish(
  account: { ig_user_id: string; access_token: string },
  containerId: string
): Promise<string> {
  const { id } = await igJson<{ id: string }>(
    await fetch(`${GRAPH}/${account.ig_user_id}/media_publish`, {
      method: "POST",
      body: new URLSearchParams({
        creation_id: containerId,
        access_token: account.access_token,
      }),
    })
  );
  return id;
}
