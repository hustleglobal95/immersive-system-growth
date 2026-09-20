"use client";
import { writeStored } from "@/src/lib/useClientValue";
import { STUDIO_GUIDE_SHIP_KEY } from "@/src/studio/StudioWorkflowGuide";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import type { ExperienceConfig } from "@/src/types/experience";
import type { AssetManifest } from "@/src/types/assets";
import type { CinematicSystemsManifest } from "@/src/lib/cinematic/schema";
import type { InteractionGraph } from "@/src/lib/interactionGraph";
import { contentSourceSchema, type ContentSource, type StudioProject } from "@/src/platform/studioSchema";
import rawForgeProject from "@/config/forge-project.json";
import { parseForgeProject } from "@/src/platform/forgeProjectSchema";
import { telemetryEventSchema, type TelemetryEvent } from "@/src/platform/telemetry";
import { summarizeTelemetry } from "@/src/platform/telemetrySummary";

const forgeProject = parseForgeProject(rawForgeProject);

export function ProjectPanel({
  experience,
  setExperience,
  project,
  setProject,
}: StudioPanelProps) {
  return (
    <div className="studio-grid">
      <section className="studio-card">
        <div className="studio-card__head"><div><span>PROJECT</span><h2>Identity and runtime</h2></div><code>v{project.version}</code></div>
        <label>Project name<input value={project.name} onChange={(event) => setProject((current) => ({ ...current, name: event.target.value }))} /></label>
        <label>Project ID<input value={project.id} onChange={(event) => setProject((current) => ({ ...current, id: event.target.value }))} /></label>
        <label>Experience name<input value={experience.meta.name} onChange={(event) => setExperience((current) => ({ ...current, meta: { ...current.meta, name: event.target.value } }))} /></label>
        <label>Theme color<input type="color" value={experience.meta.themeColor} onChange={(event) => setExperience((current) => ({ ...current, meta: { ...current.meta, themeColor: event.target.value } }))} /></label>
      </section>
      <section className="studio-card">
        <div className="studio-card__head"><div><span>CAPABILITY</span><h2>Production readiness</h2></div><output>8 systems</output></div>
        <ul className="readiness-list">
          {[
            ["Timeline", experience.scenes.length + " editable scenes"],
            ["Product rig", (experience.productRig?.nodes.length ?? 0) + " named nodes"],
            ["Media", experience.scenes.filter((scene) => scene.media).length + " transition layers"],
            ["Content", project.contentSources.length + " configured sources"],
            ["Deploy", project.deployment.provider],
            ["Telemetry", project.telemetry.enabled ? "configured" : "disabled"],
          ].map(([label, value]) => <li key={label}><span>{label}</span><strong>{value}</strong></li>)}
        </ul>
        <a className="studio-secondary" href="/lab">Open live scene lab</a>
      </section>
    </div>
  );
}

export function IntegrationsPanel({ project, setProject }: Pick<StudioPanelProps, "project" | "setProject">) {
  const [draft, setDraft] = useState(JSON.stringify(project.contentSources, null, 2));
  const [message, setMessage] = useState("");
  const apply = () => {
    try {
      const input = JSON.parse(draft) as unknown;
      if (!Array.isArray(input)) throw new Error("Content sources must be a JSON array");
      const sources = input.map((source) => contentSourceSchema.parse(source));
      setProject((current) => ({ ...current, contentSources: sources }));
      setMessage("Configuration applied.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Invalid integration configuration");
    }
  };
  const addSource = (kind: ContentSource["kind"]) => {
    const source: ContentSource = kind === "static"
      ? { id: "local-content", kind, data: { headline: "Connected content" }, mappings: [] }
      : kind === "json"
        ? { id: "json-feed", kind, endpoint: "https://content.example.com/experience.json", mappings: [{ from: "$.headline", to: "$.scenes[0].copy.headline" }] }
        : { id: "shopify-products", kind, storeDomain: "store.myshopify.com", storefrontTokenEnv: "SHOPIFY_STOREFRONT_MAIN_TOKEN", apiVersion: "2026-07", productLimit: 12, mappings: [{ from: "$.products.nodes[0].title", to: "$.scenes[0].copy.headline" }] };
    setDraft(JSON.stringify([...project.contentSources, source], null, 2));
    setMessage("Review the generated source, then apply it.");
  };
  const testFirst = async () => {
    const source = project.contentSources[0];
    if (!source) return setMessage("Apply at least one content source first.");
    setMessage("Testing connection...");
    try {
      const response = await fetch("/api/integrations/preview", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(source) });
      const result = await response.json() as { ok?: boolean; error?: string };
      setMessage(result.ok ? "Connection succeeded." : result.error ?? "Connection failed.");
    } catch {
      setMessage("Connection request failed.");
    }
  };

  return (
    <section className="studio-card studio-card--wide">
      <div className="studio-card__head"><div><span>CONTENT ADAPTERS</span><h2>CMS and commerce</h2></div><output>{project.contentSources.length} sources</output></div>
      <p className="studio-muted">Sources resolve through explicit JSON-path mappings. Remote preview hosts must be listed in FORGE_ALLOWED_CONTENT_HOSTS.</p>
      <div className="studio-actions">
        <button type="button" onClick={() => addSource("static")}>Add static source</button>
        <button type="button" onClick={() => addSource("json")}>Add JSON feed</button>
        <button type="button" onClick={() => addSource("shopify")}>Add Shopify</button>
      </div>
      <label>Content sources JSON<textarea className="studio-code" rows={18} value={draft} onChange={(event) => setDraft(event.target.value)} spellCheck={false} /></label>
      <div className="studio-actions">
        <button className="studio-primary" type="button" onClick={apply}>Validate and apply</button>
        <button type="button" onClick={() => void testFirst()}>Test first source</button>
      </div>
      {message && <p role="status" className="studio-message">{message}</p>}
    </section>
  );
}

export function PublishPanel({ project, setProject, experience, assetManifest, interactionGraph, cinematicSystems, validationCount = 0, healthReady = true, healthSummary = "" }: Pick<StudioPanelProps, "project" | "setProject" | "experience" | "assetManifest" | "interactionGraph" | "cinematicSystems"> & { validationCount?: number; healthReady?: boolean; healthSummary?: string }) {
  const [title, setTitle] = useState(`Update ${project.name} experience`);
  const [summary, setSummary] = useState("Studio-authored camera, material, transition and content improvements ready for review.");
  const [result, setResult] = useState<{ message: string; url?: string } | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [capability, setCapability] = useState<PublishCapability | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const [unlockSecret, setUnlockSecret] = useState("");
  const [unlocking, setUnlocking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void readPublishCapability().then((value) => { if (!cancelled) setCapability(value); });
    return () => { cancelled = true; };
  }, []);

  const backendReady = Boolean(capability?.enabled && capability.repositoryConfigured && capability.githubTokenConfigured && capability.secretConfigured);
  const destinationReady = Boolean(project.deployment.projectName.trim() && project.deployment.productionBranch.trim());
  const sessionReady = Boolean(capability?.sessionAuthorized);
  const canPublish = Boolean(capability?.canPublish);
  const manifestAssets = [...assetManifest.models, ...assetManifest.textures, ...assetManifest.hdr, ...assetManifest.video];
  const temporaryAssets = manifestAssets.filter((asset) => asset.path.startsWith("/api/studio/assets/generated-file/")).length;
  const assetsDurable = temporaryAssets === 0;
  const ready = canPublish && backendReady && destinationReady && sessionReady && assetsDurable && validationCount === 0 && healthReady;

  const publish = async () => {
    setPublishing(true); setResult({ message: "Creating a protected review branch…" });
    try {
      const response = await fetch("/api/studio/publish", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ experience, project, assetManifest, interactionGraph, cinematicSystems, title, summary }) });
      const body = await response.json() as { ok?: boolean; error?: string; url?: string; number?: number };
      if (!response.ok || !body.ok) throw new Error(body.error ?? "Publishing failed");
      writeStored(STUDIO_GUIDE_SHIP_KEY, project.id);
      void fetch(`/api/studio/vault/projects/${encodeURIComponent(project.id)}/journal`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "publish", detail: `Review #${body.number} created: ${title}` }) }).catch(() => {});
      setResult({ message: `Review #${body.number} created successfully.`, url: body.url });
    } catch (error) {
      setResult({ message: error instanceof Error ? error.message : "Publishing failed" });
      setCapability(await readPublishCapability());
    } finally { setPublishing(false); }
  };

  const unlock = async () => {
    if (!unlockSecret) return;
    setUnlocking(true); setResult({ message: "Unlocking publishing on this browser…" });
    try {
      const response = await fetch("/api/studio/publish/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ secret: unlockSecret }) });
      const body = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !body.ok) throw new Error(body.error ?? "Publishing could not be unlocked.");
      setUnlockSecret("");
      setCapability(await readPublishCapability());
      setResult({ message: "Publishing unlocked for this browser session." });
    } catch (error) { setResult({ message: error instanceof Error ? error.message : "Publishing could not be unlocked." }); }
    finally { setUnlocking(false); }
  };

  return (
    <div className="studio-publish-guided">
      <section className="studio-card studio-card--wide studio-publish-hero">
        <div className="studio-card__head"><div><span>GUIDED SHIP</span><h2>{ready ? "Ready to create a review." : "Finish the release setup."}</h2></div><output data-status={ready ? "ready" : "attention"}>{ready ? "READY" : "SETUP"}</output></div>
        <p className="studio-muted">Forge keeps repository credentials, workflow details and deployment internals out of the normal authoring path. Create a review when the project is valid and this browser has been authorized by the workspace owner.</p>
        <div className="studio-publish-readiness" role="list" aria-label="Publish readiness">
          <div role="listitem" data-ready={validationCount === 0}><span>{validationCount === 0 ? "✓" : "!"}</span><strong>Project validation</strong><small>{validationCount === 0 ? "No configuration issues" : `${validationCount} issue${validationCount === 1 ? "" : "s"} need attention`}</small></div>
          <div role="listitem" data-ready={healthReady}><span>{healthReady ? "✓" : "!"}</span><strong>Project Health</strong><small>{healthReady ? "Forge production health is ready" : healthSummary || "Review production issues before shipping"}</small></div>
          <div role="listitem" data-ready={destinationReady}><span>{destinationReady ? "✓" : "!"}</span><strong>Release destination</strong><small>{destinationReady ? `${project.deployment.provider} · ${project.deployment.projectName}` : "Choose a project and production branch in Advanced setup"}</small></div>
          <div role="listitem" data-ready={backendReady}><span>{backendReady ? "✓" : "!"}</span><strong>Workspace connection</strong><small>{backendReady ? "Server-side GitHub publishing is connected" : "A workspace owner must connect server publishing once"}</small></div>
          <div role="listitem" data-ready={assetsDurable}><span>{assetsDurable ? "✓" : "!"}</span><strong>Asset durability</strong><small>{assetsDurable ? "No temporary generated assets" : `${temporaryAssets} generated asset${temporaryAssets === 1 ? "" : "s"} still use the draft bridge`}</small></div><div role="listitem" data-ready={canPublish}><span>{canPublish ? "✓" : "!"}</span><strong>Release authority</strong><small>{canPublish ? `${capability?.role ?? "developer"} can create review branches` : `${capability?.role ?? "reviewer"} can review but a developer or owner must publish`}</small></div><div role="listitem" data-ready={sessionReady}><span>{sessionReady ? "✓" : "!"}</span><strong>This browser</strong><small>{sessionReady ? "Authorized to create review branches" : backendReady && canPublish ? "Unlock publishing below" : canPublish ? "Available after workspace publishing is connected" : "Release handoff required"}</small></div>
        </div>
      </section>

      <section className="studio-card studio-card--wide studio-publish-pr">
        <div className="studio-card__head"><div><span>REVIEW HANDOFF</span><h2>Create review</h2></div><output>{project.deployment.provider}</output></div>
        <label>Review title<input value={title} maxLength={100} onChange={(event) => setTitle(event.target.value)} /></label>
        <label>What changed<textarea rows={3} value={summary} maxLength={600} onChange={(event) => setSummary(event.target.value)} /></label>
        <button type="button" className="studio-primary studio-publish-action" disabled={!ready || publishing} onClick={() => void publish()}>{publishing ? "Creating review…" : "Create review"}</button>
        {!ready && <p className="studio-muted">{!healthReady ? healthSummary || "Project Health must be ready before shipping." : !canPublish ? "This role can review the project, but a developer or owner must create the release review." : !backendReady ? "Publishing is not connected for this Forge workspace yet." : !sessionReady ? "This browser needs a one-time owner unlock before it can publish." : !destinationReady ? "Complete the destination in Advanced setup." : !assetsDurable ? "Promote temporary generated assets into permanent storage before shipping." : "Resolve the project issues above before publishing."}</p>}
        {result && <div className="studio-message" role="status">{result.url ? <><strong>Done — the review is ready.</strong><span> {result.message}</span><a href={result.url} target="_blank" rel="noreferrer">Open review</a></> : result.message}</div>}
      </section>

      <section className="studio-card studio-card--wide studio-publish-advanced">
        <button type="button" className="studio-publish-advanced-toggle" aria-expanded={advanced} onClick={() => setAdvanced((value) => !value)}>{advanced ? "Hide Advanced setup" : "Advanced setup"}</button>
        {advanced && <div className="studio-publish-advanced-grid">
          <div>
            <span className="studio-publish-kicker">DESTINATION</span>
            <label>Provider<select value={project.deployment.provider} onChange={(event) => setProject((current) => ({ ...current, deployment: { ...current.deployment, provider: event.target.value as "vercel" | "custom" } }))}><option value="vercel">Vercel</option><option value="custom">Custom hook</option></select></label>
            <label>Provider project name<input value={project.deployment.projectName} onChange={(event) => setProject((current) => ({ ...current, deployment: { ...current.deployment, projectName: event.target.value } }))} /></label>
            <label>Production branch<input value={project.deployment.productionBranch} onChange={(event) => setProject((current) => ({ ...current, deployment: { ...current.deployment, productionBranch: event.target.value } }))} /></label>
          </div>
          <div>
            <span className="studio-publish-kicker">OWNER UNLOCK</span>
            <p className="studio-muted">The publish secret is an owner credential, not a project field. Enter it here once to authorize this browser with an HTTP-only session; the secret is never stored in Studio state after unlock.</p>
            <label>Owner publish secret<input type="password" autoComplete="off" value={unlockSecret} onChange={(event) => setUnlockSecret(event.target.value)} /></label>
            <button type="button" disabled={!unlockSecret || unlocking || !backendReady || !canPublish} onClick={() => void unlock()}>{unlocking ? "Unlocking…" : "Unlock this browser"}</button>
          </div>
          <div>
            <span className="studio-publish-kicker">PIPELINE</span>
            <p className="studio-muted">Advanced operators can still use the protected deployment workflow directly after review. Normal authors do not need to know the workflow name or repository credentials.</p>
            <code className="studio-command">Actions / Deploy client experience / Run workflow</code>
          </div>
        </div>}
      </section>
    </div>
  );
}

interface PublishCapability {
  ok: boolean;
  role?: string;
  canPublish: boolean;
  enabled: boolean;
  secretConfigured: boolean;
  repositoryConfigured: boolean;
  githubTokenConfigured: boolean;
  sessionAuthorized: boolean;
}

async function readPublishCapability(): Promise<PublishCapability> {
  try {
    const response = await fetch("/api/studio/publish/status", { cache: "no-store" });
    const data = await response.json() as Partial<PublishCapability>;
    return {
      ok: Boolean(data.ok),
      role: typeof data.role === "string" ? data.role : undefined,
      canPublish: Boolean(data.canPublish),
      enabled: Boolean(data.enabled),
      secretConfigured: Boolean(data.secretConfigured),
      repositoryConfigured: Boolean(data.repositoryConfigured),
      githubTokenConfigured: Boolean(data.githubTokenConfigured),
      sessionAuthorized: Boolean(data.sessionAuthorized),
    };
  } catch {
    return { ok: false, canPublish: false, enabled: false, secretConfigured: false, repositoryConfigured: false, githubTokenConfigured: false, sessionAuthorized: false };
  }
}

export function TelemetryPanel({ project, setProject }: Pick<StudioPanelProps, "project" | "setProject">) {
  const [events, setEvents] = useState<TelemetryEvent[]>([]);
  const summary = useMemo(() => summarizeTelemetry(events, forgeProject.performance.targetFps), [events]);
  useEffect(() => {
    const stored = localStorage.getItem("forge-telemetry-preview");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const safe = Array.isArray(parsed) ? parsed.flatMap((item) => { const result = telemetryEventSchema.safeParse(item); return result.success ? [result.data] : []; }) : [];
        queueMicrotask(() => setEvents(safe));
      } catch {
        localStorage.removeItem("forge-telemetry-preview");
      }
    }
    const listener = (event: Event) => {
      const result = telemetryEventSchema.safeParse((event as CustomEvent<unknown>).detail);
      if (!result.success) return;
      setEvents((current) => [result.data, ...current].slice(0, 30));
    };
    window.addEventListener("forge:telemetry", listener);
    return () => window.removeEventListener("forge:telemetry", listener);
  }, []);
  return (
    <div className="studio-grid">
      <section className="studio-card">
        <div className="studio-card__head"><div><span>REAL DEVICES</span><h2>Telemetry policy</h2></div><output>{project.telemetry.enabled ? "enabled" : "off"}</output></div>
        <label className="studio-check"><input type="checkbox" checked={project.telemetry.enabled} onChange={(event) => setProject((current) => ({ ...current, telemetry: { ...current.telemetry, enabled: event.target.checked } }))} /> Collect performance telemetry</label>
        <label>Sample rate <output>{Math.round(project.telemetry.sampleRate * 100)}%</output><input type="range" min="0" max="1" step="0.05" value={project.telemetry.sampleRate} onChange={(event) => setProject((current) => ({ ...current, telemetry: { ...current.telemetry, sampleRate: Number(event.target.value) } }))} /></label>
        <label>Consent mode<select value={project.telemetry.consent} onChange={(event) => setProject((current) => ({ ...current, telemetry: { ...current.telemetry, consent: event.target.value as "analytics" | "essential" } }))}><option value="analytics">Analytics consent required</option><option value="essential">Essential performance monitoring</option></select></label>
        <label className="studio-check"><input type="checkbox" checked={project.telemetry.respectDnt} onChange={(event) => setProject((current) => ({ ...current, telemetry: { ...current.telemetry, respectDnt: event.target.checked } }))} /> Respect Do Not Track</label>
      </section>
      <section className="studio-card">
        <div className="studio-card__head"><div><span>THIS DEVICE</span><h2>Recent samples</h2></div><output>{events.length}</output></div>
        <div className="telemetry-list">
          {events.map((event, index) => <div key={index}><strong>{event.type}</strong><code>{JSON.stringify(event.metrics).slice(0, 180)}</code></div>)}
          {!events.length && <p className="studio-muted">Performance samples appear after consent is enabled on the live experience.</p>}
        </div>
      </section>
      <section className="studio-card studio-card--wide telemetry-summary" aria-label="Device performance certification">
        <div className="studio-card__head"><div><span>RELEASE CONFIDENCE</span><h2>Device certification</h2></div><output data-status={summary.status}>{summary.status}</output></div>
        <p>{summary.status === "ready" ? "Collect FPS and WebGL events from real devices to certify this release." : summary.status === "pass" ? "Observed median frame rate meets the project target with no recorded WebGL failures." : "Observed devices need attention before this release can be certified."}</p>
        <div className="telemetry-summary__stats">
          <div><span>Sessions</span><strong>{summary.sessions}</strong></div>
          <div><span>FPS p50</span><strong>{summary.p50Fps === null ? "—" : summary.p50Fps.toFixed(1)}</strong></div>
          <div><span>FPS p95</span><strong>{summary.p95Fps === null ? "—" : summary.p95Fps.toFixed(1)}</strong></div>
          <div><span>Target</span><strong>{forgeProject.performance.targetFps}</strong></div>
          <div><span>Slow frames</span><strong>{summary.slowFrameRate === null ? "—" : `${(summary.slowFrameRate * 100).toFixed(1)}%`}</strong></div>
          <div><span>WebGL failures</span><strong>{summary.webglFailures}</strong></div>
        </div>
        {!!Object.keys(summary.quality).length && <p className="studio-muted">Quality distribution: {Object.entries(summary.quality).map(([quality, count]) => `${quality} ${count}`).join(" · ")}</p>}
      </section>
    </div>
  );
}

interface StudioPanelProps {
  experience: ExperienceConfig;
  setExperience: Dispatch<SetStateAction<ExperienceConfig>>;
  project: StudioProject;
  setProject: Dispatch<SetStateAction<StudioProject>>;
  assetManifest: AssetManifest;
  interactionGraph: InteractionGraph;
  cinematicSystems?: CinematicSystemsManifest;
}
