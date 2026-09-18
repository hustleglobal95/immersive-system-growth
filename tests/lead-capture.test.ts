import test from "node:test";
import assert from "node:assert/strict";
import {
  MIN_FILL_MS,
  deliverLead,
  leadSchema,
  looksAutomated,
  resetRateLimits,
  signBrochureToken,
  verifyBrochureToken,
  withinRateLimit,
} from "../src/platform/leadCapture";
import { conversionSchema } from "../src/lib/configSchema";
import experience from "../config/experience.json" with { type: "json" };

const enquiry = { name: "Marta Roca", email: "marta@example.com", message: "We have a plot above Aiguablava.", consent: true as const, intent: "enquiry" as const, source: "enquire", honeypot: "", elapsedMs: 9000 };
const brochure = { name: "Jordi Vidal", email: "jordi@example.com", consent: true as const, intent: "brochure" as const, brochureId: "casa-lumen-brochure", source: "enquire", honeypot: "", elapsedMs: 9000 };

test("a lead requires consent, a real intent and nothing else", () => {
  assert(leadSchema.safeParse(enquiry).success);
  assert(leadSchema.safeParse(brochure).success);
  // Consent is never inferred: absent or false is a validation failure, not a silent opt-in.
  assert(!leadSchema.safeParse({ ...enquiry, consent: false }).success);
  assert(!leadSchema.safeParse({ ...enquiry, consent: undefined }).success);
  // Strict, so an attacker cannot smuggle a field the CRM might act on.
  assert(!leadSchema.safeParse({ ...enquiry, isAdmin: true }).success);
  assert(!leadSchema.safeParse({ ...enquiry, message: "too short" }).success);
  assert(!leadSchema.safeParse({ ...brochure, brochureId: undefined }).success);
  assert(!leadSchema.safeParse({ ...enquiry, email: "not-an-email" }).success);
  assert(!leadSchema.safeParse({ ...enquiry, phone: "DROP TABLE" }).success);
  assert(!leadSchema.safeParse({ ...enquiry, elapsedMs: -1 }).success);
});

test("a filled trap parses so a prober cannot tell which gate caught it", () => {
  // It must validate, because rejecting it would answer differently than a real submission.
  const parsed = leadSchema.safeParse({ ...enquiry, honeypot: "http://spam" });
  assert(parsed.success);
  if (parsed.success) assert(looksAutomated(parsed.data));
  assert(looksAutomated({ ...enquiry, elapsedMs: MIN_FILL_MS - 1 }));
  assert(!looksAutomated(enquiry));
});

test("delivery strips the spam fields and refuses a webhook that is not HTTPS", async () => {
  let sent: unknown = null;
  const fetchImpl = (async (_url: string | URL | Request, init?: RequestInit) => {
    sent = JSON.parse(String(init?.body));
    return new Response(null, { status: 200 });
  }) as unknown as typeof fetch;
  const delivered = await deliverLead(enquiry, { webhookUrl: "https://crm.example.com/hook", fetchImpl });
  assert.equal(typeof delivered.id, "string");
  const body = sent as Record<string, unknown>;
  // The CRM gets the lead and an id, never the anti-spam instrumentation.
  assert.equal(body.name, "Marta Roca");
  assert.equal(body.honeypot, undefined);
  assert.equal(body.elapsedMs, undefined);
  await assert.rejects(() => deliverLead(enquiry, { webhookUrl: "http://crm.example.com/hook", fetchImpl }), /HTTPS/);
  await assert.rejects(
    () => deliverLead(enquiry, { webhookUrl: "https://crm.example.com/hook", fetchImpl: (async () => new Response(null, { status: 500 })) as unknown as typeof fetch }),
    /rejected/,
  );
});

test("a brochure grant is signed, expiring and not editable", () => {
  const secret = "a-test-secret";
  const token = signBrochureToken("casa-lumen-brochure", secret);
  assert.deepEqual(verifyBrochureToken(token, secret), { brochureId: "casa-lumen-brochure" });
  // Wrong secret, tampered signature, tampered claim and an expired grant all fail.
  assert.equal(verifyBrochureToken(token, "another-secret"), null);
  assert.equal(verifyBrochureToken(token.slice(0, -1) + "X", secret), null);
  const forged = Buffer.from(JSON.stringify({ b: "private-brochure", e: Date.now() + 60_000 })).toString("base64url");
  assert.equal(verifyBrochureToken(`${forged}.${token.split(".")[1]}`, secret), null);
  assert.equal(verifyBrochureToken(signBrochureToken("x", secret, 1_000, Date.now() - 5_000), secret), null);
  // Fails closed: with no secret configured nothing signs and nothing verifies.
  assert.throws(() => signBrochureToken("x", ""), /FORGE_LEAD_TOKEN_SECRET/);
  assert.equal(verifyBrochureToken(token, ""), null);
  assert.equal(verifyBrochureToken("../../package.json", secret), null);
});

test("submissions from one client are rate limited", () => {
  resetRateLimits();
  const results = Array.from({ length: 7 }, () => withinRateLimit("198.51.100.4", 5, 600_000));
  assert.deepEqual(results, [true, true, true, true, true, false, false]);
  // A different client is unaffected, and the window expires.
  assert(withinRateLimit("198.51.100.5", 5, 600_000));
  assert(withinRateLimit("198.51.100.4", 5, 600_000, Date.now() + 600_001));
  resetRateLimits();
});

test("the checked-in conversion section validates and its brochure name cannot traverse", () => {
  const parsed = conversionSchema.safeParse(experience.conversion);
  assert(parsed.success);
  if (parsed.success) assert.equal(parsed.data.brochure?.file, "casa-lumen.pdf");
  const base = experience.conversion;
  for (const file of ["../../package.json", "/etc/passwd", "a/b.pdf", "note.txt", "UPPER.pdf"])
    assert(!conversionSchema.safeParse({ ...base, brochure: { ...base.brochure, file } }).success, file);
  // A brochure intent without a brochure is rejected rather than rendering a dead button.
  assert(!conversionSchema.safeParse({ ...base, intent: "brochure", brochure: undefined }).success);
});
