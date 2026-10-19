// Signed session tokens (HMAC-SHA256) built on Web Crypto so they work in both the
// Node server actions and the Edge middleware. Token format: base64url(payload).base64url(signature)

export type SessionData = {
  id: string;
  username: string;
  displayName: string;
  role: string;
  merchantId: string;
};

type SessionPayload = SessionData & { exp: number };

export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days, in seconds

const DEV_SECRET = "meestock-dev-only-secret-do-not-use-in-production";
const MIN_SECRET_LENGTH = 32;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= MIN_SECRET_LENGTH) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error(`SESSION_SECRET must be set to at least ${MIN_SECRET_LENGTH} characters in production`);
  }
  return DEV_SECRET;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function importKey(usage: "sign" | "verify"): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", encoder.encode(getSecret()), { name: "HMAC", hash: "SHA-256" }, false, [usage]);
}

export async function signSession(user: SessionData): Promise<string> {
  const payload: SessionPayload = { ...user, exp: Date.now() + SESSION_MAX_AGE * 1000 };
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", await importKey("sign"), encoder.encode(body));
  return `${body}.${toBase64Url(new Uint8Array(signature))}`;
}

/** Returns the session when the signature is valid and the token has not expired, otherwise null */
export async function verifySession(token: string | undefined | null): Promise<SessionData | null> {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, signature] = parts;

  try {
    // crypto.subtle.verify compares in constant time
    const valid = await crypto.subtle.verify("HMAC", await importKey("verify"), fromBase64Url(signature), encoder.encode(body));
    if (!valid) return null;
    const payload = JSON.parse(decoder.decode(fromBase64Url(body))) as SessionPayload;
    if (!payload.exp || Date.now() > payload.exp) return null;
    const { exp, ...user } = payload;
    void exp;
    return user;
  } catch {
    return null;
  }
}
