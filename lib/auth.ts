export const COOKIE_NAME = "admin_session";

const SESSION_VALUE = "ok";

function bufferToHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value)
  );
  return bufferToHex(signature);
}

export async function createSessionCookieValue(secret: string) {
  const signature = await sign(SESSION_VALUE, secret);
  return `${SESSION_VALUE}.${signature}`;
}

export async function isValidSession(
  cookieValue: string | undefined,
  secret: string
) {
  if (!cookieValue) return false;
  const [value, signature] = cookieValue.split(".");
  if (!value || !signature || value !== SESSION_VALUE) return false;
  const expected = await sign(value, secret);
  return expected === signature;
}
