import { createHmac, timingSafeEqual } from "node:crypto";

export const PUBLISH_SESSION_COOKIE = "forge_studio_publish_session";
const SESSION_PURPOSE = "forge-studio-publish-session-v2";
const SESSION_SECONDS = 8 * 60 * 60;

export function safeSecretEqual(expected: string, received: string) {
  if (!expected || !received) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function publishSessionToken(secret: string, expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS) {
  const payload = String(expiresAt);
  const signature = createHmac("sha256", secret).update(SESSION_PURPOSE + ":" + payload).digest("hex");
  return payload + "." + signature;
}

export function readCookie(header: string | null, name: string) {
  if (!header) return "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}

export function isPublishSessionAuthorized(request: Request, secret: string) {
  const token = readCookie(request.headers.get("cookie"), PUBLISH_SESSION_COOKIE);
  if (!secret || !token) return false;
  const [rawExpiry, signature] = token.split(".");
  const expiresAt = Number(rawExpiry);
  if (!Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000) || !signature) return false;
  const expected = publishSessionToken(secret, expiresAt);
  return safeSecretEqual(expected, token);
}

export function isPublishRequestAuthorized(request: Request, secret: string) {
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  return safeSecretEqual(secret, bearer) || isPublishSessionAuthorized(request, secret);
}

export function publishSessionCookie(secret: string, secure: boolean) {
  const token = publishSessionToken(secret);
  return PUBLISH_SESSION_COOKIE + "=" + encodeURIComponent(token) + "; Path=/; HttpOnly; SameSite=Strict; Max-Age=" + SESSION_SECONDS + "" + (secure ? "; Secure" : "");
}

export function clearPublishSessionCookie(secure: boolean) {
  return PUBLISH_SESSION_COOKIE + "=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0" + (secure ? "; Secure" : "");
}
