"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import type { ExperienceConfig } from "@/src/types/experience";
import { contentSourceSchema, type ContentSource, type StudioProject } from "@/src/platform/studioSchema";

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

export function PublishPanel({ project, setProject }: Pick<StudioPanelProps, "project" | "setProject">) {
  return (
    <div className="studio-grid">
      <section className="studio-card">
        <div className="studio-card__head"><div><span>DEPLOYMENT</span><h2>Release target</h2></div><output>{project.deployment.provider}</output></div>
        <label>Provider<select value={project.deployment.provider} onChange={(event) => setProject((current) => ({ ...current, deployment: { ...current.deployment, provider: event.target.value as "vercel" | "custom" } }))}><option value="vercel">Vercel</option><option value="custom">Custom hook</option></select></label>
        <label>Provider project name<input value={project.deployment.projectName} onChange={(event) => setProject((current) => ({ ...current, deployment: { ...current.deployment, projectName: event.target.value } }))} /></label>
        <label>Production branch<input value={project.deployment.productionBranch} onChange={(event) => setProject((current) => ({ ...current, deployment: { ...current.deployment, productionBranch: event.target.value } }))} /></label>
      </section>
      <section className="studio-card">
        <div className="studio-card__head"><div><span>PIPELINE</span><h2>Validated release</h2></div><output>GitHub Actions</output></div>
        <ol className="release-steps">
          <li>Generate or update the client folder.</li>
          <li>Validate project, experience, rigs, and assets.</li>
          <li>Activate the selected client configuration.</li>
          <li>Build the production Next.js application.</li>
          <li>Deploy preview or production through the protected workflow.</li>
        </ol>
        <code className="studio-command">Actions / Deploy client experience / Run workflow</code>
      </section>
    </div>
  );
}

export function TelemetryPanel({ project, setProject }: Pick<StudioPanelProps, "project" | "setProject">) {
  const [events, setEvents] = useState<Array<Record<string, unknown>>>([]);
  useEffect(() => {
    const stored = localStorage.getItem("forge-telemetry-preview");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Array<Record<string, unknown>>;
        queueMicrotask(() => setEvents(parsed));
      } catch {
        localStorage.removeItem("forge-telemetry-preview");
      }
    }
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<Record<string, unknown>>).detail;
      setEvents((current) => [detail, ...current].slice(0, 30));
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
          {events.map((event, index) => <div key={index}><strong>{String(event.type ?? "metric")}</strong><code>{JSON.stringify(event.metrics ?? event).slice(0, 180)}</code></div>)}
          {!events.length && <p className="studio-muted">Performance samples appear after consent is enabled on the live experience.</p>}
        </div>
      </section>
    </div>
  );
}

interface StudioPanelProps {
  experience: ExperienceConfig;
  setExperience: Dispatch<SetStateAction<ExperienceConfig>>;
  project: StudioProject;
  setProject: Dispatch<SetStateAction<StudioProject>>;
}
