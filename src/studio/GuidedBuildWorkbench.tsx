"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import rawExperience from "@/config/experience.json";
import rawProject from "@/config/studio-project.json";
import rawAssetManifest from "@/config/asset-manifest.json";
import rawInteractionGraph from "@/config/interaction-graph.json";
import { parseExperience } from "@/src/lib/configSchema";
import { parseInteractionGraph } from "@/src/lib/interactionGraph";
import { parseStudioProject } from "@/src/platform/studioSchema";
import { applyCreativeExecutionPlan, planCreativeExecution } from "@/src/studio/creativeAgentPlan";
import {
  buildGuidedIntent,
  defaultGuidedBrief,
  loadGuidedBrief,
  loadGuidedStep,
  makeGuidedStarterExperience,
  saveGuidedBrief,
  saveGuidedStep,
  type GuidedBrief,
  type GuidedProjectKind,
} from "@/src/studio/guidedWorkflow";
import { useStudioDraft } from "@/src/studio/useStudioDraft";
import type { AssetManifest } from "@/src/types/assets";

const initialExperience = parseExperience(rawExperience);
const initialProject = parseStudioProject(rawProject);
const initialManifest = rawAssetManifest as AssetManifest;
const initialGraph = parseInteractionGraph(rawInteractionGraph);
const steps = ["Brief", "Direction", "Assets", "Build", "Ship"] as const;

export function GuidedBuildWorkbench() {
  const draft = useStudioDraft(initialExperience, initialProject, initialManifest, initialGraph);
  const [brief, setBrief] = useState<GuidedBrief>(defaultGuidedBrief);
  const [step, setStep] = useState(0);
  const [variation, setVariation] = useState(0);
  const [notice, setNotice] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = loadGuidedBrief();
    if (saved) setBrief(saved);
    setStep(loadGuidedStep());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveGuidedBrief(brief);
  }, [brief, hydrated]);

  const intent = useMemo(() => buildGuidedIntent(brief), [brief]);
  const plan = useMemo(() => planCreativeExecution({ idea: intent, experience: draft.experience, manifest: draft.assetManifest, variation }), [intent, draft.experience, draft.assetManifest, variation]);
  const buildableIndexes = plan.sceneMoves.filter((move) => move.assetPlan.canBuildNow).map((move) => move.sceneIndex);
  const blockedCount = plan.assetSummary.blockedScenes.length;
  const isShipReady = draft.validation.length === 0 && blockedCount === 0 && plan.validation.valid;

  const go = (next: number) => {
    const safe = Math.max(0, Math.min(4, next));
    setStep(safe);
    saveGuidedStep(safe);
    setNotice("");
  };

  const updateBrief = <K extends keyof GuidedBrief>(key: K, value: GuidedBrief[K]) => {
    setBrief((current) => ({ ...current, [key]: value }));
    setVariation(0);
  };

  const createProject = () => {
    const name = brief.projectName.trim();
    if (!name) {
      setNotice("Give the project a name before continuing.");
      return;
    }
    const nextBrief = { ...brief, projectName: name };
    setBrief(nextBrief);
    saveGuidedBrief(nextBrief);
    const id = slug(name) || "guided-experience";
    draft.setExperience(makeGuidedStarterExperience(draft.experience, nextBrief));
    draft.setProject((current) => ({ ...current, id, name, deployment: { ...current.deployment, projectName: id } }));
    draft.setAssetManifest((current) => ({ ...current, models: [], textures: [], hdr: [], video: [] }));
    draft.setInteractionGraph(parseInteractionGraph({
      version: 1,
      id: `${id}-interactions`,
      initialState: "default",
      states: ["default"],
      variables: {},
      nodes: [{ id: "default-state", kind: "state", label: "Default state", position: { x: 40, y: 40 }, state: "default" }],
      edges: [],
      mobileSubstitutions: [],
    }));
    go(1);
    setNotice("Project shell created. Forge is now choosing a production direction from your brief.");
  };

  const buildReadyScenes = () => {
    if (!plan.validation.valid) {
      setNotice(`Forge held the plan: ${plan.validation.errors[0] ?? "the direction is incomplete."}`);
      return;
    }
    if (!buildableIndexes.length) {
      setNotice("No proposed scene is buildable yet. Add or create the critical assets first.");
      go(2);
      return;
    }
    draft.setExperience((current) => applyCreativeExecutionPlan(current, plan, buildableIndexes));
    setNotice(`${buildableIndexes.length} scene${buildableIndexes.length === 1 ? "" : "s"} received the directed camera and motion plan. Blocked scenes were left untouched.`);
    go(4);
  };

  return <main className="guided-build">
    <header className="guided-build__topbar">
      <div><Link href="/studio">FORGE</Link><strong>Guided Build</strong><span>Nontechnical workflow</span></div>
      <nav><Link href="/studio">Studio</Link><Link href="/studio/agent">Creative Agent</Link></nav>
    </header>

    <div className="guided-build__shell">
      <aside className="guided-build__steps" aria-label="Guided build steps">
        <span className="guided-build__eyebrow">PROJECT PATH</span>
        <h1>From idea to publish without learning the production stack.</h1>
        <p>Forge keeps the technical systems underneath. You make creative and business decisions.</p>
        <ol>{steps.map((label, index) => <li key={label} className={index === step ? "is-active" : index < step ? "is-done" : ""}><button type="button" onClick={() => go(index)}><i>{index < step ? "✓" : index + 1}</i><span>{label}</span></button></li>)}</ol>
        <div className="guided-build__project"><span>ACTIVE PROJECT</span><strong>{draft.project.name}</strong><small>{draft.experience.scenes.length} scenes · {assetCount(draft.assetManifest)} assets</small></div>
      </aside>

      <section className="guided-build__content">
        {notice && <button type="button" className="guided-build__notice" onClick={() => setNotice("")}>{notice}<span>×</span></button>}
        {step === 0 && <BriefStep brief={brief} update={updateBrief} onCreate={createProject} />}
        {step === 1 && <DirectionStep plan={plan} onAnother={() => setVariation((value) => value + 1)} onKeep={() => go(2)} />}
        {step === 2 && <AssetsStep plan={plan} onContinue={() => go(3)} />}
        {step === 3 && <BuildStep plan={plan} buildableCount={buildableIndexes.length} onBuild={buildReadyScenes} />}
        {step === 4 && <ShipStep validIssues={draft.validation.length} blockedCount={blockedCount} planValid={plan.validation.valid} ready={isShipReady} />}
      </section>
    </div>
  </main>;
}

function BriefStep({ brief, update, onCreate }: { brief: GuidedBrief; update: <K extends keyof GuidedBrief>(key: K, value: GuidedBrief[K]) => void; onCreate: () => void }) {
  const kinds: GuidedProjectKind[] = ["real-estate", "product", "hospitality", "automotive", "fashion", "custom"];
  return <section className="guided-step">
    <span className="guided-build__eyebrow">01 · BRIEF</span><h2>What are we making?</h2><p className="guided-step__lead">No camera settings. No shader settings. Give Forge the business and creative intent first.</p>
    <div className="guided-form">
      <label>Project name<input value={brief.projectName} onChange={(event) => update("projectName", event.target.value)} placeholder="Casa Lumen" /></label>
      <fieldset><legend>Project type</legend><div className="guided-kind-grid">{kinds.map((kind) => <button type="button" key={kind} aria-pressed={brief.kind === kind} onClick={() => update("kind", kind)}>{kind.replace("-", " ")}</button>)}</div></fieldset>
      <label>What should the visitor understand or feel?<textarea value={brief.objective} onChange={(event) => update("objective", event.target.value)} /></label>
      <label>Who is this for?<input value={brief.audience} onChange={(event) => update("audience", event.target.value)} /></label>
      <label>Creative tone<input value={brief.mood} onChange={(event) => update("mood", event.target.value)} /></label>
    </div>
    <div className="guided-actions"><button type="button" className="guided-primary" onClick={onCreate}>Create project + direction →</button></div>
  </section>;
}

function DirectionStep({ plan, onAnother, onKeep }: { plan: ReturnType<typeof planCreativeExecution>; onAnother: () => void; onKeep: () => void }) {
  return <section className="guided-step">
    <span className="guided-build__eyebrow">02 · DIRECTION</span><h2>{plan.title}</h2><p className="guided-step__lead">Forge selected <strong>{plan.mediumLabel}</strong> because {plan.mediumReason.charAt(0).toLowerCase() + plan.mediumReason.slice(1)}</p>
    <div className="guided-direction-grid">
      <article><span>CORE IDEA</span><p>{plan.thesis}</p></article>
      <article><span>SIGNATURE MOMENT</span><p>{plan.signatureMoment}</p></article>
      <article><span>PRODUCTION APPROACH</span><strong>{plan.mediumLabel}</strong><p>{plan.sceneMoves.length} directed scene beats</p></article>
    </div>
    <div className="guided-scenes">{plan.sceneMoves.map((move) => <article key={move.sceneIndex}><i>{String(move.sceneIndex + 1).padStart(2, "0")}</i><div><span>{move.role}</span><strong>{move.label}</strong><p>{move.purpose}</p></div></article>)}</div>
    <div className="guided-actions"><button type="button" onClick={onAnother}>Try a different direction</button><button type="button" className="guided-primary" onClick={onKeep}>Keep this direction →</button></div>
  </section>;
}

function AssetsStep({ plan, onContinue }: { plan: ReturnType<typeof planCreativeExecution>; onContinue: () => void }) {
  return <section className="guided-step">
    <span className="guided-build__eyebrow">03 · ASSETS</span><h2>What does this direction need?</h2><p className="guided-step__lead">Forge translates the creative direction into a production shopping list before you waste time building the wrong thing.</p>
    <div className="guided-readiness">
      <article><span>CREATE FIRST</span><strong>{plan.assetSummary.highestLeverageAssetToCreateFirst ?? "Nothing critical"}</strong></article>
      <article><span>BUILDABLE NOW</span><strong>{plan.assetSummary.scenesBuildableNow.length}</strong></article>
      <article className={plan.assetSummary.blockedScenes.length ? "is-warn" : ""}><span>BLOCKED</span><strong>{plan.assetSummary.blockedScenes.length}</strong></article>
      <article><span>NEW ASSETS</span><strong>{plan.assetSummary.totalAssetsToCreate}</strong></article>
    </div>
    <div className="guided-asset-scenes">{plan.sceneMoves.map((move) => <article key={move.sceneIndex}><header><div><span>{move.label}</span><strong>{mediumName(move.assetPlan.executionMedium)}</strong></div><em className={move.assetPlan.canBuildNow ? "is-ready" : "is-blocked"}>{move.assetPlan.canBuildNow ? "Ready" : "Needs assets"}</em></header><div className="guided-asset-columns"><section><small>USE</small>{move.assetPlan.existingAssets.length ? move.assetPlan.existingAssets.map((asset) => <p key={asset}>{shortPath(asset)}</p>) : <p>Nothing registered yet.</p>}</section><section><small>CREATE</small>{move.assetPlan.assetsToCreate.length ? move.assetPlan.assetsToCreate.map((asset) => <p key={asset.name}><strong>{asset.name}</strong><span>{asset.priority}</span></p>) : <p>No required new asset.</p>}</section></div>{move.assetPlan.blockers.length > 0 && <footer>{move.assetPlan.blockers.join(" · ")}</footer>}</article>)}</div>
    <div className="guided-actions"><Link href="/studio?workspace=Assets&advanced=1">Open asset workspace</Link><Link href="/studio/agent">Ask Creative Agent</Link><button type="button" className="guided-primary" onClick={onContinue}>Continue to build →</button></div>
  </section>;
}

function BuildStep({ plan, buildableCount, onBuild }: { plan: ReturnType<typeof planCreativeExecution>; buildableCount: number; onBuild: () => void }) {
  return <section className="guided-step">
    <span className="guided-build__eyebrow">04 · BUILD</span><h2>Build the direction, not the interface.</h2><p className="guided-step__lead">Forge will apply the directed camera and motion system only to scenes whose required production inputs are ready. Missing-asset scenes stay untouched.</p>
    <div className="guided-build-card"><span>READY TO BUILD</span><strong>{buildableCount} / {plan.sceneMoves.length} directed scenes</strong><p>{buildableCount ? "The ready scenes can receive their motion and camera strategy now." : "The direction is waiting on critical assets. Create or import those first."}</p></div>
    <div className="guided-actions"><Link href="/studio/agent">Review full Creative Agent plan</Link><button type="button" className="guided-primary" disabled={!buildableCount || !plan.validation.valid} onClick={onBuild}>Build what is ready →</button></div>
  </section>;
}

function ShipStep({ validIssues, blockedCount, planValid, ready }: { validIssues: number; blockedCount: number; planValid: boolean; ready: boolean }) {
  return <section className="guided-step">
    <span className="guided-build__eyebrow">05 · SHIP</span><h2>{ready ? "Ready for publishing review." : "One last production pass."}</h2><p className="guided-step__lead">Forge keeps the release decision simple: resolve project validation and critical asset blockers, then review publishing.</p>
    <div className="guided-ship-checks">
      <article className={validIssues ? "is-warn" : "is-good"}><span>PROJECT VALIDATION</span><strong>{validIssues ? `${validIssues} issue${validIssues === 1 ? "" : "s"}` : "Clear"}</strong></article>
      <article className={blockedCount ? "is-warn" : "is-good"}><span>ASSET BLOCKERS</span><strong>{blockedCount ? `${blockedCount} blocked scene${blockedCount === 1 ? "" : "s"}` : "Clear"}</strong></article>
      <article className={planValid ? "is-good" : "is-warn"}><span>DIRECTOR PLAN</span><strong>{planValid ? "Valid" : "Held"}</strong></article>
    </div>
    <div className="guided-actions">{blockedCount > 0 && <Link href="/studio?workspace=Assets&advanced=1">Resolve assets</Link>}<Link href="/studio">Open final preview</Link><Link className="guided-primary" href="/studio?workspace=Ship&advanced=1">Review publishing →</Link></div>
  </section>;
}

function mediumName(value: string) {
  if (value === "depth-image") return "Image → Depth";
  if (value === "real-3d") return "Real 3D";
  if (value === "hybrid") return "Hybrid 2.5D + 3D";
  return "Cinematic DOM";
}

function shortPath(value: string) {
  const parts = value.split("/");
  return parts[parts.length - 1] || value;
}

function assetCount(manifest: AssetManifest) {
  return manifest.models.length + manifest.textures.length + manifest.hdr.length + manifest.video.length;
}

function slug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64);
}
