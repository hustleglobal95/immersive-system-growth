"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import rawExperience from "@/config/experience.json";
import rawProject from "@/config/studio-project.json";
import rawAssetManifest from "@/config/asset-manifest.json";
import rawInteractionGraph from "@/config/interaction-graph.json";
import { parseExperience } from "@/src/lib/configSchema";
import { parseInteractionGraph } from "@/src/lib/interactionGraph";
import { parseStudioProject } from "@/src/platform/studioSchema";
import { createMotionArchetype, motionArchetypeCatalog, type MotionArchetypeName } from "@/src/platform/motionArchetypes";
import { runDirectorIntelligence } from "@/src/platform/director-intelligence/orchestrator";
import { useStudioDraft } from "@/src/studio/useStudioDraft";
import type { AssetManifest } from "@/src/types/assets";
import type { DirectorBrief } from "@/src/platform/directorSchema";

const initialExperience = parseExperience(rawExperience);
const initialProject = parseStudioProject(rawProject);
const initialManifest = rawAssetManifest as AssetManifest;
const initialGraph = parseInteractionGraph(rawInteractionGraph);

const fallbackIdeas = [
  "Make this scene feel more cinematic without adding spectacle.",
  "Find the smartest way to turn the current assets into a signature hero moment.",
  "Rework this scene so the camera, motion and copy support one clear idea.",
  "Push the concept harder, but protect mobile performance and restraint.",
];

export function CreativeAgentWorkbench() {
  const draft = useStudioDraft(initialExperience, initialProject, initialManifest, initialGraph);
  const [idea, setIdea] = useState(fallbackIdeas[0]);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [variation, setVariation] = useState(0);
  const [notice, setNotice] = useState("");

  const scene = draft.experience.scenes[Math.min(sceneIndex, draft.experience.scenes.length - 1)];
  const archetype = chooseArchetype(idea, variation, Boolean(draft.experience.productRig?.nodes.length));
  const brief = useMemo(() => makeBrief(draft.project.name, idea, scene.label, draft.experience.scenes.length, draft.assetManifest), [draft.project.name, idea, scene.label, draft.experience.scenes.length, draft.assetManifest]);
  const intelligence = useMemo(() => runDirectorIntelligence({ brief }), [brief]);
  const report = intelligence.report;
  const selected = report.treatment.territories.find((item) => item.id === report.treatment.selectedTerritoryId);
  const motion = motionArchetypeCatalog.find((item) => item.id === archetype)!;

  const applyMotion = () => {
    const generated = createMotionArchetype(archetype, draft.experience, sceneIndex).map((track) => ({ ...track, id: `agent-${track.id}` }));
    draft.setExperience((current) => {
      const scenes = current.scenes.map((item, index) => index === sceneIndex
        ? { ...item, motionTracks: [...item.motionTracks.filter((track) => !track.id.startsWith("agent-")), ...generated] }
        : item);
      return parseExperience({ ...current, scenes });
    });
    setNotice(`${motion.label} applied to ${scene.label}. You can undo it or keep directing from Studio.`);
  };

  const tryAnother = () => {
    setVariation((value) => value + 1);
    setNotice("Director changed strategy instead of merely restyling the same answer.");
  };

  return <main className="creative-agent">
    <header className="creative-agent__topbar">
      <div><span>FORGE</span><strong>Creative Agent</strong></div>
      <nav><Link href="/studio">Studio</Link><Link href="/director/intelligence">Director Intelligence</Link></nav>
    </header>

    <section className="creative-agent__layout">
      <aside className="creative-agent__brief">
        <span className="creative-agent__eyebrow">EXECUTIVE CREATIVE DIRECTION</span>
        <h1>Tell Forge what you are trying to achieve.</h1>
        <p>The agent reads the active Forge project, challenges the idea, proposes an execution strategy, and can apply a reversible production move.</p>

        <label>Intent
          <textarea value={idea} onChange={(event) => { setIdea(event.target.value); setVariation(0); }} />
        </label>

        <label>Scene
          <select value={sceneIndex} onChange={(event) => setSceneIndex(Number(event.target.value))}>
            {draft.experience.scenes.map((item, index) => <option key={item.id} value={index}>{String(index + 1).padStart(2, "0")} · {item.label}</option>)}
          </select>
        </label>

        <div className="creative-agent__context">
          <span>Project<strong>{draft.project.name}</strong></span>
          <span>Scenes<strong>{draft.experience.scenes.length}</strong></span>
          <span>Assets<strong>{assetCount(draft.assetManifest)}</strong></span>
          <span>Rig nodes<strong>{draft.experience.productRig?.nodes.length ?? 0}</strong></span>
        </div>

        <button className="creative-agent__secondary" onClick={tryAnother}>Try a different strategy</button>
        <button className="creative-agent__secondary" disabled={!draft.canUndoExperience} onClick={() => { draft.undoExperience(); setNotice("Last Forge change undone."); }}>Undo last applied change</button>
        {notice && <p className="creative-agent__notice">{notice}</p>}
      </aside>

      <section className="creative-agent__stage">
        <div className="creative-agent__verdict">
          <div><span>DIRECTOR VERDICT</span><strong>{report.verdict}</strong></div>
          <div><span>CREATIVE CEILING</span><strong>{report.ceiling.current} → {report.ceiling.projected}</strong></div>
          <div><span>EVIDENCE</span><strong>{Math.round(report.evidence.confidence * 100)}%</strong></div>
        </div>

        <article className="creative-agent__hero">
          <span>RECOMMENDED TERRITORY</span>
          <h2>{selected?.name ?? "Directed execution"}</h2>
          <p>{report.treatment.thesis}</p>
        </article>

        <div className="creative-agent__grid">
          <article>
            <span>WHY THIS DIRECTION</span>
            <h3>Protect the idea before adding effects.</h3>
            <p>{report.selectedEvaluation.critiques.find((item) => item.role.toLowerCase().includes("executive"))?.concerns[0] ?? report.selectedEvaluation.critiques[0]?.strengths[0] ?? "The strongest direction is the one that concentrates attention instead of multiplying techniques."}</p>
          </article>
          <article>
            <span>PRODUCTION MOVE</span>
            <h3>{motion.label}</h3>
            <p>{motion.description}</p>
            <button className="creative-agent__apply" onClick={applyMotion}>Apply to {scene.label}</button>
          </article>
          <article>
            <span>HIGHEST LEVERAGE</span>
            <h3>{report.ceiling.highestLeverageUpgrades[0] ?? "Refine the signature moment"}</h3>
            <p>{report.leverage[0]?.reason ?? "Spend craft where the visitor will remember it, not evenly across the experience."}</p>
          </article>
          <article>
            <span>WHAT TO AVOID</span>
            <h3>{report.cliches.detected[0] ?? "Decorative complexity"}</h3>
            <p>{report.blockers[0] ?? "Do not add a technique unless it strengthens the thesis, the journey, or the product proof."}</p>
          </article>
        </div>

        <section className="creative-agent__council">
          <header><span>DIRECTOR COUNCIL</span><h3>Independent pressure test</h3></header>
          {report.selectedEvaluation.critiques.slice(0, 6).map((critique) => <article key={critique.role}>
            <strong>{critique.role}</strong>
            <span>{critique.recommendation}</span>
            <p>{critique.concerns[0] ?? critique.strengths[0] ?? "No material concern."}</p>
          </article>)}
        </section>
      </section>
    </section>
  </main>;
}

function chooseArchetype(idea: string, variation: number, hasRig: boolean): MotionArchetypeName {
  const lower = idea.toLowerCase();
  const ranked: MotionArchetypeName[] = lower.includes("product") || lower.includes("macro")
    ? ["product-hero", "editorial-reveal", "parallax-story", "threshold-passage", "architectural-build"]
    : lower.includes("architecture") || lower.includes("building") || hasRig
      ? ["architectural-build", "threshold-passage", "parallax-story", "editorial-reveal", "product-hero"]
      : lower.includes("enter") || lower.includes("journey") || lower.includes("through")
        ? ["threshold-passage", "parallax-story", "editorial-reveal", "product-hero", "architectural-build"]
        : lower.includes("depth") || lower.includes("parallax") || lower.includes("image")
          ? ["parallax-story", "editorial-reveal", "threshold-passage", "product-hero", "architectural-build"]
          : ["editorial-reveal", "parallax-story", "threshold-passage", "product-hero", "architectural-build"];
  return ranked[variation % ranked.length];
}

function makeBrief(projectName: string, idea: string, sceneLabel: string, sceneCount: number, manifest: AssetManifest): DirectorBrief {
  return {
    projectName,
    projectType: "brand",
    tier: "flagship",
    client: projectName,
    audience: "A design-aware visitor who should understand the idea immediately and remember one signature experience.",
    objective: idea,
    primaryAction: "Continue exploring",
    brandTruth: `The active Forge project should express one clear creative thesis through ${sceneLabel}, not accumulate effects for their own sake.`,
    differentiators: ["Cinematic direction", "Purposeful interaction", "High craft-to-complexity ratio"],
    constraints: ["Protect mobile performance", "Prefer existing assets before inventing production cost", `Current project contains ${sceneCount} scenes and ${assetCount(manifest)} registered assets`, "All applied changes must remain reversible"],
    existingAssets: [],
    references: [],
  };
}

function assetCount(manifest: AssetManifest) {
  return manifest.models.length + manifest.textures.length + manifest.hdr.length + manifest.video.length;
}
