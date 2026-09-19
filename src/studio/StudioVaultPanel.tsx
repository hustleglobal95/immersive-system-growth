"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { useStudioDraft } from "@/src/studio/useStudioDraft";

type Draft = ReturnType<typeof useStudioDraft>;
type VaultSummary = { id: string; name: string; status: "active" | "archived"; updatedAt: string; updatedBy: string; sceneCount: number; versionCount: number };
type VaultVersion = { versionId: string; label: string; note: string; savedAt: string; savedBy: string };
type VaultSnapshot = { experience: unknown; project: unknown; assetManifest: unknown; interactionGraph: unknown; versionId: string; label: string; savedAt: string; savedBy: string };
type VaultIdentity = { id: string; name: string; role: "reviewer" | "designer" | "director" | "developer" | "owner" };
type VaultEvent = { id: string; at: string; actor: string; role: string; action: string; detail: string };

export function StudioVaultPanel({ draft, onClose }: { draft: Draft; onClose: () => void }) {
  const [projects, setProjects] = useState<VaultSummary[]>([]);
  const [selectedId, setSelectedId] = useState(draft.project.id);
  const [versions, setVersions] = useState<VaultVersion[]>([]);
  const [events, setEvents] = useState<VaultEvent[]>([]);
  const [lesson, setLesson] = useState("");
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [identity, setIdentity] = useState<VaultIdentity | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const [label, setLabel] = useState("Production checkpoint");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const selected = useMemo(() => projects.find((project) => project.id === selectedId), [projects, selectedId]);
  const role = identity?.role ?? "reviewer";
  const canWrite = ["designer", "director", "developer", "owner"].includes(role);
  const canArchive = ["director", "developer", "owner"].includes(role);

  const refresh = async () => {
    try {
      const response = await fetch("/api/studio/vault/projects", { cache: "no-store" });
      const data = await response.json() as { ok?: boolean; error?: string; identity?: VaultIdentity; configuration?: { configured?: boolean }; projects?: VaultSummary[] };
      if (!response.ok || !data.ok) throw new Error(data.error ?? "Could not read Project Vault");
      setConfigured(Boolean(data.configuration?.configured));
      setIdentity(data.identity ?? null);
      setProjects(data.projects ?? []);
      const preferred = (data.projects ?? []).some((project) => project.id === selectedId) ? selectedId : (data.projects?.[0]?.id ?? draft.project.id);
      setSelectedId(preferred);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not read Project Vault");
    }
  };

  const refreshVersions = async (projectId: string) => {
    try {
      const [versionsResponse, journalResponse] = await Promise.all([
        fetch(`/api/studio/vault/projects/${encodeURIComponent(projectId)}/versions`, { cache: "no-store" }),
        fetch(`/api/studio/vault/projects/${encodeURIComponent(projectId)}/journal`, { cache: "no-store" }),
      ]);
      const versionsData = await versionsResponse.json() as { ok?: boolean; error?: string; versions?: VaultVersion[] };
      const journalData = await journalResponse.json() as { ok?: boolean; error?: string; events?: VaultEvent[] };
      if (!versionsResponse.ok || !versionsData.ok) throw new Error(versionsData.error ?? "Could not read versions");
      if (!journalResponse.ok || !journalData.ok) throw new Error(journalData.error ?? "Could not read project activity");
      setVersions(versionsData.versions ?? []);
      setEvents(journalData.events ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not read project history");
    }
  };

  useEffect(() => { void refresh(); }, []);
  useEffect(() => { if (selected) void refreshVersions(selectedId); else { setVersions([]); setEvents([]); } }, [selectedId, selected?.versionCount]);
  useEffect(() => { dialogRef.current?.focus(); }, []);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

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
      await refreshVersions(draft.project.id);
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
      await refreshVersions(selectedId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not restore version");
    } finally { setBusy(false); }
  };

  const recordLesson = async () => {
    if (!selected || !lesson.trim()) return;
    setBusy(true); setMessage("Recording production lesson…");
    try {
      const response = await fetch(`/api/studio/vault/projects/${encodeURIComponent(selected.id)}/journal`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "lesson", detail: lesson.trim() }) });
      const data = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error ?? "Could not record lesson");
      setLesson("");
      setMessage("Production lesson recorded in the project journal.");
      await refreshVersions(selected.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not record lesson");
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
      await refreshVersions(selected.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update project");
    } finally { setBusy(false); }
  };

  return <div className="production-modal-backdrop production-vault-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
    <section ref={dialogRef} tabIndex={-1} className="production-vault" role="dialog" aria-modal="true" aria-labelledby="forge-vault-title">
      <header><div><span>FORGE / PROJECT VAULT</span><h2 id="forge-vault-title">Durable projects and restore points.</h2></div><button type="button" aria-label="Close Project Vault" onClick={onClose}>×</button></header>
      <div className="production-vault-status" data-ready={configured === true}><strong>{configured === null ? "Checking storage…" : configured ? "Durable storage connected" : "Vault not configured"}</strong><span>{configured ? `GitHub-backed snapshots are independent of this browser · ${identity?.name ?? "operator"} · ${role}` : "Configure the server Vault before treating browser storage as durable."}</span></div>

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
            <button type="button" className="primary" disabled={busy || configured === false || !label.trim() || !canWrite} onClick={() => void save()}>{busy ? "Working…" : "Save to Project Vault"}</button>
          </section>

          {selected && <>
            <section className="production-vault-history">
              <div className="production-vault-section-head"><div><span>VERSION HISTORY</span><strong>{selected.name}</strong></div><div><button type="button" disabled={busy} onClick={() => void load(selected.id)}>Open current</button><button type="button" disabled={busy || !canArchive} onClick={() => void archive(selected.status !== "archived")}>{selected.status === "archived" ? "Unarchive" : "Archive"}</button></div></div>
              {versions.length ? versions.map((version) => <article key={version.versionId}><div><strong>{version.label}</strong><span>{new Date(version.savedAt).toLocaleString()} · {version.savedBy}</span>{version.note && <p>{version.note}</p>}</div><button type="button" disabled={busy || !canWrite} onClick={() => void restore(version)}>Restore</button></article>) : <p className="production-empty">No durable versions yet.</p>}
            </section>
            <section className="production-vault-learning">
              <div className="production-vault-section-head"><div><span>PRODUCTION MEMORY</span><strong>What should Forge remember?</strong></div></div>
              <div className="production-vault-lesson"><input value={lesson} maxLength={1000} onChange={(event) => setLesson(event.target.value)} placeholder="Example: On mobile, the slower camera orbit preserved the luxury feel better than cutting the shot." /><button type="button" disabled={busy || !lesson.trim() || !canWrite} onClick={() => void recordLesson()}>Record lesson</button></div>
              <div className="production-vault-events">{events.slice(0, 12).map((event) => <article key={event.id} data-action={event.action}><div><strong>{event.action.replace("-", " ")}</strong><span>{new Date(event.at).toLocaleString()} · {event.actor} · {event.role}</span></div><p>{event.detail}</p></article>)}</div>
            </section>
          </>}
          {message && <p className="production-vault-message" role="status">{message}</p>}
        </main>
      </div>
    </section>
  </div>;
}
