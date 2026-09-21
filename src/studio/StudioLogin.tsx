"use client";

import { useEffect, useState } from "react";

export function StudioLogin() {
  const [id, setId] = useState("");
  const [secret, setSecret] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [accessEnabled, setAccessEnabled] = useState(true);
  const [setupRequired,setSetupRequired]=useState(false);
  const [setupIssue,setSetupIssue]=useState("");

  useEffect(() => {
    void fetch("/api/studio/auth/session", { cache: "no-store" }).then((response) => response.json()).then((data: {
      accessEnabled?: boolean;
      identity?: unknown;
      auth?: { setupRequired?:boolean;issue?:string|null };
    }) => {
      setAccessEnabled(data.accessEnabled !== false);
      setSetupRequired(data.auth?.setupRequired === true);
      setSetupIssue(data.auth?.issue ?? "");
      if (data.identity) window.location.replace(safeNext());
    }).catch(() => {});
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setMessage("Signing in…");
    try {
      const response = await fetch("/api/studio/auth/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, secret }) });
      const data = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error ?? "Sign-in failed");
      window.location.assign(safeNext());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sign-in failed");
      setBusy(false);
    }
  };

  return <main className="studio-login">
    <form onSubmit={submit}>
      <span>FORGE / INTERNAL</span>
      <h1>Growth Terminal Studio</h1>
      <p>{!accessEnabled
        ? "Local development is running as Local owner. No password is required."
        : setupRequired
          ? "Forge authentication is enabled, but no usable owner login is configured yet."
          : "Sign in to the private production workspace."}</p>
      {!accessEnabled
        ? <a href="/studio">Open Studio</a>
        : setupRequired
          ? <section className="studio-login__setup" aria-label="Forge authentication setup required">
              <strong>NO PASSWORD EXISTS YET</strong>
              <p>{setupIssue || "Complete Forge Studio authentication setup before attempting to sign in."}</p>
              <p>For this Mac, start Forge with <code>npm run studio:local</code> and open <code>/studio</code>. Shared or production access requires an explicitly configured owner account.</p>
            </section>
          : <>
              <label>User<input autoFocus autoComplete="username" value={id} onChange={(event) => setId(event.target.value)} /></label>
              <label>Passphrase<input type="password" autoComplete="current-password" value={secret} onChange={(event) => setSecret(event.target.value)} /></label>
              <button type="submit" disabled={busy || !id.trim() || !secret}>{busy ? "Signing in…" : "Open Forge"}</button>
            </>}
      {message && <p role="status">{message}</p>}
    </form>
  </main>;
}

function safeNext() {
  const raw = new URLSearchParams(window.location.search).get("next") ?? "/studio";
  return raw.startsWith("/") && !raw.startsWith("//") ? raw : "/studio";
}
