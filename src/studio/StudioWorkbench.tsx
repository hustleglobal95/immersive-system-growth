"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import rawExperience from "@/config/experience.json";
import rawProject from "@/config/studio-project.json";
import rawAssetManifest from "@/config/asset-manifest.json";
import rawCreativeDirection from "@/config/creative-direction.json";
import rawInteractionGraph from "@/config/interaction-graph.json";
import { parseExperience } from "@/src/lib/configSchema";
import { parseInteractionGraph } from "@/src/lib/interactionGraph";
import { parseStudioProject } from "@/src/platform/studioSchema";
import { GlbInspectorPanel } from "@/src/studio/GlbInspectorPanel";
import { TimelineEditor } from "@/src/studio/TimelineEditor";
import { MaskLab } from "@/src/studio/MaskLab";
import { StudioLivePreview } from "@/src/studio/StudioLivePreview";
import { SceneDirector } from "@/src/studio/SceneDirector";
import { LayerEditor } from "@/src/studio/LayerEditor";
import { AssetManager } from "@/src/studio/AssetManager";
import { TemplateGallery } from "@/src/studio/TemplateGallery";
import { SequencerEditor } from "@/src/studio/SequencerEditor";
import { InteractionGraphEditor } from "@/src/studio/InteractionGraphEditor";
import type { AssetManifest } from "@/src/types/assets";
import { IntegrationsPanel, ProjectPanel, PublishPanel, TelemetryPanel } from "@/src/studio/ProjectPanels";
import { downloadJson, useStudioDraft } from "@/src/studio/useStudioDraft";
import { CreativeDirectionPanel } from "@/src/studio/CreativeDirectionPanel";
import { parseCreativeDirection } from "@/src/platform/creativeDirectionSchema";

const initialExperience = parseExperience(rawExperience);
const initialProject = parseStudioProject(rawProject);
const initialAssetManifest = rawAssetManifest as AssetManifest;
const initialInteractionGraph = parseInteractionGraph(rawInteractionGraph);
const initialCreativeDirection = parseCreativeDirection(rawCreativeDirection);
const tabs = ["project", "creative", "templates", "preview", "director", "timeline", "sequence", "interactions", "masks", "layers", "assets", "model", "integrations", "publish", "telemetry"] as const;
type Tab = (typeof tabs)[number];

export function StudioWorkbench() {
  const draft = useStudioDraft(initialExperience, initialProject, initialAssetManifest, initialInteractionGraph);
  const [tab, setTab] = useState<Tab>("project");
  const [creative, setCreative] = useState(initialCreativeDirection);
  const [activeScene, setActiveScene] = useState(0);
  const [notice, setNotice] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  const importExperience = async (file: File | undefined) => {
    if (!file) return;
    try {
      draft.setExperience(parseExperience(JSON.parse(await file.text())));
      setActiveScene(0);
      setNotice("Experience imported and validated.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The experience file is invalid.");
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  };

  return (
    <main className="studio-shell">
      <header className="studio-header">
        <div>
          <Link href="/" className="studio-brand">FORGE</Link>
          <span>IMMERSIVE PRODUCTION STUDIO</span>
        </div>
        <div className="studio-header__status" data-valid={!draft.validation.length}>
          <i />
          {draft.validation.length ? "Draft needs attention" : "Production schema valid"}
        </div>
        <div className="studio-actions">
          <input ref={importRef} hidden type="file" accept="application/json,.json" onChange={(event) => void importExperience(event.target.files?.[0])} />
          <button type="button" onClick={() => importRef.current?.click()}>Import</button>
          <button type="button" onClick={() => downloadJson("experience.json", draft.experience)}>Export experience</button>
          <button type="button" onClick={() => downloadJson("interaction-graph.json", draft.interactionGraph)}>Export interactions</button>
          <button type="button" onClick={() => downloadJson("studio-project.json", draft.project)}>Export project</button>
          <button type="button" onClick={() => downloadJson("asset-manifest.json", draft.assetManifest)}>Export assets</button>\n          <button type="button" onClick={() => downloadJson("creative-direction.json", creative)}>Export direction</button>
        </div>
      </header>

      <nav className="studio-tabs" aria-label="Studio areas">
        {tabs.map((item) => (
          <button key={item} type="button" aria-current={tab === item ? "page" : undefined} onClick={() => setTab(item)}>
            {item}
          </button>
        ))}
      </nav>

      <div className="studio-title">
        <div><span>{draft.project.id}</span><h1>{titleFor(tab)}</h1></div>
        <div>
          <button type="button" onClick={draft.reset}>Reset draft</button>
          <small>Changes save locally until exported.</small>
        </div>
      </div>

      {draft.validation.length > 0 && (
        <div className="studio-validation" role="alert">
          <strong>Validation</strong>
          {draft.validation.map((issue) => <p key={issue}>{issue}</p>)}
        </div>
      )}
      {notice && <p className="studio-message" role="status">{notice}</p>}

      {tab === "project" && <ProjectPanel {...draft} />}\n      {tab === "creative" && <CreativeDirectionPanel direction={creative} setDirection={setCreative} />}
      {tab === "templates" && <TemplateGallery experience={draft.experience} setExperience={draft.setExperience} />}
      {tab === "preview" && <StudioLivePreview experience={draft.experience} active={Math.min(activeScene, draft.experience.scenes.length - 1)} setActive={setActiveScene} />}
      {tab === "director" && <SceneDirector experience={draft.experience} setExperience={draft.setExperience} active={Math.min(activeScene, draft.experience.scenes.length - 1)} setActive={setActiveScene} />}
      {tab === "timeline" && <TimelineEditor experience={draft.experience} setExperience={draft.setExperience} active={Math.min(activeScene, draft.experience.scenes.length - 1)} setActive={setActiveScene} />}
      {tab === "sequence" && <SequencerEditor experience={draft.experience} setExperience={draft.setExperience} active={Math.min(activeScene, draft.experience.scenes.length - 1)} setActive={setActiveScene} beginGroup={draft.beginExperienceGroup} endGroup={draft.endExperienceGroup} undo={draft.undoExperience} redo={draft.redoExperience} canUndo={draft.canUndoExperience} canRedo={draft.canRedoExperience} />}
      {tab === "interactions" && <InteractionGraphEditor graph={draft.interactionGraph} setGraph={draft.setInteractionGraph} />}
      {tab === "masks" && <MaskLab experience={draft.experience} setExperience={draft.setExperience} active={Math.min(activeScene, draft.experience.scenes.length - 1)} setActive={setActiveScene} />}
      {tab === "layers" && <LayerEditor experience={draft.experience} setExperience={draft.setExperience} active={Math.min(activeScene, draft.experience.scenes.length - 1)} setActive={setActiveScene} />}
      {tab === "assets" && <AssetManager setExperience={draft.setExperience} assetManifest={draft.assetManifest} setAssetManifest={draft.setAssetManifest} active={Math.min(activeScene, draft.experience.scenes.length - 1)} />}
      {tab === "model" && <GlbInspectorPanel experience={draft.experience} setExperience={draft.setExperience} />}
      {tab === "integrations" && <IntegrationsPanel project={draft.project} setProject={draft.setProject} />}
      {tab === "publish" && <PublishPanel project={draft.project} setProject={draft.setProject} experience={draft.experience} assetManifest={draft.assetManifest} />}
      {tab === "telemetry" && <TelemetryPanel project={draft.project} setProject={draft.setProject} />}

      <footer className="studio-footer">
        <span>Forge Studio v6.0</span>
        <span>Live runtime / motion sequencer / interaction graph / review PR</span>
      </footer>
    </main>
  );
}

function titleFor(tab: Tab) {
  return {
    project: "Project control",\n    creative: "Creative direction",
    templates: "Industry template gallery",
    preview: "Live production preview",
    director: "Camera and art direction",
    timeline: "Visual timeline",
    sequence: "Motion sequencer",
    interactions: "Interaction graph",
    masks: "Mask reveal laboratory",
    layers: "Transition layer composer",
    assets: "Asset intake and budgets",
    model: "Model inspection",
    integrations: "Content connections",
    publish: "Release pipeline",
    telemetry: "Device performance",
  }[tab];
}
