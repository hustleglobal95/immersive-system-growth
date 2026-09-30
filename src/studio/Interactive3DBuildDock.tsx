"use client";

import { useMemo, useState } from "react";
import type { ExperienceConfig } from "@/src/types/experience";
import type { AssetManifest } from "@/src/types/assets";

type HealthStatus = "ready" | "attention" | "blocked";

type BuildResult = {
  ok: true;
  ai: { configured: boolean; used: boolean };
  blueprint: {
    experience: {
      archetype: string;
      signatureMoment: string;
      signatureSceneId: string;
    };
  };
  candidate: ExperienceConfig;
  assets: { ready: boolean; blockers: string[] };
  decisions: string[];
};

export function Interactive3DBuildDock(props: {
  initialPrompt: string;
  projectName: string;
  experience: ExperienceConfig;
  manifest: AssetManifest;
  healthStatus: HealthStatus;
  onPreview: (candidate: ExperienceConfig) => void;
  onApply: (candidate: ExperienceConfig) => void;
  onOpenAssets: () => void;
}) {
  const [prompt, setPrompt] = useState(props.initialPrompt);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(!props.initialPrompt.trim());
  const [keepHero, setKeepHero] = useState(Boolean(props.experience.heroModel));
  const [result, setResult] = useState<BuildResult | null>(null);
  const [error, setError] = useState("");

  const assetCount = props.manifest.models.length + props.manifest.textures.length + props.manifest.hdr.length + props.manifest.video.length;
  const motionCount = props.experience.scenes.reduce((sum, scene) => sum + scene.motionTracks.length, 0);
  const stages = useMemo(() => [
    { label: "Brief", done: prompt.trim().length >= 12 || Boolean(result) },
    { label: "Hero asset", done: result ? result.assets.ready : assetCount > 0 },
    { label: "Scenes", done: result ? result.candidate.scenes.length > 1 : props.experience.scenes.length > 1 },
    { label: "Motion", done: result ? result.candidate.scenes.some((scene) => scene.motionTracks.length > 0) : motionCount > 0 },
    { label: "Proof", done: props.healthStatus === "ready" },
  ], [assetCount, motionCount, prompt, props.experience.scenes.length, props.healthStatus, result]);

  async function build() {
    const value = prompt.trim();
    if (value.length < 12 || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/studio/interactive3d/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt: value,
          projectName: props.projectName,
          experience: props.experience,
          manifest: props.manifest,
          useCurrentHero: keepHero,
        }),
      });
      const body = await response.json() as BuildResult | { ok: false; error?: string };
      if (!response.ok || !body.ok) throw new Error("error" in body ? body.error || "Interactive 3D planning failed." : "Interactive 3D planning failed.");
      setResult(body);
      setExpanded(true);
      props.onPreview(body.candidate);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Interactive 3D planning failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="interactive-3d-build" className="production-3d-builder" data-expanded={expanded}>
      <header className="production-3d-builder__head">
        <div>
          <span>AI 3D BUILD</span>
          <strong>Describe the website. Forge plans the spatial system.</strong>
        </div>
        <button type="button" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
          {expanded ? "Hide" : "Open"}
        </button>
      </header>

      <div className="production-3d-pipeline" aria-label="Interactive 3D build stages">
        {stages.map((stage, index) => (
          <div key={stage.label} data-done={stage.done}>
            <i>{stage.done ? "✓" : index + 1}</i>
            <span>{stage.label}</span>
          </div>
        ))}
      </div>

      {expanded && (
        <div className="production-3d-builder__body">
          <div className="production-3d-builder__prompt">
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={3}
              placeholder="Example: Build a luxury mechanical watch experience. One persistent watch is the hero. Scroll assembles the movement, then transitions into macro material inspection. Keep typography editorial and motion restrained."
            />
            <div className="production-3d-builder__prompt-actions">
              <label>
                <input
                  type="checkbox"
                  checked={keepHero}
                  disabled={!props.experience.heroModel}
                  onChange={(event) => setKeepHero(event.target.checked)}
                />
                Keep current hero GLB
              </label>
              <button type="button" className="primary" disabled={busy || prompt.trim().length < 12} onClick={() => void build()}>
                {busy ? "Planning…" : "Build 3D direction"}
              </button>
            </div>
          </div>

          <aside className="production-3d-builder__evidence">
            {result ? (
              <>
                <div className="production-3d-builder__summary">
                  <span>{result.blueprint.experience.archetype.replace(/-/g, " ")}</span>
                  <strong>{result.blueprint.experience.signatureSceneId}</strong>
                  <p>{result.blueprint.experience.signatureMoment}</p>
                </div>
                <div className="production-3d-builder__chips">
                  <span data-ok={result.ai.used}>{result.ai.used ? "AI refined" : "Deterministic plan"}</span>
                  <span data-ok={result.assets.ready}>{result.assets.ready ? "Hero ready" : "Hero blocked"}</span>
                </div>
                {!result.assets.ready && result.assets.blockers[0] && <p className="production-3d-builder__blocker">{result.assets.blockers[0]}</p>}
                <div className="production-3d-builder__result-actions">
                  <button type="button" onClick={() => props.onPreview(result.candidate)}>Preview</button>
                  <button type="button" className="primary" onClick={() => props.onApply(result.candidate)}>Apply structure</button>
                  {!result.assets.ready && <button type="button" onClick={props.onOpenAssets}>Resolve assets</button>}
                </div>
              </>
            ) : (
              <div className="production-3d-builder__empty">
                <strong>One prompt, bounded output.</strong>
                <p>Forge chooses the 3D archetype, signature scene, camera grammar, interaction model, mobile translation and asset needs before it touches the page.</p>
              </div>
            )}
            {error && <p className="production-3d-builder__error" role="alert">{error}</p>}
          </aside>
        </div>
      )}
    </section>
  );
}
