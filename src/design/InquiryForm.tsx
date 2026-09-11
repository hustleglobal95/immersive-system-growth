"use client";
import { useState, type FormEvent } from "react";
export type InquiryResult = { ok: boolean; message: string };
export type InquiryInput = { name: string; email: string; message: string };
/** Caller owns delivery; only a confirmed response can display success. */
export function InquiryForm({ onSubmit }: { onSubmit: (input: InquiryInput) => Promise<InquiryResult> }) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<InquiryResult | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget, data = new FormData(form);
    const input = { name: String(data.get("name") ?? "").trim(), email: String(data.get("email") ?? "").trim(), message: String(data.get("message") ?? "").trim() };
    if (!input.name || input.message.length < 10) { setResult({ ok: false, message: "Enter your name and a message of at least 10 characters." }); return; }
    setPending(true); setResult(null);
    try { const response = await onSubmit(input); setResult(response); if (response.ok) form.reset(); }
    catch { setResult({ ok: false, message: "Your inquiry could not be sent. Please try again." }); }
    finally { setPending(false); }
  }
  return <form className="ds-form" onSubmit={submit} aria-label="Project inquiry" aria-busy={pending}>
    <p>All fields are required. Use at least 10 characters for the message.</p>
    <label>Your name<input name="name" autoComplete="name" required maxLength={120} /></label>
    <label>Email address<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
    <label>What would you like to create?<textarea name="message" required minLength={10} maxLength={3000} rows={5} /></label>
    <button className="ds-action" disabled={pending} type="submit">{pending ? "Sending…" : "Send inquiry"}</button>
    <p role="status" aria-live="polite">{result?.message}</p>
  </form>;
}
