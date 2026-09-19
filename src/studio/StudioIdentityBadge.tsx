"use client";

import { useEffect, useState } from "react";

type Identity = { id: string; name: string; role: string };

export function StudioIdentityBadge() {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [accessEnabled, setAccessEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/studio/auth/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { accessEnabled?: boolean; identity?: Identity | null }) => {
        if (cancelled) return;
        setAccessEnabled(Boolean(data.accessEnabled));
        setIdentity(data.identity ?? null);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!identity) return null;
  const signOut = async () => {
    await fetch("/api/studio/auth/session", { method: "DELETE" });
    window.location.assign("/studio/login");
  };

  return accessEnabled
    ? <details className="production-identity"><summary><span>{initials(identity.name)}</span><strong>{identity.name}</strong><small>{identity.role}</small></summary><div><p>Signed in as <strong>{identity.name}</strong></p><span>{identity.role.toUpperCase()} · {identity.id}</span><button type="button" onClick={() => void signOut()}>Sign out</button></div></details>
    : <span className="production-identity-local">LOCAL OWNER</span>;
}

function initials(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "GT";
}
