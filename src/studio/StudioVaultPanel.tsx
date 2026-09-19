"use client";

import { useEffect, useMemo, useState } from "react";
import type { useStudioDraft } from "@/src/studio/useStudioDraft";

type Draft = ReturnType<typeof useStudioDraft>;
type VaultSummary = { id: string; name: string; status: "active" | "archived"; updatedAt: string; updatedBy: string; sceneCount: number; versionCount: number };
type VaultVersion = { versionId: string; label: string; note: string; savedAt: string; savedBy: string };
type VaultSnapshot = { experience: unknown; project: unknown; assetManifest: unknown; interactionGraph: unknown; versionId: string; label: string; savedAt: string; savedBy: string };

export function StudioVaultPanel({ draft, onClose }: { draft: Draft; onClose: () => void }) {
  const [projects, setProjects] = useState<VaultSummary[]>([]);
  const [selectedId, setSelectedId] = useState(draft.project.id);
  const [versions, setVersions] = useState<VaultVersion[]>([]);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [label, setLabel] = useState("Production checkpoint");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const selected = useMemo(() => projects.find((project) => project.id === selectedId), [projects, selectedId]);

  const refresh = async () => {
    try {
      const response = await fetch("/api/studio/vault/projects", { cache: "no-store" });
      const data = await response.json() as { ok?: boolean; error?: string; configuration?: { configured?: boolean }; projects?: VaultSummary[] };
      if (!response.ok || !data.ok) throw new Error(data.error ?? "Could not read Project Vault");
      setConfigured(Boolean(data.configuration?.configured));
      setProjects(data.projects ?? []);
      const preferred = (data.projects ?? []).some((project) => project.id === selectedId) ? selectedId : (data.projects?.[0]?.id ?? draft.project.id);
      setSelectedId(preferred);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not read Project Vault");
    }
  };

  const refreshVersions = async (projectId: string) => {
    if (!projects.some((project) => project.id === projectId)) return setVersions([]);
    try {
      const response = await fetch(`/api/studio/vault/projects/${encodeURIComponent(projectId)}/versions`, { cache: "no-store" });
      const data = await response.json() as { ok?: boolean; error?: string; versions?: VaultVersion[] };
      if (!response.ok || !data.ok) throw new Error(data.error ?? "Could not read versions");
      setVersions(data.versions ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not read versions");
    }
  };

  useEffect(() => { void refresh(); }, []);
  useEffect(() => { void refreshVersions(selectedId); }, [selectedId, projects.length]);

  const save = async () => {
    setBusy(true); setMessage("Saving durable project snapshot…");
    try {
      const response = await fetch("/api/studio/vault/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          label,
          note,
          draft: { experience: draft.experience, project: draft.project, assetManifest: draft.assetManifest, interactionGraph: draft.interactionGraph },
        }),
      });
      const data = await response.json() as { ok?: boolean; error?: string; entry?: VaultVersion };
      if (!response.ok || !data.ok) throw new Error(data.error ?? "Could not save project");
      setMessage(`Saved ${data.entry?.label ?? label} to Project Vault.`);
      setSelectedId(draft.project.id);
      setNote("");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save project");
    } finally { setBusy(false); }
  };

  const load = async (projectId: string) => {
    setBusy(true); setMessage("Loading project from Vault…");
    try {
      const response = await fetch(`/api/studio/vault/projects/${encodeURIComponent(projectId)}`, { cache: "no-store" });
      const data = await response.json() as { ok?: boolean; error?: string; snapshot?: VaultSnapshot };
      if (!response.ok || !data.ok || !data.snapshot) throw new Error(data.error ?? "Could not load project");
      draft.loadDraft(data.snapshot);
      setMessage(`Loaded ${(data.snapshot.project as { name?: string }).name ?? projectId} from Project Vault.`);
      setSelectedId(projectId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load project");
    } finally { setBusy(false); }
  };

  const restore = async (version: VaultVersion) => {
    setBusy(true); setMessage(`Restoring ${version.label}…`);
    try {
      const response = await fetch(`/api/studio/vault/projects/${encodeURIComponent(selectedId)}/versions/${encodeURIComponent(version.versionId)}`, { method: "POST" });
      const data = await response.json() as { ok?: boolean; error?: string; snapshot?: VaultSnapshot };
      if (!response.ok || !data.ok || !data.snapshot) throw new Error(data.error ?? "Could not restore version");
      draft.loadDraft(data.snapshot);
      setMessage(`Restored ${version.label}. The restored state is now the Vault current version.`);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not restore version");
    } finally { setBusy(false); }
  };

  const archive = async (archived: boolean) => {
    if (!selected) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/studio/vault/projects/${encodeURIComponent(selected.id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ archived }) });
      const data = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error ?? "Could not update project");
      setMessage(archived ? "Project archived." : "Project returned to active work.");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update project");
    } finally { setBusy(false); }
  };

  return <div className="production-modal-backdrop production-vault-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
    <section className="production-vault" role="dialog" aria-modal="true" aria-labelledby="forge-vault-title">
      <header><div><span>FORGE / PROJECT VAULT</span><h2 id="forge-vault-title">Durable projects and restore points.</h2></div><button type="button" aria-label="Close Project Vault" onClick={onClose}>×</button></header>
      <div className="production-vault-status" data-ready={configured === true}><strong>{configured === null ? "Checking storage…" : configured ? "Durable storage connected" : "Vault not configured"}</strong><span>{configured ? "GitHub-backed snapshots are independent of this browser." : "Configure the server Vault before treating browser storage as durable."}</span></div>

      <div className="production-vault-grid">
        <aside>
          <div className="production-vault-section-head"><span>PROJECTS</span><strong>{projects.filter((project) => project.status === "active").length} active</strong></div>
          <button type="button" className="production-vault-current" onClick={() => setSelectedId(draft.project.id)}><span>CURRENT DRAFT</span><strong>{draft.project.name}</strong></button>
          {projects.map((project) => <button type="button" key={project.id} data-selected={project.id === selectedId} onClick={() => setSelectedId(project.id)}><strong>{project.name}</strong><span>{project.sceneCount} scenes · {project.versionCount} versions</span><small>{project.status} · {new Date(project.updatedAt).toLocaleString()}</small></button>)}
        </aside>

        <main>
          <section className="production-vault-save">
            <span>SAVE CURRENT PROJECT</span>
            <h3>{draft.project.name}</h3>
            <label>Checkpoint name<input value={label} maxLength={120} onChange={(event) => setLabel(event.target.value)} /></label>
            <label>Production note<textarea rows={3} value={note} maxLength={1000} onChange={(event) => setNote(event.target.value)} placeholder="What changed, what was decided, what should the next person know?" /></label>
            <button type="button" className="primary" disabled={busy || configured === false || !label.trim()} onClick={() => void save()}>{busy ? "Working…" : "Save to Project Vault"}</button>
          </section>

          {selected && <section className="production-vault-history">
            <div className="production-vault-section-head"><div><span>VERSION HISTORY</span><strong>{selected.name}</strong></div><div><button type="button" disabled={busy} onClick={() => void load(selected.id)}>Open current</button><button type="button" disabled={busy} onClick={() => void archive(selected.status !== "archived")}>{selected.status === "archived" ? "Unarchive" : "Archive"}</button></div></div>
            {versions.length ? versions.map((version) => <article key={version.versionId}><div><strong>{version.label}</strong><span>{new Date(version.savedAt).toLocaleString()} · {version.savedBy}</span>{version.note && <p>{version.note}</p>}</div><button type="button" disabled={busy} onClick={() => void restore(version)}>Restore</button></article>) : <p className="production-empty">No durable versions yet.</p>}
          </section>}
          {message && <p className="production-vault-message" role="status">{message}</p>}
        </main>
      </div>
    </section>
  </div>;
}
