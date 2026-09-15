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
import { AssetBankPanel } from "@/src/studio/AssetBankPanel";
import { TemplateGallery } from "@/src/studio/TemplateGallery";
import { RecipeEditor } from "@/src/studio/RecipeEditor";
import { MotionComposer } from "@/src/studio/MotionComposer";
import { InteractionGraphEditor } from "@/src/studio/InteractionGraphEditor";
import type { AssetManifest } from "@/src/types/assets";
import { IntegrationsPanel, ProjectPanel, PublishPanel, TelemetryPanel } from "@/src/studio/ProjectPanels";
import { downloadJson, useStudioDraft } from "@/src/studio/useStudioDraft";
import { CreativeDirectionPanel } from "@/src/studio/CreativeDirectionPanel";
import { VisualSystemsPanel } from "@/src/studio/VisualSystemsPanel";
import { parseCreativeDirection } from "@/src/platform/creativeDirectionSchema";

const initialExperience = parseExperience(rawExperience);
const initialProject = parseStudioProject(rawProject);
const initialAssetManifest = rawAssetManifest as AssetManifest;
const initialInteractionGraph = parseInteractionGraph(rawInteractionGraph);
const initialCreativeDirection = parseCreativeDirection(rawCreativeDirection);

const workspaces = [
  { id: "create", label: "Create", tools: ["project", "creative", "visuals", "recipe", "templates", "preview", "director"] },
  { id: "motion", label: "Motion", tools: ["sequence", "timeline", "masks", "layers"] },
  { id: "interact", label: "Interact", tools: ["interactions"] },
  { id: "assets", label: "Assets", tools: ["assets", "bank", "model"] },
  { id: "ship", label: "Ship", tools: ["integrations", "publish", "telemetry"] },
] as const;

type Workspace = (typeof workspaces)[number]["id"];
type Tab = (typeof workspaces)[number]["tools"][number];

export function StudioWorkbench() {
  const draft = useStudioDraft(initialExperience, initialProject, initialAssetManifest, initialInteractionGraph);
  const [workspace, setWorkspace] = useState<Workspace>("create");
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

  const chooseWorkspace = (next: Workspace) => {
    setWorkspace(next);
    const firstTool = workspaces.find((item) => item.id === next)?.tools[0];
    if (firstTool) setTab(firstTool);
  };

  const currentWorkspace = workspaces.find((item) => item.id === workspace) ?? workspaces[0];

  return (
    <main className="studio-shell">
      <header className="studio-header studio-header--compact">
        <div className="studio-header__brandrow">
          <Link href="/" className="studio-brand">FORGE</Link>
          <span>STUDIO</span>
        </div>
        <div className="studio-header__status" data-valid={!draft.validation.length}>
          <i />
          {draft.validation.length ? "Needs attention" : "Ready"}
        </div>
        <div className="studio-actions studio-actions--compact">
          <input ref={importRef} hidden type="file" accept="application/json,.json" onChange={(event) => void importExperience(event.target.files?.[0])} />
          <details className="studio-menu">
            <summary>Project</summary>
            <div className="studio-menu__panel">
              <button type="button" onClick={() => importRef.current?.click()}>Import experience</button>
              <button type="button" onClick={draft.reset}>Reset draft</button>
            </div>
          </details>
          <details className="studio-menu">
            <summary>Export</summary>
            <div className="studio-menu__panel studio-menu__panel--right">
              <button type="button" onClick={() => downloadJson("experience.json", draft.experience)}>Experience</button>
              <button type="button" onClick={() => downloadJson("interaction-graph.json", draft.interactionGraph)}>Interactions</button>
              <button type="button" onClick={() => downloadJson("studio-project.json", draft.project)}>Project</button>
              <button type="button" onClick={() => downloadJson("asset-manifest.json", draft.assetManifest)}>Assets</button>
              <button type="button" onClick={() => downloadJson("creative-direction.json", creative)}>Direction</button>
            </div>
          </details>
        </div>
      </header>

      <nav className="studio-workspaces" aria-label="Studio workspaces">
        {workspaces.map((item) => (
          <button key={item.id} type="button" aria-current={workspace === item.id ? "page" : undefined} onClick={() => chooseWorkspace(item.id)}>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="studio-contextbar">
        <div className="studio-contextbar__title">
          <span>{draft.project.id}</span>
          <strong>{titleFor(tab)}</strong>
        </div>
        <label className="studio-tool-picker">
          <span>Tool</span>
          <select value={tab} onChange={(event) => setTab(event.target.value as Tab)}>
            {currentWorkspace.tools.map((tool) => <option key={tool} value={tool}>{labelFor(tool)}</option>)}
          </select>
        </label>
      </div>

      {draft.validation.length > 0 && (
        <details className="studio-validation studio-validation--compact" open>
          <summary>{draft.validation.length} validation issue{draft.validation.length === 1 ? "" : "s"}</summary>
          {draft.validation.map((issue) => <p key={issue}>{issue}</p>)}
        </details>
      )}
      {notice && <p className="studio-message" role="status">{notice}</p>}

      {tab === "project" && <ProjectPanel {...draft} />}
      {tab === "creative" && <CreativeDirectionPanel direction={creative} setDirection={setCreative} />}
      {tab === "visuals" && <VisualSystemsPanel />}
      {tab === "recipe" && <RecipeEditor experience={draft.experience} setExperience={draft.setExperience} active={Math.min(activeScene, draft.experience.scenes.length - 1)} setActive={setActiveScene} />}
      {tab === "templates" && <TemplateGallery experience={draft.experience} setExperience={draft.setExperience} />}
      {tab === "preview" && <StudioLivePreview experience={draft.experience} active={Math.min(activeScene, draft.experience.scenes.length - 1)} setActive={setActiveScene} />}
      {tab === "director" && <SceneDirector experience={draft.experience} setExperience={draft.setExperience} active={Math.min(activeScene, draft.experience.scenes.length - 1)} setActive={setActiveScene} />}
      {tab === "timeline" && <TimelineEditor experience={draft.experience} setExperience={draft.setExperience} active={Math.min(activeScene, draft.experience.scenes.length - 1)} setActive={setActiveScene} />}
      {tab === "sequence" && <MotionComposer experience={draft.experience} setExperience={draft.setExperience} active={Math.min(activeScene, draft.experience.scenes.length - 1)} setActive={setActiveScene} beginGroup={draft.beginExperienceGroup} endGroup={draft.endExperienceGroup} undo={draft.undoExperience} redo={draft.redoExperience} canUndo={draft.canUndoExperience} canRedo={draft.canRedoExperience} />}
      {tab === "interactions" && <InteractionGraphEditor graph={draft.interactionGraph} setGraph={draft.setInteractionGraph} />}
      {tab === "masks" && <MaskLab experience={draft.experience} setExperience={draft.setExperience} active={Math.min(activeScene, draft.experience.scenes.length - 1)} setActive={setActiveScene} />}
      {tab === "layers" && <LayerEditor experience={draft.experience} setExperience={draft.setExperience} active={Math.min(activeScene, draft.experience.scenes.length - 1)} setActive={setActiveScene} />}
      {tab === "assets" && <AssetManager setExperience={draft.setExperience} assetManifest={draft.assetManifest} setAssetManifest={draft.setAssetManifest} active={Math.min(activeScene, draft.experience.scenes.length - 1)} />}
      {tab === "bank" && <AssetBankPanel experience={draft.experience} setExperience={draft.setExperience} assetManifest={draft.assetManifest} setAssetManifest={draft.setAssetManifest} interactionGraph={draft.interactionGraph} undo={draft.undoExperience} canUndo={draft.canUndoExperience} />}
      {tab === "model" && <GlbInspectorPanel experience={draft.experience} setExperience={draft.setExperience} />}
      {tab === "integrations" && <IntegrationsPanel project={draft.project} setProject={draft.setProject} />}
      {tab === "publish" && <PublishPanel project={draft.project} setProject={draft.setProject} experience={draft.experience} assetManifest={draft.assetManifest} />}
      {tab === "telemetry" && <TelemetryPanel project={draft.project} setProject={draft.setProject} />}

      <footer className="studio-footer">
        <span>Forge Studio v7.0</span>
        <span>{currentWorkspace.label} workspace</span>
      </footer>
    </main>
  );
}

function labelFor(tab: Tab) {
  return {
    project: "Project",
    creative: "Creative direction",
    visuals: "Visual system",
    recipe: "Recipe",
    templates: "Templates",
    preview: "Preview",
    director: "Director",
    timeline: "Timeline",
    sequence: "Composer",
    interactions: "Interactions",
    masks: "Masks",
    layers: "Transitions",
    assets: "Asset intake",
    bank: "Asset bank",
    model: "Model inspector",
    integrations: "Integrations",
    publish: "Publish",
    telemetry: "Performance",
  }[tab];
}

function titleFor(tab: Tab) {
  return {
    project: "Project control",
    creative: "Creative direction",
    visuals: "Visual systems",
    recipe: "Recipe editor",
    templates: "Industry templates",
    preview: "Live preview",
    director: "Camera direction",
    timeline: "Scene timing",
    sequence: "Motion composer",
    interactions: "Interaction graph",
    masks: "Mask lab",
    layers: "Transition layers",
    assets: "Asset intake",
    bank: "Asset bank",
    model: "Model inspection",
    integrations: "Connections",
    publish: "Release",
    telemetry: "Performance",
  }[tab];
}