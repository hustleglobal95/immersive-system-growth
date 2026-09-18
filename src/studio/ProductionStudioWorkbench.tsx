"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { readStored, useClientValue } from "@/src/lib/useClientValue";
import rawExperience from "@/config/experience.json";
import rawProject from "@/config/studio-project.json";
import rawAssetManifest from "@/config/asset-manifest.json";
import rawInteractionGraph from "@/config/interaction-graph.json";
import { parseExperience } from "@/src/lib/configSchema";
import { parseInteractionGraph } from "@/src/lib/interactionGraph";
import { parseStudioProject } from "@/src/platform/studioSchema";
import { emptyInteractionGraph } from "@/src/platform/emptyInteractionGraph";
import { createMotionArchetype, motionArchetypeCatalog, type MotionArchetypeName } from "@/src/platform/motionArchetypes";
import { StudioLivePreview } from "@/src/studio/StudioLivePreview";
import { SequencerEditor } from "@/src/studio/SequencerEditor";
import { InteractionGraphEditor } from "@/src/studio/InteractionGraphEditor";
import { AssetManager } from "@/src/studio/AssetManager";
import { AssetBankPanel } from "@/src/studio/AssetBankPanel";
import { GlbInspectorPanel } from "@/src/studio/GlbInspectorPanel";
import { PublishPanel, TelemetryPanel } from "@/src/studio/ProjectPanels";
import { downloadJson, useStudioDraft } from "@/src/studio/useStudioDraft";
import { STUDIO_GUIDE_BRIEF_KEY, StudioWorkflowGuide } from "@/src/studio/StudioWorkflowGuide";
import type { AssetManifest } from "@/src/types/assets";
import type { ExperienceConfig, MotionTrack, SceneDefinition, Vec3 } from "@/src/types/experience";

const initialExperience = parseExperience(rawExperience);
const initialProject = parseStudioProject(rawProject);
const initialManifest = rawAssetManifest as AssetManifest;
const initialGraph = parseInteractionGraph(rawInteractionGraph);

const workspaces = ["Create", "Motion", "Interact", "Assets", "Ship"] as const;
type Workspace = (typeof workspaces)[number];
type LeftMode = "Scenes" | "Structure" | "Assets";
type Selection =
  | { kind: "scene"; index: number }
  | { kind: "camera"; index: number }
  | { kind: "node"; index: number; name: string }
  | { kind: "asset"; index: number }
  | { kind: "environment"; index: number };

type ProjectKind = "real-estate" | "product" | "hospitality" | "automotive" | "fashion" | "custom";

export function ProductionStudioWorkbench() {
  const draft = useStudioDraft(initialExperience, initialProject, initialManifest, initialGraph);
  const [workspace, setWorkspace] = useState<Workspace>("Create");
  const [leftMode, setLeftMode] = useState<LeftMode>("Scenes");
  const [activeScene, setActiveScene] = useState(0);
  const [selection, setSelection] = useState<Selection>({ kind: "scene", index: 0 });
  const [archetype, setArchetype] = useState<MotionArchetypeName>("editorial-reveal");
  const [advanced, setAdvanced] = useState(false);
  const [notice, setNotice] = useState("");
  const [command, setCommand] = useState("");
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newName, setNewName] = useState("Untitled Experience");
  const [newKind, setNewKind] = useState<ProjectKind>("custom");
  const [guidedOpen, setGuidedOpen] = useState(false);
  const [guideDismissed, setGuideDismissed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const sceneIndex = Math.min(activeScene, draft.experience.scenes.length - 1);
  const scene = draft.experience.scenes[sceneIndex];
  const rigNodes = draft.experience.productRig?.nodes ?? [];
  const selectionLabel = useMemo(() => labelForSelection(selection, draft.experience), [selection, draft.experience]);
  const guideBrief = useClientValue(() => readStored(STUDIO_GUIDE_BRIEF_KEY), "");
  const guideSeen = useClientValue(() => readStored("forge-studio-guided-first-run-v1"), "");
  const workflow = useMemo(() => {
    const assetCount = draft.assetManifest.models.length + draft.assetManifest.textures.length + draft.assetManifest.hdr.length + draft.assetManifest.video.length;
    const motionCount = draft.experience.scenes.reduce((total, item) => total + item.motionTracks.length, 0);
    const customStructure = draft.experience.scenes.length > 1 || draft.experience.scenes[0]?.label !== "Opening Scene";
    const ideaDone = guideBrief.trim().length >= 12;
    const assetsDone = assetCount > 0;
    const motionDone = motionCount > 0;
    const reviewDone = draft.validation.length === 0 && ideaDone && customStructure && motionDone;
    const completed = [ideaDone, assetsDone, customStructure, motionDone, reviewDone].filter(Boolean).length;
    const nextLabel = !ideaDone ? "Describe the experience" : !assetsDone ? "Create or import the hero assets" : !customStructure ? "Shape the scene journey" : !motionDone ? "Direct the movement" : !reviewDone ? "Resolve review issues" : "Review and publish";
    const unconfigured = draft.experience.scenes.length === 1 && assetCount === 0 && motionCount === 0 && !draft.experience.heroModel && !draft.experience.scenes[0]?.media;
    return { completed, nextLabel, unconfigured };
  }, [draft.assetManifest, draft.experience, draft.validation.length, guideBrief]);
  const guideVisible = guidedOpen || (!guideDismissed && draft.hydrated && !guideSeen && workflow.unconfigured);
  const closeGuide = () => {
    setGuidedOpen(false);
    setGuideDismissed(true);
    try { window.localStorage.setItem("forge-studio-guided-first-run-v1", "seen"); } catch { /* storage can be blocked */ }
  };

  const selectScene = (index: number) => {
    setActiveScene(index);
    setSelection({ kind: "scene", index });
    setAdvanced(false);
  };

  // Scene changes inside a full workspace (sequencer scrubbing, playback) keep that workspace open.
  const selectSceneInWorkspace = (index: number) => {
    setActiveScene(index);
    setSelection({ kind: "scene", index });
  };

  // The cockpit is the Create screen; its advanced controls live in the Motion workspace tab.
  const openAdvanced = () => {
    setWorkspace((current) => (current === "Create" ? "Motion" : current));
    setAdvanced(true);
  };

  const applyArchetype = (name = archetype) => {
    const created = createMotionArchetype(name, draft.experience, sceneIndex);
    const authored = scene.motionTracks.filter((track) => !track.id.startsWith("studio-auto-"));
    const occupied = new Set(authored.map((track) => `${track.viewport}:${track.target}`));
    const additions = created
      .filter((track) => !occupied.has(`${track.viewport}:${track.target}`))
      .map((track) => namespaceTrack(track, `studio-auto-${name}`));
    updateScene(draft.setExperience, sceneIndex, (current) => ({ ...current, motionTracks: [...authored, ...additions] }));
    setNotice(`${motionArchetypeCatalog.find((item) => item.id === name)?.label ?? name} applied to ${scene.label}.`);
  };

  const buildSelectedNode = (node: string) => {
    const id = slug(node);
    const tracks: MotionTrack[] = [
      {
        id: `studio-node-${id}-position`, label: `${node} build`, type: "vector", target: `rig:${node}:position`, blend: "offset", viewport: "all", muted: false, locked: false,
        keyframes: [
          { id: `${id}-p0`, at: 0, value: [0, -0.7, 0] as Vec3, easing: "linear" },
          { id: `${id}-p1`, at: 0.2, value: [0, -0.7, 0] as Vec3, easing: "linear" },
          { id: `${id}-p2`, at: 0.72, value: [0, 0, 0] as Vec3, easing: "cubic", curve: [0.16, 1, 0.3, 1] },
          { id: `${id}-p3`, at: 1, value: [0, 0, 0] as Vec3, easing: "linear" },
        ],
      },
      {
        id: `studio-node-${id}-opacity`, label: `${node} reveal`, type: "number", target: `rig:${node}:opacity`, blend: "absolute", viewport: "all", muted: false, locked: false,
        keyframes: [
          { id: `${id}-o0`, at: 0, value: 0, easing: "linear" },
          { id: `${id}-o1`, at: 0.2, value: 0, easing: "linear" },
          { id: `${id}-o2`, at: 0.56, value: 1, easing: "cubic", curve: [0.16, 1, 0.3, 1] },
          { id: `${id}-o3`, at: 1, value: 1, easing: "linear" },
        ],
      },
    ];
    updateScene(draft.setExperience, sceneIndex, (current) => {
      const targets = new Set(tracks.map((track) => track.target));
      return { ...current, motionTracks: [...current.motionTracks.filter((track) => !targets.has(track.target)), ...tracks] };
    });
    setNotice(`${node} now has a reversible build + reveal motion.`);
  };

  const resetSceneMotion = () => {
    updateScene(draft.setExperience, sceneIndex, (current) => ({ ...current, motionTracks: [] }));
    setNotice(`Motion cleared from ${scene.label}.`);
  };

  const addScene = () => {
    draft.setExperience((current) => {
      const source = current.scenes[Math.min(sceneIndex, current.scenes.length - 1)];
      const next = structuredClone(source);
      const index = current.scenes.length;
      next.id = uniqueSceneId(current, `scene-${index + 1}`);
      next.label = `Scene ${index + 1}`;
      next.copy = { ...next.copy, eyebrow: `${String(index + 1).padStart(2, "0")} / NEW SCENE`, headline: "Direct this moment.", body: "Define the purpose, camera, motion and interaction for this scene." };
      next.motionTracks = [];
      next.blocks = [];
      const scenes = normalizeRanges([...current.scenes, next]);
      return parseExperience({ ...current, scenes });
    });
    const nextIndex = draft.experience.scenes.length;
    queueMicrotask(() => selectScene(nextIndex));
    setNotice("New scene created from the active scene's valid production structure.");
  };

  const duplicateScene = () => {
    draft.setExperience((current) => {
      const copy = structuredClone(current.scenes[sceneIndex]);
      copy.id = uniqueSceneId(current, `${copy.id}-copy`);
      copy.label = `${copy.label} Copy`;
      const scenes = [...current.scenes];
      scenes.splice(sceneIndex + 1, 0, copy);
      return parseExperience({ ...current, scenes: normalizeRanges(scenes) });
    });
    queueMicrotask(() => selectScene(sceneIndex + 1));
    setNotice("Scene duplicated with its camera, materials and motion intact.");
  };

  const deleteScene = () => {
    if (draft.experience.scenes.length <= 1) { setNotice("A Forge experience must keep at least one scene."); return; }
    draft.setExperience((current) => {
      // Drop hotspots and scene-scoped asset references that point at the removed scene so the result still validates.
      const removed = current.scenes[sceneIndex]?.id;
      const assets = current.assets.flatMap((asset) => {
        if (asset.kind === "video" && asset.sceneId === removed) return [];
        const scenes = asset.scenes?.filter((id) => id !== removed);
        if (asset.scenes && !scenes?.length) return [];
        const next = { ...asset, ...(asset.scenes ? { scenes } : {}) };
        if (next.kind === "model" && next.animation?.sceneId === removed) delete next.animation;
        return [next];
      });
      return parseExperience({ ...current, scenes: normalizeRanges(current.scenes.filter((_, index) => index !== sceneIndex)), hotspots: current.hotspots.filter((hotspot) => hotspot.sceneId !== removed), assets });
    });
    const next = Math.max(0, sceneIndex - 1);
    setActiveScene(next);
    setSelection({ kind: "scene", index: next });
    setNotice("Scene deleted and timeline ranges rebalanced.");
  };

  const moveScene = (direction: -1 | 1) => {
    const target = sceneIndex + direction;
    if (target < 0 || target >= draft.experience.scenes.length) return;
    draft.setExperience((current) => {
      const scenes = [...current.scenes];
      [scenes[sceneIndex], scenes[target]] = [scenes[target], scenes[sceneIndex]];
      return parseExperience({ ...current, scenes: normalizeRanges(scenes) });
    });
    setActiveScene(target);
    setSelection({ kind: "scene", index: target });
  };

  const startProject = (name: string, kind: ProjectKind) => {
    const id = slug(name) || "untitled-experience";
    const starter = makeStarterExperience(draft.experience, name, kind);
    draft.setExperience(starter);
    draft.setProject((current) => ({ ...current, id, name, deployment: { ...current.deployment, projectName: id } }));
    draft.setInteractionGraph(emptyInteractionGraph(id));
    setActiveScene(0);
    setSelection({ kind: "scene", index: 0 });
    setWorkspace("Create");
    setAdvanced(false);
    setNewProjectOpen(false);
    setNotice(`${name} created from zero with a valid Forge runtime and starter scene.`);
  };
  const createProject = () => startProject(newName, newKind);

  // Opened from the Forge workspace: /studio?new=<name>&kind=<kind> or /studio?open=<project>.
  // Studio stays covered until the requested project is loaded, so a previous project never flashes.
  const [booting, setBooting] = useState(true);
  const bootHandled = useRef(false);
  useEffect(() => {
    if (!draft.hydrated || bootHandled.current) return;
    bootHandled.current = true;
    const params = new URLSearchParams(window.location.search);
    const newName = params.get("new")?.trim();
    const open = params.get("open");
    const clearUrl = () => window.history.replaceState(null, "", "/studio");
    const kinds: ProjectKind[] = ["real-estate", "product", "hospitality", "automotive", "fashion", "custom"];
    if (newName) {
      const kind = kinds.find((item) => item === params.get("kind")) ?? "custom";
      void Promise.resolve().then(() => { startProject(newName.slice(0, 80), kind); clearUrl(); setBooting(false); });
    } else if (open && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(open)) {
      void fetch(`/api/forge/projects/${open}`, { cache: "no-store" })
        .then(async (response) => {
          const payload = await response.json();
          if (!response.ok) throw new Error(payload.error ?? "Project could not be opened.");
          draft.setExperience(parseExperience(payload.experience));
          draft.setProject(parseStudioProject(payload.project));
          draft.setInteractionGraph(parseInteractionGraph(payload.interactionGraph));
          setActiveScene(0);
          setSelection({ kind: "scene", index: 0 });
          setWorkspace("Create");
          setAdvanced(false);
          setNotice(`${payload.project.name} opened.`);
        })
        .catch((error: unknown) => setNotice(error instanceof Error ? error.message : "Project could not be opened."))
        .finally(() => { clearUrl(); setBooting(false); });
    } else {
      void Promise.resolve().then(() => setBooting(false));
    }
    // Runs once after the saved draft hydrates; later renders must not re-open the project.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.hydrated]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = Boolean(target?.matches("input, textarea, select, [contenteditable='true']"));
      const commandShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      const slashShortcut = event.key === "/" && !typing && !event.metaKey && !event.ctrlKey && !event.altKey;
      if (commandShortcut || slashShortcut) {
        event.preventDefault();
        setCommandPaletteOpen(true);
      } else if (event.key === "Escape") {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const importExperience = async (file?: File) => {
    if (!file) return;
    try {
      const next = parseExperience(JSON.parse(await file.text()));
      draft.setExperience(next);
      setActiveScene(0);
      setSelection({ kind: "scene", index: 0 });
      setNotice(`${file.name} imported and validated.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Import failed validation.");
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  };

  const runCommandValue = (input: string) => {
    const value = input.trim().toLowerCase();
    if (!value) return;
    if (value.includes("guided")) setGuidedOpen(true);
    else if (value.includes("creative agent")) window.location.assign("/studio/agent");
    else if (value === "director" || value.includes("open director")) window.location.assign("/director");
    else if (value.includes("asset creator") || value.includes("create asset")) window.location.assign("/studio/assets/create");
    else if (value.includes("new project")) setNewProjectOpen(true);
    else if (value.includes("ship") || value.includes("publish") || value.includes("review release")) { setWorkspace("Ship"); setAdvanced(true); }
    else if (value.includes("interact")) { setWorkspace("Interact"); setAdvanced(true); }
    else if (value === "assets" || value.includes("asset workspace")) { setWorkspace("Assets"); setAdvanced(true); }
    else if (value === "motion" || value.includes("motion workspace")) { setWorkspace("Motion"); setAdvanced(true); }
    else if (value === "create" || value.includes("create workspace")) { setWorkspace("Create"); setAdvanced(false); }
    else if (value.includes("architect") || value.includes("build")) { setArchetype("architectural-build"); applyArchetype("architectural-build"); }
    else if (value.includes("product") || value.includes("macro")) { setArchetype("product-hero"); applyArchetype("product-hero"); }
    else if (value.includes("parallax")) { setArchetype("parallax-story"); applyArchetype("parallax-story"); }
    else if (value.includes("threshold") || value.includes("enter")) { setArchetype("threshold-passage"); applyArchetype("threshold-passage"); }
    else if (value.includes("editorial") || value.includes("reveal")) { setArchetype("editorial-reveal"); applyArchetype("editorial-reveal"); }
    else if (value.includes("new scene") || value.includes("add scene")) addScene();
    else if (value.includes("duplicate")) duplicateScene();
    else if (value.includes("clear motion") || value.includes("reset motion")) resetSceneMotion();
    else setNotice("Command not matched. Try Guided Build, Creative Agent, Ship, architectural build, product hero, add scene, or reset motion.");
    setCommand("");
    setCommandPaletteOpen(false);
  };
  const runCommand = () => runCommandValue(command);

  return (
    <main className="production-studio">
      <h1 className="production-sr-only">Forge Studio — {draft.project.name}</h1>
      {booting && <div className="production-boot" role="status" aria-live="polite">Loading workspace…</div>}
      {guideVisible && <StudioWorkflowGuide
        project={draft.project}
        experience={draft.experience}
        manifest={draft.assetManifest}
        validationCount={draft.validation.length}
        onClose={closeGuide}
        onNewProject={() => { closeGuide(); setNewProjectOpen(true); }}
        onOpenCreate={() => { closeGuide(); setWorkspace("Create"); setAdvanced(false); }}
        onOpenAssets={() => { closeGuide(); setWorkspace("Assets"); setAdvanced(true); }}
        onOpenMotion={() => { closeGuide(); setWorkspace("Motion"); setAdvanced(true); }}
        onOpenShip={() => { closeGuide(); setWorkspace("Ship"); setAdvanced(true); }}
      />}
      <header className="production-topbar">
        <div className="production-brand"><Link href="/forge">FORGE</Link><span>STUDIO</span></div>
        <nav aria-label="Production workspaces">
          {workspaces.map((item) => <button key={item} type="button" aria-current={workspace === item ? "page" : undefined} onClick={() => { setWorkspace(item); setAdvanced(item !== "Create"); }}>{item}</button>)}
        </nav>
        <div className="production-top-actions">
          <button type="button" className="production-guided-button" onClick={() => setGuidedOpen(true)}><span>Guided Build</span><strong>{workflow.completed}/6</strong></button>
          <span className="production-status" data-valid={!draft.validation.length}><i />{draft.validation.length ? `${draft.validation.length} issue` : "Ready"}</span>
          <details className="production-assist"><summary>Assist</summary><div><Link href="/studio/agent"><strong>Creative Agent</strong><span>Turn the idea into a production strategy.</span></Link><Link href="/director"><strong>Director</strong><span>Critique and strengthen the creative direction.</span></Link><Link href="/studio/assets/create"><strong>Asset Creator</strong><span>Create a missing image, video or 3D asset.</span></Link></div></details>
          <details><summary>Project</summary><div><button type="button" onClick={() => setNewProjectOpen(true)}>New project</button><button type="button" onClick={() => importRef.current?.click()}>Import</button><button type="button" onClick={draft.reset}>Reset draft</button></div></details>
          <details><summary>Export</summary><div className="align-right"><button type="button" onClick={() => downloadJson("experience.json", draft.experience)}>Experience</button><button type="button" onClick={() => downloadJson("interaction-graph.json", draft.interactionGraph)}>Interactions</button><button type="button" onClick={() => downloadJson("studio-project.json", draft.project)}>Project</button><button type="button" onClick={() => downloadJson("asset-manifest.json", draft.assetManifest)}>Assets</button></div></details>
          <input ref={importRef} hidden type="file" accept="application/json,.json" onChange={(event) => void importExperience(event.target.files?.[0])} />
        </div>
      </header>

      {notice && <button type="button" className="production-notice" onClick={() => setNotice("")}>{notice}<span>×</span></button>}

      {advanced ? (
        <AdvancedWorkspace workspace={workspace} draft={draft} activeScene={sceneIndex} setActiveScene={selectSceneInWorkspace} onClose={() => { setAdvanced(false); setWorkspace("Create"); }} />
      ) : (
        <div className="production-layout">
          <aside className="production-left">
            <div className="production-panel-title"><div><span>PROJECT</span><strong>{draft.project.name}</strong></div><button type="button" title="New scene" aria-label="Add scene" onClick={addScene}>＋</button></div>
            <div className="production-segmented">
              {(["Scenes", "Structure", "Assets"] as LeftMode[]).map((mode) => <button key={mode} type="button" aria-pressed={leftMode === mode} onClick={() => setLeftMode(mode)}>{mode}</button>)}
            </div>
            <Navigator mode={leftMode} experience={draft.experience} manifest={draft.assetManifest} activeScene={sceneIndex} selection={selection} onSelect={setSelection} onScene={selectScene} />
            <button type="button" className="production-import" onClick={() => { setWorkspace("Assets"); setAdvanced(true); }}>＋ Import assets</button>
          </aside>

          <section className="production-stage">
            <div className="production-stage-head">
              <div><span>{scene.copy.eyebrow}</span><strong>{scene.label}</strong></div>
              <div className="production-stage-actions"><button type="button" onClick={() => setSelection({ kind: "camera", index: sceneIndex })}>Camera</button><button type="button" onClick={openAdvanced}>Advanced</button></div>
            </div>
            {workflow.unconfigured && <section className="production-first-run" aria-labelledby="studio-first-run-title"><div><span>START HERE</span><h2 id="studio-first-run-title">What do you want to create?</h2><p>Start with the outcome. Forge will guide assets, scenes, motion, review and publishing without asking you to learn the machinery first.</p></div><div><button type="button" className="primary" onClick={() => setGuidedOpen(true)}>Start Guided Build</button><button type="button" onClick={() => importRef.current?.click()}>Import an existing project</button><button type="button" onClick={() => { setGuideDismissed(true); try { window.localStorage.setItem("forge-studio-guided-first-run-v1", "seen"); } catch {} }}>Open Studio anyway</button></div></section>}
            {!workflow.unconfigured && <button type="button" className="production-guided-next" onClick={() => setGuidedOpen(true)}><span>NEXT · {workflow.completed}/6 COMPLETE</span><strong>{workflow.nextLabel}</strong><small>Continue →</small></button>}
            <div className="production-runtime">
              <StudioLivePreview experience={draft.experience} active={sceneIndex} setActive={selectScene} />
            </div>
            <form className="production-command" onSubmit={(event) => { event.preventDefault(); runCommand(); }}>
              <button type="button" className="production-command-shortcut" aria-label="Open command palette" onClick={() => setCommandPaletteOpen(true)}>⌘K</button><input aria-label="Forge command" value={command} onChange={(event) => setCommand(event.target.value)} placeholder="Command Forge: ‘architectural build’, ‘add scene’, ‘product hero’…" /><button type="submit">Run</button>
            </form>
          </section>

          <aside className="production-right">
            <div className="production-panel-title"><div><span>INSPECTOR</span><strong>{selectionLabel}</strong></div><button type="button" aria-label="Open advanced inspector" onClick={openAdvanced}>•••</button></div>
            <Inspector selection={selection} experience={draft.experience} setExperience={draft.setExperience} sceneIndex={sceneIndex} archetype={archetype} setArchetype={setArchetype} applyArchetype={applyArchetype} buildSelectedNode={buildSelectedNode} resetSceneMotion={resetSceneMotion} openAdvanced={openAdvanced} setWorkspace={setWorkspace} />
          </aside>

          <section className="production-bottom">
            <div className="production-story-head"><div><span>STORY</span><strong>{draft.experience.scenes.length} scenes</strong></div><div><button type="button" aria-label="Move scene earlier" onClick={() => moveScene(-1)} disabled={sceneIndex === 0}>←</button><button type="button" aria-label="Move scene later" onClick={() => moveScene(1)} disabled={sceneIndex === draft.experience.scenes.length - 1}>→</button><button type="button" onClick={duplicateScene}>Duplicate</button><button type="button" onClick={deleteScene}>Delete</button><button type="button" className="accent" onClick={addScene}>＋ Scene</button></div></div>
            <div className="production-story-strip">
              {draft.experience.scenes.map((item, index) => <button key={item.id} type="button" className={index === sceneIndex ? "active" : ""} onClick={() => selectScene(index)}><small>{String(index + 1).padStart(2, "0")}</small><span>{item.label}</span><i aria-hidden="true" style={scenePreviewStyle(item)} /></button>)}
            </div>
            <div className="production-progress"><span>00</span><div>{draft.experience.scenes.map((item, index) => <button key={item.id} type="button" aria-label={`Go to ${item.label}`} className={index === sceneIndex ? "active" : ""} style={{ width: `${(item.range[1] - item.range[0]) * 100}%` }} onClick={() => selectScene(index)} />)}</div><span>100</span></div>
          </section>
        </div>
      )}

      {commandPaletteOpen && <div className="production-command-palette-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setCommandPaletteOpen(false); }}>
        <section className="production-command-palette" role="dialog" aria-modal="true" aria-labelledby="command-palette-title">
          <header><div><span>FORGE COMMAND</span><h2 id="command-palette-title">Go anywhere. Do anything.</h2></div><button type="button" aria-label="Close command palette" onClick={() => setCommandPaletteOpen(false)}>×</button></header>
          <form onSubmit={(event) => { event.preventDefault(); runCommandValue(command); }}><input autoFocus aria-label="Search Forge commands" value={command} onChange={(event) => setCommand(event.target.value)} placeholder="Try “ship”, “Creative Agent”, “add scene”, “product hero”…" /><kbd>ESC</kbd></form>
          <div className="production-command-groups">
            <section><span>NAVIGATE</span><button type="button" onClick={() => runCommandValue("create workspace")}>Create</button><button type="button" onClick={() => runCommandValue("motion workspace")}>Motion</button><button type="button" onClick={() => runCommandValue("interact")}>Interact</button><button type="button" onClick={() => runCommandValue("assets")}>Assets</button><button type="button" onClick={() => runCommandValue("ship")}>Ship</button></section>
            <section><span>PROJECT</span><button type="button" onClick={() => runCommandValue("guided build")}>Guided Build</button><button type="button" onClick={() => runCommandValue("new project")}>New project</button><button type="button" onClick={() => runCommandValue("add scene")}>Add scene</button><button type="button" onClick={() => runCommandValue("duplicate")}>Duplicate scene</button></section>
            <section><span>ASSIST</span><button type="button" onClick={() => runCommandValue("creative agent")}>Creative Agent</button><button type="button" onClick={() => runCommandValue("open director")}>Director</button><button type="button" onClick={() => runCommandValue("asset creator")}>Asset Creator</button></section>
            <section><span>MOTION</span><button type="button" onClick={() => runCommandValue("product hero")}>Product hero</button><button type="button" onClick={() => runCommandValue("architectural build")}>Architectural build</button><button type="button" onClick={() => runCommandValue("editorial reveal")}>Editorial reveal</button><button type="button" onClick={() => runCommandValue("threshold")}>Threshold passage</button></section>
          </div>
        </section>
      </div>}
      {newProjectOpen && <NewProjectDialog name={newName} setName={setNewName} kind={newKind} setKind={setNewKind} onCreate={createProject} onClose={() => setNewProjectOpen(false)} />}
    </main>
  );
}

function Navigator({ mode, experience, manifest, activeScene, selection, onSelect, onScene }: { mode: LeftMode; experience: ExperienceConfig; manifest: AssetManifest; activeScene: number; selection: Selection; onSelect: (value: Selection) => void; onScene: (index: number) => void }) {
  if (mode === "Scenes") return <div className="production-tree">{experience.scenes.map((scene, index) => <button type="button" key={scene.id} className={activeScene === index ? "active" : ""} onClick={() => onScene(index)}><span>◫</span><strong>{scene.label}</strong><small>Timeline {Math.round((scene.range[1] - scene.range[0]) * 100)}%</small></button>)}</div>;
  if (mode === "Structure") return <div className="production-tree"><button type="button" className={selection.kind === "camera" ? "active" : ""} onClick={() => onSelect({ kind: "camera", index: activeScene })}><span>⌁</span><strong>Camera</strong><small>shot</small></button><button type="button" className={selection.kind === "environment" ? "active" : ""} onClick={() => onSelect({ kind: "environment", index: activeScene })}><span>◉</span><strong>Environment</strong><small>world</small></button>{(experience.productRig?.nodes ?? []).map((node) => <button type="button" key={node} className={selection.kind === "node" && selection.name === node ? "active" : ""} onClick={() => onSelect({ kind: "node", index: activeScene, name: node })}><span>◇</span><strong>{node}</strong><small>rig</small></button>)}</div>;
  const assets = [...manifest.models.map((entry) => ({ ...entry, kind: "model" })), ...manifest.textures.map((entry) => ({ ...entry, kind: "texture" })), ...manifest.hdr.map((entry) => ({ ...entry, kind: "hdr" })), ...manifest.video.map((entry) => ({ ...entry, kind: "video" }))];
  return <div className="production-tree">{assets.length ? assets.map((asset, index) => <button type="button" key={`${asset.kind}-${asset.path}`} className={selection.kind === "asset" && selection.index === index ? "active" : ""} onClick={() => onSelect({ kind: "asset", index })}><span>▧</span><strong>{asset.path.split("/").pop()}</strong><small>{asset.kind}</small></button>) : <p className="production-empty">No banked assets yet. Import assets to begin.</p>}</div>;
}

function Inspector({ selection, experience, setExperience, sceneIndex, archetype, setArchetype, applyArchetype, buildSelectedNode, resetSceneMotion, openAdvanced, setWorkspace }: { selection: Selection; experience: ExperienceConfig; setExperience: ReturnType<typeof useStudioDraft>["setExperience"]; sceneIndex: number; archetype: MotionArchetypeName; setArchetype: (value: MotionArchetypeName) => void; applyArchetype: (value?: MotionArchetypeName) => void; buildSelectedNode: (node: string) => void; resetSceneMotion: () => void; openAdvanced: () => void; setWorkspace: (value: Workspace) => void }) {
  const scene = experience.scenes[sceneIndex];
  if (selection.kind === "camera") return <div className="production-inspector"><Section title="Lens"><label>Start FOV<input type="number" min="12" max="100" value={scene.camera.from.fov} onChange={(event) => updateScene(setExperience, sceneIndex, (current) => ({ ...current, camera: { ...current.camera, from: { ...current.camera.from, fov: Number(event.target.value) } } }))} /></label><label>End FOV<input type="number" min="12" max="100" value={scene.camera.to.fov} onChange={(event) => updateScene(setExperience, sceneIndex, (current) => ({ ...current, camera: { ...current.camera, to: { ...current.camera.to, fov: Number(event.target.value) } } }))} /></label></Section><Section title="Camera motion"><select value={archetype} onChange={(event) => setArchetype(event.target.value as MotionArchetypeName)}>{motionArchetypeCatalog.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><button type="button" className="primary" onClick={() => applyArchetype()}>Apply coordinated motion</button><button type="button" onClick={openAdvanced}>Open camera sequencer</button></Section></div>;
  if (selection.kind === "node") return <div className="production-inspector"><Section title="Selected rig node"><div className="production-readout"><span>Target</span><strong>{selection.name}</strong></div><div className="production-readout"><span>Existing tracks</span><strong>{scene.motionTracks.filter((track) => track.target.startsWith(`rig:${selection.name}:`)).length}</strong></div></Section><Section title="Motion"><button type="button" className="primary" onClick={() => buildSelectedNode(selection.name)}>Build + reveal</button><button type="button" onClick={openAdvanced}>Fine tune tracks</button></Section></div>;
  if (selection.kind === "environment") return <div className="production-inspector"><Section title="World"><label>Exposure<input type="range" min="0.2" max="2.5" step="0.01" value={scene.world.exposure} onChange={(event) => updateScene(setExperience, sceneIndex, (current) => ({ ...current, world: { ...current.world, exposure: Number(event.target.value) } }))} /></label><label>Key light<input type="range" min="0" max="10" step="0.05" value={scene.world.key} onChange={(event) => updateScene(setExperience, sceneIndex, (current) => ({ ...current, world: { ...current.world, key: Number(event.target.value) } }))} /></label><label>Ambient<input type="range" min="0" max="3" step="0.02" value={scene.world.ambient} onChange={(event) => updateScene(setExperience, sceneIndex, (current) => ({ ...current, world: { ...current.world, ambient: Number(event.target.value) } }))} /></label></Section><Section title="Post"><label>Bloom<input type="range" min="0" max="2" step="0.01" value={scene.post.bloom} onChange={(event) => updateScene(setExperience, sceneIndex, (current) => ({ ...current, post: { ...current.post, bloom: Number(event.target.value) } }))} /></label><label>Vignette<input type="range" min="0" max="1" step="0.01" value={scene.post.vignette} onChange={(event) => updateScene(setExperience, sceneIndex, (current) => ({ ...current, post: { ...current.post, vignette: Number(event.target.value) } }))} /></label></Section></div>;
  if (selection.kind === "asset") return <div className="production-inspector"><Section title="Asset"><p className="production-muted">Asset diagnostics, replacement and assignment use Forge&apos;s existing Asset workspace.</p><button type="button" className="primary" onClick={() => { setWorkspace("Assets"); openAdvanced(); }}>Open asset workspace</button></Section></div>;
  return <div className="production-inspector"><Section title="Scene"><label>Name<input value={scene.label} onChange={(event) => updateScene(setExperience, sceneIndex, (current) => ({ ...current, label: event.target.value }))} /></label><label>Eyebrow<input value={scene.copy.eyebrow} onChange={(event) => updateScene(setExperience, sceneIndex, (current) => ({ ...current, copy: { ...current.copy, eyebrow: event.target.value } }))} /></label><label>Headline<textarea rows={3} value={scene.copy.headline} onChange={(event) => updateScene(setExperience, sceneIndex, (current) => ({ ...current, copy: { ...current.copy, headline: event.target.value } }))} /></label><label>Body<textarea rows={4} value={scene.copy.body} onChange={(event) => updateScene(setExperience, sceneIndex, (current) => ({ ...current, copy: { ...current.copy, body: event.target.value } }))} /></label></Section><Section title="Motion composer"><select value={archetype} onChange={(event) => setArchetype(event.target.value as MotionArchetypeName)}>{motionArchetypeCatalog.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><p className="production-muted">{motionArchetypeCatalog.find((item) => item.id === archetype)?.description}</p><button type="button" className="primary" onClick={() => applyArchetype()}>Apply motion</button><button type="button" onClick={resetSceneMotion}>Reset scene motion</button><button type="button" onClick={openAdvanced}>Advanced sequencer</button></Section></div>;
}

function AdvancedWorkspace({ workspace, draft, activeScene, setActiveScene, onClose }: { workspace: Workspace; draft: ReturnType<typeof useStudioDraft>; activeScene: number; setActiveScene: (index: number) => void; onClose: () => void }) {
  const guidedShip = workspace === "Ship";
  return <div className="production-advanced"><div className="production-advanced-head"><div><span>{workspace.toUpperCase()} / {guidedShip ? "GUIDED" : "ADVANCED"}</span><strong>{guidedShip ? "Review, hand off and publish" : "Full production controls"}</strong></div><button type="button" onClick={onClose}>← Back to cockpit</button></div>{workspace === "Motion" || workspace === "Create" ? <SequencerEditor experience={draft.experience} setExperience={draft.setExperience} active={activeScene} setActive={setActiveScene} beginGroup={draft.beginExperienceGroup} endGroup={draft.endExperienceGroup} undo={draft.undoExperience} redo={draft.redoExperience} canUndo={draft.canUndoExperience} canRedo={draft.canRedoExperience} /> : null}{workspace === "Interact" ? <InteractionGraphEditor graph={draft.interactionGraph} setGraph={draft.setInteractionGraph} /> : null}{workspace === "Assets" ? <div className="production-advanced-stack"><AssetManager setExperience={draft.setExperience} assetManifest={draft.assetManifest} setAssetManifest={draft.setAssetManifest} active={activeScene} /><AssetBankPanel experience={draft.experience} setExperience={draft.setExperience} assetManifest={draft.assetManifest} setAssetManifest={draft.setAssetManifest} interactionGraph={draft.interactionGraph} undo={draft.undoExperience} canUndo={draft.canUndoExperience} /><GlbInspectorPanel experience={draft.experience} setExperience={draft.setExperience} /></div> : null}{workspace === "Ship" ? <div className="production-advanced-stack"><PublishPanel project={draft.project} setProject={draft.setProject} experience={draft.experience} assetManifest={draft.assetManifest} validationCount={draft.validation.length} /><details className="production-performance-disclosure"><summary>Advanced performance controls</summary><TelemetryPanel project={draft.project} setProject={draft.setProject} /></details></div> : null}</div>;
}

function NewProjectDialog({ name, setName, kind, setKind, onCreate, onClose }: { name: string; setName: (value: string) => void; kind: ProjectKind; setKind: (value: ProjectKind) => void; onCreate: () => void; onClose: () => void }) {
  return <div className="production-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><section className="production-modal" role="dialog" aria-modal="true" aria-labelledby="new-project-title"><span>NEW FORGE EXPERIENCE</span><h2 id="new-project-title">Start from zero.</h2><p>Create a valid production shell with one editable scene, working runtime, camera, lighting, motion and publishing structure.</p><label>Project name<input autoFocus value={name} onChange={(event) => setName(event.target.value)} /></label><div className="production-kind-grid">{(["real-estate", "product", "hospitality", "automotive", "fashion", "custom"] as ProjectKind[]).map((item) => <button type="button" key={item} aria-pressed={kind === item} onClick={() => setKind(item)}>{item.replace("-", " ")}</button>)}</div><div className="production-modal-actions"><button type="button" onClick={onClose}>Cancel</button><button type="button" className="primary" disabled={!name.trim()} onClick={onCreate}>Create project</button></div></section></div>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section className="production-section"><h3>{title}</h3>{children}</section>; }

function updateScene(setExperience: ReturnType<typeof useStudioDraft>["setExperience"], index: number, change: (scene: SceneDefinition) => SceneDefinition) {
  setExperience((current) => parseExperience({ ...current, scenes: current.scenes.map((scene, sceneIndex) => sceneIndex === index ? change(scene) : scene) }));
}

function namespaceTrack(track: MotionTrack, prefix: string): MotionTrack {
  return { ...track, id: `${prefix}-${track.id}`, keyframes: track.keyframes.map((key) => ({ ...key, id: `${prefix}-${key.id}` })) } as MotionTrack;
}

function normalizeRanges(scenes: SceneDefinition[]): SceneDefinition[] {
  const length = Math.max(1, scenes.length);
  return scenes.map((scene, index) => ({ ...scene, range: [index / length, (index + 1) / length] as [number, number] }));
}

function uniqueSceneId(experience: ExperienceConfig, base: string) {
  const used = new Set(experience.scenes.map((scene) => scene.id));
  let value = slug(base) || "scene";
  let count = 2;
  while (used.has(value)) value = `${slug(base)}-${count++}`;
  return value;
}

function makeStarterExperience(base: ExperienceConfig, name: string, kind: ProjectKind): ExperienceConfig {
  const source = structuredClone(base.scenes[0]);
  const labels: Record<ProjectKind, string> = { "real-estate": "Arrival", product: "Hero Product", hospitality: "Arrival", automotive: "Vehicle Reveal", fashion: "Opening Look", custom: "Opening Scene" };
  source.id = "opening";
  source.label = labels[kind];
  source.range = [0, 1];
  source.motionTracks = [];
  source.blocks = [];
  delete source.media;
  source.copy = { eyebrow: `01 / ${kind.replace("-", " ").toUpperCase()}`, headline: name, body: "Start directing this experience from the cockpit.", align: "left" };
  return parseExperience({ ...structuredClone(base), meta: { ...base.meta, name, description: `${name} — Forge production project.` }, heroModel: "", heroVisible: false, assets: [], scenes: [source], hotspots: [], productRig: undefined });
}

function scenePreviewStyle(scene: SceneDefinition) {
  if (scene.media?.kind === "image") return { background: `linear-gradient(180deg, transparent, rgba(0,0,0,.2)), url("${scene.media.src}") center / cover` };
  if (scene.media?.kind === "video" && scene.media.poster) return { background: `linear-gradient(180deg, transparent, rgba(0,0,0,.2)), url("${scene.media.poster}") center / cover` };
  return { background: `linear-gradient(135deg, ${scene.world.background}, #262b31)` };
}

function labelForSelection(selection: Selection, experience: ExperienceConfig) {
  if (selection.kind === "node") return selection.name;
  if (selection.kind === "camera") return "Camera";
  if (selection.kind === "environment") return "Environment";
  if (selection.kind === "asset") return "Asset";
  return experience.scenes[Math.min(selection.index, experience.scenes.length - 1)]?.label ?? "Scene";
}

function slug(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64); }
