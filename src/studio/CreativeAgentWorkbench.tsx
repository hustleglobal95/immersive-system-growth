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
import { runDirectorIntelligence } from "@/src/platform/director-intelligence/orchestrator";
import { applyCreativeExecutionPlan, planCreativeExecution } from "@/src/studio/creativeAgentPlan";
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
  "Rework the experience so camera, motion, assets and copy support one clear idea.",
  "Push the concept harder, but protect mobile performance and restraint.",
];

export function CreativeAgentWorkbench() {
  const draft = useStudioDraft(initialExperience, initialProject, initialManifest, initialGraph);
  const [idea, setIdea] = useState(fallbackIdeas[0]);
  const [variation, setVariation] = useState(0);
  const [notice, setNotice] = useState("");
  const [previewOpen, setPreviewOpen] = useState(true);

  const plan = useMemo(() => planCreativeExecution({
    idea,
    experience: draft.experience,
    manifest: draft.assetManifest,
    variation,
  }), [idea, draft.experience, draft.assetManifest, variation]);

  const [selectedScenes, setSelectedScenes] = useState<number[]>([]);
  useEffect(() => {
    setSelectedScenes(plan.sceneMoves.map((move) => move.sceneIndex));
  }, [plan.title, plan.sceneMoves.length]);

  const brief = useMemo(
    () => makeBrief(draft.project.name, idea, draft.experience.scenes.length, draft.assetManifest, plan.mediumLabel, plan.signatureMoment),
    [draft.project.name, idea, draft.experience.scenes.length, draft.assetManifest, plan.mediumLabel, plan.signatureMoment],
  );
  const intelligence = useMemo(() => runDirectorIntelligence({ brief }), [brief]);
  const report = intelligence.report;
  const selectedTerritory = report.treatment.territories.find((item) => item.id === report.treatment.selectedTerritoryId);

  const tryAnother = () => {
    setVariation((value) => value + 1);
    setNotice("Director changed medium, camera grammar or scene strategy instead of restyling the same answer.");
  };

  const toggleScene = (sceneIndex: number) => {
    setSelectedScenes((current) => current.includes(sceneIndex)
      ? current.filter((index) => index !== sceneIndex)
      : [...current, sceneIndex]);
  };

  const applyPlan = () => {
    if (!selectedScenes.length) {
      setNotice("Select at least one scene before applying the execution plan.");
      return;
    }
    draft.setExperience((current) => applyCreativeExecutionPlan(current, plan, selectedScenes));
    setNotice(`${plan.title} applied across ${selectedScenes.length} scene${selectedScenes.length === 1 ? "" : "s"}. The complete change is reversible with Undo.`);
  };

  return <main className="creative-agent">
    <header className="creative-agent__topbar">
      <div><span>FORGE</span><strong>Creative Agent</strong><em>V2</em></div>
      <nav><Link href="/studio">Studio</Link><Link href="/director/intelligence">Director Intelligence</Link></nav>
    </header>

    <section className="creative-agent__layout">
      <aside className="creative-agent__brief">
        <span className="creative-agent__eyebrow">EXECUTIVE CREATIVE DIRECTION</span>
        <h1>Describe the outcome. Director chooses the smartest production path.</h1>
        <p>The agent reads the active Forge project, challenges the idea, chooses the right medium, lays out a multi-scene camera and motion strategy, and previews a reversible patch before changing the project.</p>

        <label>Creative intent
          <textarea value={idea} onChange={(event) => { setIdea(event.target.value); setVariation(0); }} />
        </label>

        <div className="creative-agent__context">
          <span>Project<strong>{draft.project.name}</strong></span>
          <span>Scenes<strong>{draft.experience.scenes.length}</strong></span>
          <span>Assets<strong>{assetCount(draft.assetManifest)}</strong></span>
          <span>Rig nodes<strong>{draft.experience.productRig?.nodes.length ?? 0}</strong></span>
        </div>

        <button className="creative-agent__secondary" onClick={tryAnother}>Generate a different execution strategy</button>
        <button className="creative-agent__secondary" disabled={!draft.canUndoExperience} onClick={() => { draft.undoExperience(); setNotice("Last Creative Agent patch undone."); }}>Undo last applied change</button>
        {notice && <p className="creative-agent__notice">{notice}</p>}
      </aside>

      <section className="creative-agent__stage">
        <div className="creative-agent__verdict">
          <div><span>DIRECTOR VERDICT</span><strong>{report.verdict}</strong></div>
          <div><span>EXECUTION MEDIUM</span><strong>{plan.mediumLabel}</strong></div>
          <div><span>CREATIVE CEILING</span><strong>{report.ceiling.current} → {report.ceiling.projected}</strong></div>
          <div><span>EVIDENCE</span><strong>{Math.round(report.evidence.confidence * 100)}%</strong></div>
        </div>

        <article className="creative-agent__hero">
          <span>{selectedTerritory?.name ?? "DIRECTED EXECUTION"}</span>
          <h2>{plan.title}</h2>
          <p>{plan.thesis}</p>
        </article>

        <section className="creative-agent__decision">
          <div>
            <span>MEDIUM DECISION</span>
            <h3>{plan.mediumLabel}</h3>
            <p>{plan.mediumReason}</p>
          </div>
          <div>
            <span>SIGNATURE MOMENT</span>
            <h3>Spend the craft here.</h3>
            <p>{plan.signatureMoment}</p>
          </div>
        </section>

        <section className="creative-agent__plan">
          <header>
            <div><span>EXECUTION PLAN</span><h3>Multi-scene direction</h3></div>
            <button type="button" onClick={() => setPreviewOpen((value) => !value)}>{previewOpen ? "Hide patch" : "Preview patch"}</button>
          </header>
          <div className="creative-agent__scene-list">
            {plan.sceneMoves.map((move) => <article key={`${move.sceneIndex}-${move.archetype}`} className={selectedScenes.includes(move.sceneIndex) ? "is-selected" : ""}>
              <label>
                <input type="checkbox" checked={selectedScenes.includes(move.sceneIndex)} onChange={() => toggleScene(move.sceneIndex)} />
                <span>{String(move.sceneIndex + 1).padStart(2, "0")}</span>
              </label>
              <div><small>{move.role.toUpperCase()}</small><strong>{move.label}</strong><p>{move.purpose}</p></div>
              <div><small>CAMERA + MOTION</small><strong>{move.archetype}</strong><p>{move.cameraStrategy}</p></div>
            </article>)}
          </div>
          {previewOpen && <div className="creative-agent__patch">
            <span>PATCH PREVIEW · NOTHING CHANGES UNTIL YOU APPLY</span>
            {plan.patchSummary.map((line, index) => <code key={line} className={selectedScenes.includes(plan.sceneMoves[index]?.sceneIndex ?? -1) ? "" : "is-muted"}>{line}</code>)}
          </div>}
          <div className="creative-agent__apply-row">
            <div><strong>{selectedScenes.length} scene{selectedScenes.length === 1 ? "" : "s"} selected</strong><span>Existing non-agent authored tracks are preserved.</span></div>
            <button className="creative-agent__apply" onClick={applyPlan}>Apply reversible plan</button>
          </div>
        </section>

        <div className="creative-agent__grid">
          <article>
            <span>ASSET STRATEGY</span>
            <h3>Use the minimum asset set that proves the idea.</h3>
            {plan.assetStrategy.map((item) => <p key={item}>{item}</p>)}
          </article>
          <article>
            <span>PRODUCTION ORDER</span>
            <h3>Build in leverage order.</h3>
            <ol>{plan.productionOrder.map((item) => <li key={item}>{item}</li>)}</ol>
          </article>
          <article>
            <span>HIGHEST LEVERAGE</span>
            <h3>{report.ceiling.highestLeverageUpgrades[0] ?? "Refine the signature moment"}</h3>
            <p>{report.leverage[0]?.reason ?? "Spend craft where the visitor will remember it, not evenly across the experience."}</p>
          </article>
          <article>
            <span>RISKS / WHAT TO AVOID</span>
            <h3>{report.cliches.detected[0] ?? "Decorative complexity"}</h3>
            {plan.risks.map((risk) => <p key={risk}>{risk}</p>)}
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

function makeBrief(projectName: string, idea: string, sceneCount: number, manifest: AssetManifest, medium: string, signature: string): DirectorBrief {
  return {
    projectName,
    projectType: "brand",
    tier: "flagship",
    client: projectName,
    audience: "A design-aware visitor who should understand the idea immediately and remember one signature experience.",
    objective: idea,
    primaryAction: "Continue exploring",
    brandTruth: `The active Forge project should express one clear creative thesis. The current execution candidate is ${medium}, with the signature moment defined as: ${signature}`,
    differentiators: ["Cinematic direction", "Purposeful interaction", "High craft-to-complexity ratio"],
    constraints: ["Protect mobile performance", "Prefer existing assets before inventing production cost", `Current project contains ${sceneCount} scenes and ${assetCount(manifest)} registered assets`, "All applied Creative Agent changes must remain reversible"],
    existingAssets: [],
    references: [],
  };
}

function assetCount(manifest: AssetManifest) {
  return manifest.models.length + manifest.textures.length + manifest.hdr.length + manifest.video.length;
}
