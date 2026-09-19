import { z } from "zod";

export const STUDIO_SESSION_COOKIE = "forge_internal_session";
export const studioRoles = ["reviewer", "designer", "director", "developer", "owner"] as const;
export type StudioRole = (typeof studioRoles)[number];
export interface StudioIdentity { id: string; name: string; role: StudioRole; }

type StudioAccessEnvironment=Partial<Record<"FORGE_INTERNAL_ACCESS_ENABLED"|"FORGE_INTERNAL_USERS_JSON"|"FORGE_INTERNAL_SESSION_SECRET",string>>;

const userSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9._-]{1,63}$/),
  name: z.string().min(1).max(100),
  role: z.enum(studioRoles),
  secretHash: z.string().regex(/^pbkdf2\$\d+\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$/),
}).strict();

const roleRank: Record<StudioRole, number> = { reviewer: 0, designer: 1, director: 2, developer: 3, owner: 4 };
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const SESSION_SECONDS = 12 * 60 * 60;

export class StudioAccessError extends Error {
  constructor(message: string, public status: 401 | 403 | 503) { super(message); }
}

export function studioAccessEnabled(environment: StudioAccessEnvironment = process.env) {
  return environment.FORGE_INTERNAL_ACCESS_ENABLED === "true";
}

export function parseStudioUsers(environment: StudioAccessEnvironment = process.env) {
  const raw = environment.FORGE_INTERNAL_USERS_JSON ?? "[]";
  const parsed = z.array(userSchema).max(100).parse(JSON.parse(raw));
  if (new Set(parsed.map((user) => user.id)).size !== parsed.length) throw new Error("FORGE_INTERNAL_USERS_JSON contains duplicate user ids");
  return parsed;
}

export function hasStudioRole(identity: StudioIdentity, minimum: StudioRole) {
  return roleRank[identity.role] >= roleRank[minimum];
}

export async function verifyStudioUserSecret(user: z.infer<typeof userSchema>, secret: string) {
  const [kind, rawIterations, saltValue, hashValue] = user.secretHash.split("$");
  if (kind !== "pbkdf2") return false;
  const iterations = Number(rawIterations);
  if (!Number.isInteger(iterations) || iterations < 100_000 || iterations > 1_000_000) return false;
  const salt = fromBase64Url(saltValue);
  const expected = fromBase64Url(hashValue);
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), "PBKDF2", false, ["deriveBits"]);
  const actual = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, expected.byteLength * 8));
  return timingSafeBytes(expected, actual);
}

export async function createStudioSessionToken(identity: StudioIdentity, sessionSecret: string, expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS) {
  if (sessionSecret.length < 32) throw new StudioAccessError("FORGE_INTERNAL_SESSION_SECRET must be at least 32 characters", 503);
  const payload = toBase64Url(encoder.encode(JSON.stringify({ ...identity, exp: expiresAt })));
  const signature = await hmac(sessionSecret, payload);
  return payload + "." + toBase64Url(signature);
}

export async function verifyStudioSessionToken(token: string, sessionSecret: string): Promise<StudioIdentity | null> {
  if (!token || sessionSecret.length < 32) return null;
  const [payload, rawSignature] = token.split(".");
  if (!payload || !rawSignature) return null;
  const expected = await hmac(sessionSecret, payload);
  const actual = fromBase64Url(rawSignature);
  if (!timingSafeBytes(expected, actual)) return null;
  try {
    const value = JSON.parse(decoder.decode(fromBase64Url(payload))) as { id?: unknown; name?: unknown; role?: unknown; exp?: unknown };
    if (typeof value.exp !== "number" || value.exp <= Math.floor(Date.now() / 1000)) return null;
    if (typeof value.id !== "string" || typeof value.name !== "string" || !studioRoles.includes(value.role as StudioRole)) return null;
    return { id: value.id, name: value.name, role: value.role as StudioRole };
  } catch {
    return null;
  }
}

export async function studioIdentityFromRequest(request: Request, environment: StudioAccessEnvironment = process.env): Promise<StudioIdentity | null> {
  if (!studioAccessEnabled(environment)) return { id: "local-owner", name: "Local owner", role: "owner" };
  const token = readCookie(request.headers.get("cookie"), STUDIO_SESSION_COOKIE);
  return verifyStudioSessionToken(token, environment.FORGE_INTERNAL_SESSION_SECRET ?? "");
}

export async function requireStudioRole(request: Request, minimum: StudioRole, environment: StudioAccessEnvironment = process.env) {
  const identity = await studioIdentityFromRequest(request, environment);
  if (!identity) throw new StudioAccessError("Forge internal access is required", 401);
  if (!hasStudioRole(identity, minimum)) throw new StudioAccessError(`This action requires the ${minimum} role or higher`, 403);
  return identity;
}

export function studioSessionCookie(token: string, secure: boolean) {
  return `${STUDIO_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_SECONDS}${secure ? "; Secure" : ""}`;
}

export function clearStudioSessionCookie(secure: boolean) {
  return `${STUDIO_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? "; Secure" : ""}`;
}

export function studioAccessErrorResponse(error: unknown) {
  if (error instanceof StudioAccessError) return Response.json({ ok: false, error: error.message }, { status: error.status });
  return null;
}

function readCookie(header: string | null, name: string) {
  if (!header) return "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}

async function hmac(secret: string, value: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

function timingSafeBytes(left: Uint8Array, right: Uint8Array) {
  if (left.byteLength !== right.byteLength) return false;
  let different = 0;
  for (let index = 0; index < left.byteLength; index++) different |= left[index] ^ right[index];
  return different === 0;
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}
