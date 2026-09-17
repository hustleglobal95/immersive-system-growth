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
import type { AgentSceneAssetItem } from "@/src/studio/creativeAgentAssets";
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
  const hierarchyBlocked = report.hierarchy.blockers.length > 0;
  const selectedTerritory = report.treatment.territories.find((item) => item.id === report.treatment.selectedTerritoryId);
  const selectedBlocked = plan.sceneMoves.filter((move) => selectedScenes.includes(move.sceneIndex) && !move.assetPlan.canBuildNow).length;

  const tryAnother = () => {
    setVariation((value) => value + 1);
    setNotice("Director changed medium, camera grammar, scene strategy, hierarchy and asset requirements instead of restyling the same answer.");
  };

  const toggleScene = (sceneIndex: number) => {
    setSelectedScenes((current) => current.includes(sceneIndex)
      ? current.filter((index) => index !== sceneIndex)
      : [...current, sceneIndex]);
  };

  const applyPlan = () => {
    if (hierarchyBlocked) {
      setNotice(`Creative Agent held the patch because hierarchy is unresolved: ${report.hierarchy.blockers[0]}`);
      return;
    }
    if (!plan.validation.valid) {
      setNotice(`Creative Agent refused to apply an incomplete plan: ${plan.validation.errors[0] ?? "asset planning validation failed."}`);
      return;
    }
    if (!selectedScenes.length) {
      setNotice("Select at least one scene before applying the execution plan.");
      return;
    }
    draft.setExperience((current) => applyCreativeExecutionPlan(current, plan, selectedScenes));
    setNotice(`${plan.title} motion applied across ${selectedScenes.length} scene${selectedScenes.length === 1 ? "" : "s"}. ${selectedBlocked ? `${selectedBlocked} selected scene${selectedBlocked === 1 ? " remains" : "s remain"} asset-blocked and are not marked production-ready.` : "All selected scenes have a buildable asset path."} The change is reversible with Undo.`);
  };

  return <main className="creative-agent">
    <header className="creative-agent__topbar">
      <div><span>FORGE</span><strong>Creative Agent</strong><em>V4 · HIERARCHY AWARE</em></div>
      <nav><Link href="/studio">Studio</Link><Link href="/director/intelligence">Director Intelligence</Link></nav>
    </header>

    <section className="creative-agent__layout">
      <aside className="creative-agent__brief">
        <span className="creative-agent__eyebrow">EXECUTIVE CREATIVE DIRECTION</span>
        <h1>Describe the outcome. Director chooses the smartest production path.</h1>
        <p>Every scene must now pass both asset planning and hierarchy review: strategy, narrative, section importance, information, visual focus, interaction, motion/spatial attention and semantic accessibility.</p>

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
          <div><span>HIERARCHY</span><strong>{report.hierarchy.overallScore}/10</strong></div>
          <div><span>EXECUTION MEDIUM</span><strong>{plan.mediumLabel}</strong></div>
          <div><span>ASSET READY</span><strong>{plan.assetSummary.scenesBuildableNow.length}/{plan.sceneMoves.length} scenes</strong></div>
          <div><span>CREATE</span><strong>{plan.assetSummary.totalAssetsToCreate} required assets</strong></div>
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

        <section className="creative-agent__hierarchy">
          <header><div><span>HIERARCHY ENGINE</span><h3>Importance must propagate downward.</h3></div><strong>{report.hierarchy.overallScore}/10</strong></header>
          <div className="creative-agent__hierarchy-chain">{report.hierarchy.recommendedNarrative.map((item, index) => <span key={`${item}-${index}`}>{item}{index < report.hierarchy.recommendedNarrative.length - 1 ? " →" : ""}</span>)}</div>
          <div className="creative-agent__hierarchy-levels">
            {report.hierarchy.levels.map((level) => <article key={level.id} data-status={level.status}>
              <div><span>{level.label}</span><strong>{level.score}</strong></div>
              <p>{level.principle}</p>
              <small>DOMINANT</small><b>{level.dominant}</b>
              {level.issues[0] && <em>{level.issues[0].message} {level.issues[0].recommendation}</em>}
            </article>)}
          </div>
          <div className="creative-agent__attention-rule"><span>ATTENTION RULE</span><strong>{report.hierarchy.attentionRules[0]?.owner}</strong><p>{report.hierarchy.attentionRules[0]?.reason}</p></div>
          {hierarchyBlocked && <div className="creative-agent__validation"><strong>HIERARCHY HELD</strong>{report.hierarchy.blockers.map((blocker) => <p key={blocker}>{blocker}</p>)}</div>}
        </section>

        <section className="creative-agent__asset-summary">
          <header><span>MANDATORY ASSET PLAN</span><h3>What must exist for this idea to work</h3></header>
          <div className="creative-agent__asset-summary-grid">
            <article><span>CREATE FIRST</span><strong>{plan.assetSummary.highestLeverageAssetToCreateFirst ?? "No critical new asset"}</strong><p>Highest-leverage missing asset across the proposed scene arc.</p></article>
            <article><span>BUILDABLE NOW</span><strong>{plan.assetSummary.scenesBuildableNow.length}</strong><p>{plan.assetSummary.scenesBuildableNow.join(" · ") || "No proposed scene is buildable yet."}</p></article>
            <article className={plan.assetSummary.blockedScenes.length ? "is-blocked" : ""}><span>BLOCKED</span><strong>{plan.assetSummary.blockedScenes.length}</strong><p>{plan.assetSummary.blockedScenes.join(" · ") || "No critical asset blockers."}</p></article>
            <article><span>ASSET BURDEN</span><strong>{plan.assetSummary.totalAssetsToCreate} required</strong><p>{plan.assetSummary.totalExistingAssetsUsed} existing used · {plan.assetSummary.totalReusableAssets} additional reusable</p></article>
          </div>
          {!plan.validation.valid && <div className="creative-agent__validation"><strong>PLAN HELD</strong>{plan.validation.errors.map((error) => <p key={error}>{error}</p>)}</div>}
        </section>

        <section className="creative-agent__plan">
          <header>
            <div><span>EXECUTION PLAN</span><h3>Multi-scene direction + asset requirements</h3></div>
            <button type="button" onClick={() => setPreviewOpen((value) => !value)}>{previewOpen ? "Hide patch" : "Preview patch"}</button>
          </header>
          <div className="creative-agent__scene-list">
            {plan.sceneMoves.map((move) => <article key={`${move.sceneIndex}-${move.archetype}`} className={selectedScenes.includes(move.sceneIndex) ? "is-selected" : ""}>
              <label>
                <input type="checkbox" checked={selectedScenes.includes(move.sceneIndex)} onChange={() => toggleScene(move.sceneIndex)} />
                <span>{String(move.sceneIndex + 1).padStart(2, "0")}</span>
              </label>
              <div><small>{move.role.toUpperCase()} · {move.signatureRole.toUpperCase()}</small><strong>{move.label}</strong><p>{move.purpose}</p></div>
              <div><small>CAMERA + MOTION</small><strong>{move.archetype}</strong><p>{move.cameraStrategy}</p></div>
              <div className="creative-agent__scene-assets">
                <div className="creative-agent__scene-assets-head">
                  <div><small>EXECUTION</small><strong>{mediumName(move.assetPlan.executionMedium)}</strong></div>
                  <span className={move.assetPlan.canBuildNow ? "is-ready" : "is-blocked"}>{move.assetPlan.canBuildNow ? "BUILDABLE NOW" : "ASSET BLOCKED"}</span>
                </div>
                <div className="creative-agent__asset-columns">
                  <AssetNames title="USE EXISTING" values={move.assetPlan.existingAssets} empty="No registered asset required." />
                  <AssetNames title="REUSE" values={move.assetPlan.reusableAssets} empty="No additional reusable asset selected." />
                  <AssetItems title="CREATE" values={move.assetPlan.assetsToCreate} empty="No required new asset." />
                  <AssetItems title="OPTIONAL" values={move.assetPlan.optionalAssets} empty="No optional asset suggested." />
                </div>
                {move.assetPlan.blockers.length > 0 && <div className="creative-agent__blockers"><small>BLOCKERS</small>{move.assetPlan.blockers.map((blocker) => <p key={blocker}>{blocker}</p>)}</div>}
                <div className="creative-agent__production-notes"><small>PRODUCTION NOTES</small>{move.assetPlan.productionNotes.map((note) => <p key={note}>{note}</p>)}</div>
              </div>
            </article>)}
          </div>
          {previewOpen && <div className="creative-agent__patch">
            <span>PATCH PREVIEW · NOTHING CHANGES UNTIL YOU APPLY</span>
            {plan.patchSummary.map((line, index) => <code key={line} className={selectedScenes.includes(plan.sceneMoves[index]?.sceneIndex ?? -1) ? "" : "is-muted"}>{line}</code>)}
          </div>}
          <div className="creative-agent__apply-row">
            <div><strong>{selectedScenes.length} scene{selectedScenes.length === 1 ? "" : "s"} selected · {selectedBlocked} asset-blocked · {hierarchyBlocked ? "hierarchy held" : "hierarchy clear"}</strong><span>Missing assets are never faked as complete. Existing non-agent authored tracks are preserved.</span></div>
            <button className="creative-agent__apply" disabled={!plan.validation.valid || hierarchyBlocked} onClick={applyPlan}>Apply reversible plan</button>
          </div>
        </section>

        <div className="creative-agent__grid">
          <article>
            <span>ASSET STRATEGY</span>
            <h3>Every proposed scene must explain its production inputs.</h3>
            {plan.assetStrategy.map((item) => <p key={item}>{item}</p>)}
          </article>
          <article>
            <span>PRODUCTION ORDER</span>
            <h3>Build in leverage order.</h3>
            <ol>{plan.productionOrder.map((item) => <li key={item}>{item}</li>)}</ol>
          </article>
          <article>
            <span>CRITICAL MISSING ASSETS</span>
            <h3>{plan.assetSummary.criticalMissingAssets[0] ?? "No critical blocker"}</h3>
            {plan.assetSummary.criticalMissingAssets.length ? plan.assetSummary.criticalMissingAssets.map((item) => <p key={item}>{item}</p>) : <p>The current plan has no hero/signature-critical missing asset.</p>}
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

function AssetNames({ title, values, empty }: { title: string; values: string[]; empty: string }) {
  return <section><small>{title}</small>{values.length ? values.map((value) => <p key={value} title={value}>{shortPath(value)}</p>) : <p className="is-empty">{empty}</p>}</section>;
}

function AssetItems({ title, values, empty }: { title: string; values: AgentSceneAssetItem[]; empty: string }) {
  return <section><small>{title}</small>{values.length ? values.map((item) => <div className="creative-agent__asset-item" key={`${item.name}-${item.type}`}><strong>{item.name}</strong><span>{item.type} · {item.priority}</span><p>{item.reason}</p></div>) : <p className="is-empty">{empty}</p>}</section>;
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
    constraints: ["Protect mobile performance", "Prefer existing assets before inventing production cost", `Current project contains ${sceneCount} scenes and ${assetCount(manifest)} registered assets`, "Every proposed scene must include a complete asset strategy", "All applied Creative Agent changes must remain reversible"],
    existingAssets: [],
    references: [],
  };
}

function mediumName(value: string) {
  if (value === "depth-image") return "Image → Depth";
  if (value === "real-3d") return "Real 3D";
  if (value === "hybrid") return "Hybrid 2.5D + 3D";
  return "Cinematic DOM + selective WebGL";
}

function shortPath(value: string) {
  const parts = value.split("/");
  return parts[parts.length - 1] || value;
}

function assetCount(manifest: AssetManifest) {
  return manifest.models.length + manifest.textures.length + manifest.hdr.length + manifest.video.length;
}
