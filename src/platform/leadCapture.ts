import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import { z } from "zod";

/**
 * Lead capture for the conversion section: validation, spam gating, delivery and the signed
 * token that releases a gated brochure.
 *
 * Everything here runs server-side. The webhook URL and the token secret are read from the
 * environment by the route, never by a client component, and no part of a lead's payload is
 * echoed back to the browser beyond a confirmation message.
 */

// A brochure's file name is pattern-constrained rather than sanitised, so a traversal segment
// cannot be expressed in the first place. The directory is fixed by the reader.
export const brochureFile = z.string().regex(/^[a-z0-9][a-z0-9-]{0,60}\.pdf$/, "Brochure file must be a lower-case PDF name");

export const leadSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email().max(254),
    phone: z.string().trim().max(40).regex(/^[0-9+()\s-]*$/, "Phone may only contain digits and separators").optional(),
    message: z.string().trim().max(3000).optional(),
    // Explicit, unticked-by-default consent. A missing or false value is a validation failure,
    // not a silent opt-in.
    consent: z.literal(true),
    intent: z.enum(["enquiry", "brochure"]),
    brochureId: z.string().trim().min(1).max(60).optional(),
    source: z.string().trim().min(1).max(120),
    // Two spam gates that need no third party and no puzzle for the visitor: a field only a bot
    // fills, and the time the form was actually on screen.
    // Accepted rather than rejected, so a filled trap produces the same reply a person gets and
    // a prober cannot learn which of the gates caught them. `looksAutomated` drops it.
    honeypot: z.string().max(200),
    elapsedMs: z.number().int().min(0).max(7_200_000),
  })
  .strict()
  .superRefine((lead, context) => {
    if (lead.intent === "enquiry" && (lead.message ?? "").length < 10)
      context.addIssue({ code: "custom", message: "An enquiry needs a message of at least ten characters", path: ["message"] });
    if (lead.intent === "brochure" && !lead.brochureId)
      context.addIssue({ code: "custom", message: "A brochure request must name a brochure", path: ["brochureId"] });
  });

export type Lead = z.infer<typeof leadSchema>;
export type DeliveredLead = Lead & { id: string; receivedAt: string };

export const MIN_FILL_MS = 2_500;

/**
 * Two signals, neither of which asks the visitor to solve anything: a field only a bot fills,
 * and a submission faster than a person can read the form.
 *
 * `elapsedMs` is reported by the client and can be forged, so this stops commodity form spam,
 * not a determined attacker. A deployment under real pressure should add a server-verified
 * challenge behind the same route.
 */
export function looksAutomated(lead: Lead) {
  return lead.honeypot.length > 0 || lead.elapsedMs < MIN_FILL_MS;
}

/**
 * Hands the lead to the configured CRM. With no webhook set it is logged instead, so a
 * deployment without CRM credentials still captures rather than silently dropping enquiries.
 */
export async function deliverLead(
  lead: Lead,
  options: { webhookUrl?: string; timeoutMs?: number; fetchImpl?: typeof fetch; now?: () => Date } = {},
): Promise<DeliveredLead> {
  const delivered: DeliveredLead = { ...lead, id: randomUUID(), receivedAt: (options.now?.() ?? new Date()).toISOString() };
  // Listed rather than spread, so the anti-spam instrumentation cannot reach the CRM by
  // accident and adding a field here is a deliberate act.
  const payload = {
    id: delivered.id,
    receivedAt: delivered.receivedAt,
    intent: delivered.intent,
    name: delivered.name,
    email: delivered.email,
    phone: delivered.phone,
    message: delivered.message,
    consent: delivered.consent,
    brochureId: delivered.brochureId,
    source: delivered.source,
  };
  const sink = options.webhookUrl?.trim();
  if (!sink) {
    console.info("FORGE_LEAD", JSON.stringify(payload));
    return delivered;
  }
  const url = new URL(sink);
  if (url.protocol !== "https:") throw new Error("Lead webhook must use HTTPS");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 3_000);
  try {
    const response = await (options.fetchImpl ?? fetch)(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
      redirect: "error",
    });
    if (!response.ok) throw new Error("Lead webhook rejected the submission");
  } finally {
    clearTimeout(timer);
  }
  return delivered;
}

const b64url = (input: Buffer) => input.toString("base64url");

/**
 * Signs a short-lived grant for one brochure. The token carries only an id and an expiry, so it
 * discloses nothing about the lead and cannot be edited into a different download.
 */
export function signBrochureToken(brochureId: string, secret: string, ttlMs = 15 * 60_000, now = Date.now()) {
  if (!secret) throw new Error("Brochure downloads require FORGE_LEAD_TOKEN_SECRET");
  const body = b64url(Buffer.from(JSON.stringify({ b: brochureId, e: now + ttlMs })));
  return `${body}.${b64url(createHmac("sha256", secret).update(body).digest())}`;
}

export function verifyBrochureToken(token: string, secret: string, now = Date.now()): { brochureId: string } | null {
  // Fails closed: with no secret configured nothing verifies, so a gated file stays gated.
  if (!secret || typeof token !== "string" || token.length > 600) return null;
  const cut = token.lastIndexOf(".");
  if (cut <= 0) return null;
  const body = token.slice(0, cut);
  const signature = token.slice(cut + 1);
  const received = Buffer.from(signature, "base64url");
  // Base64url has unused trailing bits for a 32-byte HMAC. Some decoders accept multiple
  // textual spellings for the same bytes, so require the canonical spelling before comparing.
  if (received.toString("base64url") !== signature) return null;
  const expected = createHmac("sha256", secret).update(body).digest();
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
  try {
    const claim = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as { b?: unknown; e?: unknown };
    if (typeof claim.b !== "string" || typeof claim.e !== "number" || claim.e <= now) return null;
    return { brochureId: claim.b };
  } catch {
    return null;
  }
}

const windows = new Map<string, { started: number; count: number }>();

/** A coarse per-client window. The key is hashed, so no raw address is held in memory. */
export function withinRateLimit(client: string, limit = 5, windowMs = 600_000, now = Date.now()) {
  const key = createHmac("sha256", "forge-lead-window").update(client).digest("base64url").slice(0, 22);
  const current = windows.get(key);
  if (!current || now - current.started > windowMs) {
    windows.set(key, { started: now, count: 1 });
    if (windows.size > 5_000) windows.clear();
    return true;
  }
  current.count += 1;
  return current.count <= limit;
}

export function resetRateLimits() {
  windows.clear();
}
