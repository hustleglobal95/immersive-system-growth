"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import type { ConversionSection } from "@/src/types/experience";

const subscribeToHydration = () => () => {};

type Outcome = { ok: boolean; message: string; download?: { href: string; label: string } };

/**
 * The conversion section's form: an enquiry, a gated brochure, or a choice of both.
 *
 * It sits in ordinary accessible DOM after the scroll, outside every pinned chapter, so nothing
 * in the cinematic can animate it away mid-entry. Spam is held off without a puzzle for the
 * visitor: a field only a bot fills, and how long the form was actually on screen. Consent is a
 * required, unticked checkbox whose wording comes from the config rather than from this file.
 */
export function LeadCapture({ section }: { section: ConversionSection }) {
  // Blocks native GET submission before a client handler exists, so entered details can never
  // be appended to the URL.
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [intent, setIntent] = useState<"enquiry" | "brochure">(
    section.intent === "brochure" ? "brochure" : "enquiry",
  );
  const mounted = useRef(0);
  useEffect(() => {
    mounted.current = Date.now();
  }, []);

  const choice = section.intent === "both";
  const wantsBrochure = intent === "brochure";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: String(data.get("name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      phone: String(data.get("phone") ?? "").trim() || undefined,
      message: String(data.get("message") ?? "").trim() || undefined,
      consent: data.get("consent") === "on",
      intent,
      brochureId: wantsBrochure ? section.brochure?.id : undefined,
      source: section.id,
      honeypot: String(data.get("company_website") ?? ""),
      elapsedMs: mounted.current ? Date.now() - mounted.current : 0,
    };
    if (!payload.consent) {
      setOutcome({ ok: false, message: "Please confirm you are happy for us to reply." });
      return;
    }
    if (!wantsBrochure && (payload.message ?? "").length < 10) {
      setOutcome({ ok: false, message: "Please tell us a little about the project, in at least ten characters." });
      return;
    }
    setPending(true);
    setOutcome(null);
    try {
      const response = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as Outcome;
      setOutcome(body);
      if (body.ok) form.reset();
    } catch {
      setOutcome({ ok: false, message: "Your enquiry could not be sent. Please try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="lead" id={section.id} aria-labelledby={`${section.id}-title`}>
      <div className="lead__lead">
        <p className="lead__eyebrow">{section.eyebrow}</p>
        <h2 className="lead__title" id={`${section.id}-title`}>{section.title}</h2>
        <p className="lead__body">{section.body}</p>
        {section.note && <p className="lead__note">{section.note}</p>}
      </div>

      <form className="lead__form" onSubmit={submit} aria-busy={pending}>
        {choice && (
          <fieldset className="lead__intent">
            <legend>What would you like?</legend>
            <label>
              <input type="radio" name="intent" value="enquiry" checked={intent === "enquiry"}
                onChange={() => setIntent("enquiry")} />
              Speak to the studio
            </label>
            <label>
              <input type="radio" name="intent" value="brochure" checked={intent === "brochure"}
                onChange={() => setIntent("brochure")} />
              Download the brochure
            </label>
          </fieldset>
        )}

        <label className="lead__field">
          <span>Your name</span>
          <input name="name" autoComplete="name" required maxLength={120} />
        </label>
        <label className="lead__field">
          <span>Email address</span>
          <input name="email" type="email" autoComplete="email" required maxLength={254} />
        </label>
        <label className="lead__field">
          <span>Telephone <i>optional</i></span>
          <input name="phone" type="tel" autoComplete="tel" maxLength={40} />
        </label>
        {!wantsBrochure && (
          <label className="lead__field lead__field--wide">
            <span>What are you looking to build?</span>
            <textarea name="message" required minLength={10} maxLength={3000} rows={4} />
          </label>
        )}

        {/* A field no person sees and no keyboard reaches. Anything in it is automated. */}
        <div className="lead__trap" aria-hidden="true">
          <label>
            Company website
            <input name="company_website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>

        <label className="lead__consent">
          <input type="checkbox" name="consent" required />
          <span>{section.consent}</span>
        </label>

        <button className="forge-button" type="submit" disabled={!hydrated || pending}>
          {pending ? "Sending…" : wantsBrochure ? `Get the ${section.brochure?.label ?? "brochure"}` : section.submit}
        </button>

        <noscript>
          <p>This form needs JavaScript to send. You can also email the studio directly.</p>
        </noscript>

        <p className="lead__status" role="status" aria-live="polite" data-state={outcome ? (outcome.ok ? "ok" : "error") : undefined}>
          {outcome?.message}
        </p>
        {outcome?.download && (
          <p className="lead__download">
            <a href={outcome.download.href} download>
              {outcome.download.label}
              {section.brochure?.size ? ` (PDF, ${section.brochure.size})` : " (PDF)"}
            </a>
          </p>
        )}
      </form>
    </section>
  );
}
