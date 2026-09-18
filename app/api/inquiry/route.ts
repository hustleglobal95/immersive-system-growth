import { experience } from "@/src/lib/experience";
import {
  deliverLead,
  leadSchema,
  looksAutomated,
  signBrochureToken,
  withinRateLimit,
} from "@/src/platform/leadCapture";

export const runtime = "nodejs";

/**
 * Receives an enquiry from the conversion section.
 *
 * The CRM webhook and the token secret are read here and never reach a client component, and the
 * response carries nothing back but a confirmation and, for a brochure request, a signed grant.
 */
export async function POST(request: Request) {
  const size = Number(request.headers.get("content-length") ?? 0);
  if (!Number.isFinite(size) || size > 8_000)
    return Response.json({ ok: false, message: "That submission is too large to accept." }, { status: 413 });

  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return Response.json({ ok: false, message: "Cross-origin submissions are blocked." }, { status: 403 });

  let lead;
  try {
    lead = leadSchema.parse(await request.json());
  } catch {
    return Response.json({ ok: false, message: "Please check the form and try again." }, { status: 400 });
  }

  // A bot gets the same answer a person does, so probing cannot distinguish the two.
  if (looksAutomated(lead)) return Response.json({ ok: true, message: confirmation(lead.intent) }, { status: 202 });

  const client = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!withinRateLimit(client))
    return Response.json({ ok: false, message: "Too many submissions. Please try again later." }, { status: 429 });

  // A brochure request must name a brochure this deployment actually publishes.
  const brochure = experience.conversion?.brochure;
  if (lead.intent === "brochure" && (!brochure || brochure.id !== lead.brochureId))
    return Response.json({ ok: false, message: "That brochure is not available." }, { status: 404 });

  try {
    await deliverLead(lead, { webhookUrl: process.env.FORGE_LEAD_WEBHOOK_URL });
  } catch {
    return Response.json({ ok: false, message: "We could not record your enquiry. Please try again." }, { status: 502 });
  }

  if (lead.intent === "brochure" && brochure) {
    const secret = process.env.FORGE_LEAD_TOKEN_SECRET ?? "";
    // The lead is already recorded, so a missing secret is reported as a download problem rather
    // than a failed submission. It fails closed: no secret, no grant.
    if (!secret)
      return Response.json(
        { ok: true, message: "Thank you. We will email the brochure to you shortly." },
        { status: 202 },
      );
    return Response.json(
      {
        ok: true,
        message: confirmation(lead.intent),
        download: { href: `/api/brochure?t=${encodeURIComponent(signBrochureToken(brochure.id, secret))}`, label: brochure.label },
      },
      { status: 202 },
    );
  }

  return Response.json({ ok: true, message: confirmation(lead.intent) }, { status: 202 });
}

function confirmation(intent: "enquiry" | "brochure") {
  return intent === "brochure"
    ? "Thank you. Your brochure is ready below."
    : "Thank you. We will be in touch within two working days.";
}
