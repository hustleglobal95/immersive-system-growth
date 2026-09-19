"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { readStored, useClientValue, useStoredValue } from "@/src/lib/useClientValue";
import rawExperience from "@/config/experience.json";
import rawProject from "@/config/studio-project.json";
import rawAssetManifest from "@/config/asset-manifest.json";
import rawInteractionGraph from "@/config/interaction-graph.json";
import { parseExperience } from "@/src/lib/configSchema";
import { parseInteractionGraph } from "@/src/lib/interactionGraph";
import { parseStudioProject } from "@/src/platform/studioSchema";
import { emptyInteractionGraph } from "@/src/platform/emptyInteractionGraph";
import type { MotionArchetypeName } from "@/src/platform/motionArchetypes";
import { StudioLivePreview } from "@/src/studio/StudioLivePreview";
import { SequencerEditor } from "@/src/studio/SequencerEditor";
import { InteractionGraphEditor } from "@/src/studio/InteractionGraphEditor";
import { AssetManager } from "@/src/studio/AssetManager";
import { AssetBankPanel } from "@/src/studio/AssetBankPanel";
import { GlbInspectorPanel } from "@/src/studio/GlbInspectorPanel";
import { PublishPanel, TelemetryPanel } from "@/src/studio/ProjectPanels";
import { downloadJson, useStudioDraft } from "@/src/studio/useStudioDraft";
import { STUDIO_GUIDE_BRIEF_KEY, STUDIO_GUIDE_SHIP_KEY, StudioWorkflowGuide } from "@/src/studio/StudioWorkflowGuide";
import { StudioVaultPanel } from "@/src/studio/StudioVaultPanel";
import { StudioIdentityBadge } from "@/src/studio/StudioIdentityBadge";
import { LoopEnginePanel } from "@/src/studio/LoopEnginePanel";
import { capabilitiesForContext, type ResolvedCapability } from "@/src/platform/control-plane/capabilityRegistry";
import { createProposalDraft, type ForgeProposal } from "@/src/platform/control-plane/proposal";
import { resolveSelectionContext, type ForgeSelection, type SelectionContext } from "@/src/platform/control-plane/selectionContext";
import { compileIntent, compiledCapability, motionArchetypeForIntent } from "@/src/platform/control-plane/intentCompiler";
import { recommendNextActions, type NextAction } from "@/src/platform/control-plane/nextAction";
import { evaluateProjectHealth } from "@/src/platform/control-plane/projectHealth";
import { prepareFastProposal } from "@/src/platform/control-plane/fastProposal";
import { attachVerifiedLoopCandidate, type VerifiedLoopCandidate } from "@/src/platform/control-plane/deepCandidate";
import { ControlPlaneReview } from "@/src/studio/ControlPlaneReview";
import type { AssetManifest } from "@/src/types/assets";
import type { ExperienceConfig, SceneDefinition } from "@/src/types/experience";

const initialExperience = parseExperience(rawExperience);
const initialProject = parseStudioProject(rawProject);
const initialManifest = rawAssetManifest as AssetManifest;
const initialGraph = parseInteractionGraph(rawInteractionGraph);

const primarySurfaces = ["Build", "Review", "Ship"] as const;
type StudioSurface = (typeof primarySurfaces)[number];
type Workspace = "Motion" | "Interact" | "Assets" | "Telemetry";
type LeftMode = "Scenes" | "Structure" | "Assets";
type Selection = ForgeSelection;

type ProjectKind = "real-estate" | "product" | "hospitality" | "automotive" | "fashion" | "custom";

export function ProductionStudioWorkbench() {
  const draft = useStudioDraft(initialExperience, initialProject, initialManifest, initialGraph);
  const [surface, setSurface] = useState<StudioSurface>("Build");
  const [workspace, setWorkspace] = useState<Workspace>("Motion");
  const [leftMode, setLeftMode] = useState<LeftMode>("Scenes");
  const [activeScene, setActiveScene] = useState(0);
  const [selection, setSelection] = useState<Selection>({ kind: "scene", index: 0 });
  const [advanced, setAdvanced] = useState(false);
  const [notice, setNotice] = useState("");
  const [command, setCommand] = useState("");
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newName, setNewName] = useState("Untitled Experience");
  const [newKind, setNewKind] = useState<ProjectKind>("custom");
  const [guidedOpen, setGuidedOpen] = useState(false);
  const [guideDismissed, setGuideDismissed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [loopOpen, setLoopOpen] = useState(false);
  const [requestedLoop, setRequestedLoop] = useState<string | undefined>();
  const [preparedProposal, setPreparedProposal] = useState<ForgeProposal | null>(null);
  const [candidateExperience, setCandidateExperience] = useState<ExperienceConfig | null>(null);
  const [candidateAssetManifest, setCandidateAssetManifest] = useState<AssetManifest | null>(null);
  const [candidateInteractionGraph, setCandidateInteractionGraph] = useState<typeof initialGraph | null>(null);
  const [previewMode, setPreviewMode] = useState<"current"|"candidate">("current");
  const importRef = useRef<HTMLInputElement>(null);

  const sceneIndex = Math.min(activeScene, draft.experience.scenes.length - 1);
  const scene = draft.experience.scenes[sceneIndex];
  const rigNodes = draft.experience.productRig?.nodes ?? [];
  const selectionContext = useMemo(() => resolveSelectionContext({
    experience:draft.experience,
    manifest:draft.assetManifest,
    graph:draft.interactionGraph,
    selection,
    validationIssues:draft.validation,
  }), [draft.assetManifest, draft.experience, draft.interactionGraph, draft.validation, selection]);
  const selectionCapabilities = useMemo(() => capabilitiesForContext(selectionContext), [selectionContext]);
  const nextActions = useMemo(() => recommendNextActions(selectionContext,3), [selectionContext]);
  const projectHealth = useMemo(() => evaluateProjectHealth({
    experience:draft.experience,
    manifest:draft.assetManifest,
    graph:draft.interactionGraph,
    validationIssues:draft.validation,
  }), [draft.assetManifest, draft.experience, draft.interactionGraph, draft.validation]);
  const selectionLabel = selectionContext.label;
  const guideBrief = useClientValue(() => readStored(STUDIO_GUIDE_BRIEF_KEY), "");
  const guideSeen = useClientValue(() => readStored("forge-studio-guided-first-run-v1"), "");
  const shippedProjectId = useStoredValue(STUDIO_GUIDE_SHIP_KEY);
  const workflow = useMemo(() => {
    const assetCount = draft.assetManifest.models.length + draft.assetManifest.textures.length + draft.assetManifest.hdr.length + draft.assetManifest.video.length;
    const motionCount = draft.experience.scenes.reduce((total, item) => total + item.motionTracks.length, 0);
    const customStructure = draft.experience.scenes.length > 1 || draft.experience.scenes[0]?.label !== "Opening Scene";
    const ideaDone = guideBrief.trim().length >= 12;
    const assetsDone = assetCount > 0;
    const motionDone = motionCount > 0;
    const reviewDone = draft.validation.length === 0 && ideaDone && customStructure && motionDone;
    const shipDone = shippedProjectId === draft.project.id;
    const completed = [ideaDone, assetsDone, customStructure, motionDone, reviewDone, shipDone].filter(Boolean).length;
    const nextLabel = !ideaDone ? "Describe the experience" : !assetsDone ? "Create or import the hero assets" : !customStructure ? "Shape the scene journey" : !motionDone ? "Direct the movement" : !reviewDone ? "Resolve review issues" : !shipDone ? "Review and publish" : "Project shipped";
    const unconfigured = draft.experience.scenes.length === 1 && assetCount === 0 && motionCount === 0 && !draft.experience.heroModel && !draft.experience.scenes[0]?.media;
    return { completed, nextLabel, unconfigured };
  }, [draft.assetManifest, draft.experience, draft.project.id, draft.validation.length, guideBrief, shippedProjectId]);
  const guideVisible = guidedOpen || (!guideDismissed && draft.hydrated && !guideSeen && workflow.unconfigured);
  const closeGuide = () => {
    setGuidedOpen(false);
    setGuideDismissed(true);
    try { window.localStorage.setItem("forge-studio-guided-first-run-v1", "seen"); } catch { /* storage can be blocked */ }
    queueMicrotask(() => document.getElementById("studio-guided-build-button")?.focus());
  };
  const closeCommandPalette = () => {
    setCommandPaletteOpen(false);
    queueMicrotask(() => document.querySelector<HTMLButtonElement>(".production-command-shortcut")?.focus());
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

  // Build is the default product surface; specialist editors are summoned under Advanced.
  const openAdvanced = (target:Workspace="Motion") => {
    setWorkspace(target);
    setAdvanced(true);
  };

  const runCapability = (
    capability: ResolvedCapability,
    intent=capability.label,
    source:"semantic-action"|"command"|"next-action"|"system"="semantic-action",
    requestedArchetype:MotionArchetypeName=motionArchetypeForIntent(selectionContext,intent),
  ) => {
    const id=`proposal-${Date.now()}`;
    const createdAt=new Date().toISOString();
    const dispatch=capability.dispatch;

    if(dispatch.type==="fast-action") {
      const prepared=prepareFastProposal({
        id,createdAt,capability,context:selectionContext,experience:draft.experience,intent,source,archetype:requestedArchetype,
      });
      setPreparedProposal(prepared.proposal);
      setCandidateExperience(prepared.candidateExperience);
      setCandidateAssetManifest(null);
      setCandidateInteractionGraph(null);
      setPreviewMode("candidate");
      setNotice(`${capability.label} prepared. Compare Current vs Candidate before accepting.`);
      return;
    }

    const proposal=createProposalDraft({id,createdAt,capability,context:selectionContext,intent,source});
    const routedProposal=dispatch.type==="loop" ? {...proposal,state:"verifying" as const} : proposal;
    setPreparedProposal(routedProposal);
    setCandidateExperience(null);
    setCandidateAssetManifest(null);
    setCandidateInteractionGraph(null);
    setPreviewMode("current");

    if(dispatch.type==="select") {
      if(dispatch.target==="camera") setSelection({kind:"camera",index:sceneIndex});
      setNotice(`${capability.label} selected.`);
      return;
    }
    if(dispatch.type==="workspace") {
      setWorkspace(dispatch.workspace);
      setAdvanced(true);
      setNotice(`${capability.label} opened in ${capability.advancedSurface ?? dispatch.workspace}.`);
      return;
    }
    if(dispatch.type==="route") {
      window.location.assign(dispatch.href);
      return;
    }
    setRequestedLoop(dispatch.loop);
    setLoopOpen(true);
    setNotice(`${capability.label} prepared as a preview-required proposal.`);
  };

  const acceptCandidate = () => {
    if(!candidateExperience || !preparedProposal) return;
    draft.applyProjectBundle({
      experience:candidateExperience,
      assetManifest:candidateAssetManifest ?? draft.assetManifest,
      interactionGraph:candidateInteractionGraph ?? draft.interactionGraph,
    });
    setPreparedProposal({...preparedProposal,state:"accepted"});
    setCandidateExperience(null);
    setCandidateAssetManifest(null);
    setCandidateInteractionGraph(null);
    setPreviewMode("current");
    setNotice(`${preparedProposal.intent.raw} accepted into the working draft. The full project bundle remains atomically reversible; Vault/production state is unchanged.`);
  };

  const rejectCandidate = () => {
    const label=preparedProposal?.intent.raw;
    setPreparedProposal(null);
    setCandidateExperience(null);
    setCandidateAssetManifest(null);
    setCandidateInteractionGraph(null);
    setPreviewMode("current");
    if(label) setNotice(`${label} rejected. Working project unchanged.`);
  };

  const revertAcceptedProposal = () => {
    if(!preparedProposal || !draft.undoProjectBundle()) return;
    setPreparedProposal({...preparedProposal,state:"rejected"});
    setNotice(`${preparedProposal.intent.raw} reverted atomically. Experience, assets and interactions returned to the prior working state.`);
  };

  const loadVerifiedLoopCandidate = (candidate:VerifiedLoopCandidate) => {
    if(!preparedProposal) {
      setNotice("The verified Loop result has no active Control Plane proposal to attach to.");
      return;
    }
    try {
      const proposal=attachVerifiedLoopCandidate(preparedProposal,candidate);
      setPreparedProposal(proposal);
      setCandidateExperience(candidate.experience);
      setCandidateAssetManifest(candidate.assetManifest);
      setCandidateInteractionGraph(candidate.interactionGraph);
      setPreviewMode("candidate");
      setNotice(`${candidate.loopId} returned a verified winning candidate. Compare it before accepting.`);
    } catch(error) {
      setNotice(error instanceof Error ? error.message : "Could not attach verified Loop evidence.");
    }
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
    setSurface("Build");
    setWorkspace("Motion");
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
          setSurface("Build");
          setWorkspace("Motion");
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
        closeCommandPalette();
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

  const runMotionPreset = (name:MotionArchetypeName,label:string) => {
    const capability=selectionCapabilities.find((item)=>item.id==="scene.compose-motion");
    if(!capability) {
      setNotice("This selection does not support scene motion composition.");
      return;
    }
    runCapability(capability,label,"command",name);
  };

  const runCommandValue = (input: string) => {
    const value = input.trim().toLowerCase();
    if (!value) return;
    if (value.includes("vault") || value.includes("versions") || value.includes("history")) setVaultOpen(true);
    else if (value.includes("guided")) setGuidedOpen(true);
    else if (value==="review" || value.includes("project health") || value.includes("review project")) { setSurface("Review"); setAdvanced(false); }
    else if (value==="build" || value==="create" || value.includes("build workspace") || value.includes("create workspace")) { setSurface("Build"); setAdvanced(false); }
    else if (value.includes("ship") || value.includes("publish") || value.includes("review release")) { setSurface("Ship"); setAdvanced(false); }
    else if (value.includes("loop engine") || value==="loops" || value.includes("improvement engine")) { setRequestedLoop(undefined); setLoopOpen(true); }
    else if (value.includes("creative agent")) window.location.assign("/studio/agent");
    else if (value === "director" || value.includes("open director")) window.location.assign("/director");
    else if (value.includes("asset creator") || value.includes("create asset")) window.location.assign("/studio/assets/create");
    else if (value.includes("new project")) setNewProjectOpen(true);
    else if (value.includes("interact")) openAdvanced("Interact");
    else if (value === "assets" || value.includes("asset workspace")) openAdvanced("Assets");
    else if (value === "motion" || value.includes("motion workspace") || value.includes("sequencer")) openAdvanced("Motion");
    else if (value.includes("telemetry")) openAdvanced("Telemetry");
    else if (value.includes("new scene") || value.includes("add scene")) addScene();
    else if (value.includes("duplicate")) duplicateScene();
    else if (value.includes("clear motion") || value.includes("reset motion")) resetSceneMotion();
    else {
      const compiled=compileIntent(selectionContext,input);
      const capability=compiledCapability(selectionContext,compiled);
      if(capability) runCapability(capability,input,"command");
      else if(compiled.status==="ambiguous") setNotice(compiled.reason+" Choose a contextual action to disambiguate.");
      else if (value === "architectural build") runMotionPreset("architectural-build",input);
      else if (value === "product hero") runMotionPreset("product-hero",input);
      else if (value === "parallax story") runMotionPreset("parallax-story",input);
      else if (value === "threshold passage") runMotionPreset("threshold-passage",input);
      else if (value === "editorial reveal") runMotionPreset("editorial-reveal",input);
      else setNotice("Forge could not map that intent to a safe capability for the current selection.");
    }
    setCommand("");
    closeCommandPalette();
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
        onOpenCreate={() => { closeGuide(); setSurface("Build"); setAdvanced(false); }}
        onOpenAssets={() => { closeGuide(); setSurface("Build"); openAdvanced("Assets"); }}
        onOpenMotion={() => { closeGuide(); setSurface("Build"); openAdvanced("Motion"); }}
        onOpenShip={() => { closeGuide(); setSurface("Ship"); setAdvanced(false); }}
      />}
      <header className="production-topbar">
        <div className="production-brand"><Link href="/forge">FORGE</Link><span>STUDIO</span></div>
        <nav aria-label="Primary Studio surfaces">
          {primarySurfaces.map((item) => <button key={item} type="button" aria-current={!advanced && surface === item ? "page" : undefined} onClick={() => { setSurface(item); setAdvanced(false); }}>{item}</button>)}
        </nav>
        <div className="production-top-actions">
          <button id="studio-guided-build-button" type="button" className="production-guided-button" onClick={() => setGuidedOpen(true)}><span>Guided Build</span><strong>{workflow.completed}/6</strong></button>
          <button type="button" className="production-status" data-valid={projectHealth.status==="ready"} data-health={projectHealth.status} onClick={() => { setSurface("Review"); setAdvanced(false); }}><i />{projectHealth.status==="ready" ? "Ready" : projectHealth.status==="blocked" ? `${projectHealth.issues.filter((issue)=>issue.severity==="blocker").length} blocker` : `${projectHealth.issues.filter((issue)=>issue.severity==="warning").length} issue`}</button>
          <details className="production-assist"><summary>Assist</summary><div><Link href="/studio/agent"><strong>Creative Agent</strong><span>Turn the idea into a production strategy.</span></Link><Link href="/director"><strong>Director</strong><span>Critique and strengthen the creative direction.</span></Link><Link href="/studio/assets/create"><strong>Asset Creator</strong><span>Create a missing image, video or 3D asset.</span></Link></div></details>
          <details className="production-advanced-menu"><summary>Advanced</summary><div><button type="button" onClick={() => openAdvanced("Motion")}><strong>Sequencer</strong><span>Tracks, curves and camera timing.</span></button><button type="button" onClick={() => openAdvanced("Interact")}><strong>Interactions</strong><span>Triggers, state and behavior graph.</span></button><button type="button" onClick={() => openAdvanced("Assets")}><strong>Asset tools</strong><span>Manifest, bank and GLB inspection.</span></button><button type="button" onClick={() => openAdvanced("Telemetry")}><strong>Telemetry</strong><span>Real-device performance evidence.</span></button></div></details>
          <details><summary>Project</summary><div><button type="button" onClick={() => { setRequestedLoop(undefined); setLoopOpen(true); }}>Improvement evidence</button><button type="button" onClick={() => setVaultOpen(true)}>Project Vault</button><button type="button" disabled={!draft.canUndoProjectBundle} onClick={() => { if(draft.undoProjectBundle()) { setPreparedProposal(null); setNotice("Last accepted proposal reverted atomically."); } }}>Undo accepted proposal</button><button type="button" disabled={!draft.canRedoProjectBundle} onClick={() => { if(draft.redoProjectBundle()) { setPreparedProposal(null); setNotice("Last reverted proposal restored atomically."); } }}>Redo accepted proposal</button><button type="button" onClick={() => setNewProjectOpen(true)}>New project</button><button type="button" onClick={() => importRef.current?.click()}>Import</button><button type="button" onClick={draft.reset}>Reset local draft</button></div></details>
          <details><summary>Export</summary><div className="align-right"><button type="button" onClick={() => downloadJson("experience.json", draft.experience)}>Experience</button><button type="button" onClick={() => downloadJson("interaction-graph.json", draft.interactionGraph)}>Interactions</button><button type="button" onClick={() => downloadJson("studio-project.json", draft.project)}>Project</button><button type="button" onClick={() => downloadJson("asset-manifest.json", draft.assetManifest)}>Assets</button></div></details><StudioIdentityBadge />
          <input ref={importRef} hidden type="file" accept="application/json,.json" onChange={(event) => void importExperience(event.target.files?.[0])} />
        </div>
      </header>

      {notice && <button type="button" className="production-notice" onClick={() => setNotice("")}>{notice}<span>×</span></button>}

      {advanced ? (
        <AdvancedWorkspace workspace={workspace} draft={draft} activeScene={sceneIndex} setActiveScene={selectSceneInWorkspace} onClose={() => setAdvanced(false)} />
      ) : surface === "Review" ? (
        <ReviewSurface
          health={projectHealth}
          nextActions={nextActions}
          proposal={preparedProposal}
          onRun={(capability)=>runCapability(capability,capability.label,"next-action")}
          onBuildScene={(index)=>{ selectScene(index); setSurface("Build"); }}
          onBuild={()=>setSurface("Build")}
          onAssets={()=>openAdvanced("Assets")}
          onTelemetry={()=>openAdvanced("Telemetry")}
        />
      ) : surface === "Ship" ? (
        <ShipSurface
          draft={draft}
          health={projectHealth}
          onReview={()=>setSurface("Review")}
          onVault={()=>setVaultOpen(true)}
          onTelemetry={()=>openAdvanced("Telemetry")}
        />
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
              <div className="production-stage-actions"><button type="button" onClick={() => setSelection({ kind: "camera", index: sceneIndex })}>Camera</button><button type="button" onClick={() => openAdvanced("Motion")}>Advanced</button></div>
            </div>
            {workflow.unconfigured && <section className="production-first-run" aria-labelledby="studio-first-run-title"><div><span>START HERE</span><h2 id="studio-first-run-title">What do you want to create?</h2><p>Start with the outcome. Forge will guide assets, scenes, motion, review and publishing without asking you to learn the machinery first.</p></div><div><button type="button" className="primary" onClick={() => setGuidedOpen(true)}>Start Guided Build</button><button type="button" onClick={() => importRef.current?.click()}>Import an existing project</button><button type="button" onClick={() => { setGuideDismissed(true); try { window.localStorage.setItem("forge-studio-guided-first-run-v1", "seen"); } catch { /* storage can be blocked */ } }}>Open Studio anyway</button></div></section>}
            {!workflow.unconfigured && nextActions[0] && <section className="production-next-action" data-urgency={nextActions[0].urgency}>
              <div><span>NEXT BEST ACTION</span><strong>{nextActions[0].capability.label}</strong><p>{nextActions[0].reason}</p></div>
              <div><button type="button" className="primary" onClick={() => runCapability(nextActions[0].capability,nextActions[0].capability.label,"next-action")}>Do it</button><button type="button" onClick={() => setGuidedOpen(true)}>Guided path · {workflow.completed}/6</button></div>
            </section>}
            <div className="production-runtime">
              <StudioLivePreview experience={previewMode==="candidate" && candidateExperience ? candidateExperience : draft.experience} active={sceneIndex} setActive={selectScene} />
            </div>
            <ControlPlaneReview
              proposal={preparedProposal}
              hasCandidate={Boolean(candidateExperience)}
              previewMode={previewMode}
              onPreviewMode={setPreviewMode}
              onAccept={acceptCandidate}
              onReject={rejectCandidate}
              onContinue={preparedProposal?.executionClass==="deep" && requestedLoop ? () => setLoopOpen(true) : undefined}
              canRevert={Boolean(draft.canUndoProjectBundle && preparedProposal?.state==="accepted")}
              onRevert={revertAcceptedProposal}
            />
            <form className="production-command" onSubmit={(event) => { event.preventDefault(); runCommand(); }}>
              <button type="button" className="production-command-shortcut" aria-label="Open command palette" onClick={() => setCommandPaletteOpen(true)}>⌘K</button><input aria-label="Forge command" value={command} onChange={(event) => setCommand(event.target.value)} placeholder="Tell Forge the outcome: ‘make this cinematic’, ‘fix mobile’, ‘make it inspectable’…" /><button type="submit">Direct</button>
            </form>
          </section>

          <aside className="production-right">
            <div className="production-panel-title"><div><span>INSPECTOR</span><strong>{selectionLabel}</strong></div><button type="button" aria-label="Open advanced inspector" onClick={() => openAdvanced("Motion")}>•••</button></div>
            <ContextualDirection
              context={selectionContext}
              capabilities={selectionCapabilities}
              proposal={preparedProposal}
              nextActions={nextActions}
              onCapability={(capability)=>runCapability(capability)}
            />
            <Inspector selection={selection} experience={draft.experience} setExperience={draft.setExperience} sceneIndex={sceneIndex} archetype={archetype} setArchetype={setArchetype} applyArchetype={applyArchetype} buildSelectedNode={buildSelectedNode} resetSceneMotion={resetSceneMotion} openAdvanced={openAdvanced} />
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

      {commandPaletteOpen && <div className="production-command-palette-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) closeCommandPalette(); }}>
        <section className="production-command-palette" role="dialog" aria-modal="true" aria-labelledby="command-palette-title">
          <header><div><span>FORGE COMMAND</span><h2 id="command-palette-title">Go anywhere. Do anything.</h2></div><button type="button" aria-label="Close command palette" onClick={closeCommandPalette}>×</button></header>
          <form onSubmit={(event) => { event.preventDefault(); runCommandValue(command); }}><input autoFocus aria-label="Search Forge commands" value={command} onChange={(event) => setCommand(event.target.value)} placeholder="Try “ship”, “Creative Agent”, “add scene”, “product hero”…" /><kbd>ESC</kbd></form>
          <div className="production-command-groups">
            <section><span>PRIMARY</span><button type="button" onClick={() => runCommandValue("build")}>Build</button><button type="button" onClick={() => runCommandValue("review")}>Review</button><button type="button" onClick={() => runCommandValue("ship")}>Ship</button></section>
            <section><span>ADVANCED</span><button type="button" onClick={() => runCommandValue("sequencer")}>Sequencer</button><button type="button" onClick={() => runCommandValue("interact")}>Interactions</button><button type="button" onClick={() => runCommandValue("assets")}>Asset tools</button><button type="button" onClick={() => runCommandValue("telemetry")}>Telemetry</button></section>
            <section><span>PROJECT</span><button type="button" onClick={() => runCommandValue("project health")}>Project Health</button><button type="button" onClick={() => runCommandValue("improvement engine")}>Improvement evidence</button><button type="button" onClick={() => runCommandValue("vault")}>Project Vault</button><button type="button" onClick={() => runCommandValue("guided build")}>Guided Build</button><button type="button" onClick={() => runCommandValue("new project")}>New project</button><button type="button" onClick={() => runCommandValue("add scene")}>Add scene</button></section>
            <section><span>ASSIST</span><button type="button" onClick={() => runCommandValue("creative agent")}>Creative Agent</button><button type="button" onClick={() => runCommandValue("open director")}>Director</button><button type="button" onClick={() => runCommandValue("asset creator")}>Asset Creator</button></section>
          </div>
        </section>
      </div>}
      {loopOpen && <LoopEnginePanel projectId={draft.project.id} projectName={draft.project.name} initialLoopId={requestedLoop} proposal={preparedProposal} onCandidateReady={loadVerifiedLoopCandidate} onClose={() => setLoopOpen(false)} onOpenVault={() => { setLoopOpen(false); setVaultOpen(true); }} />}
      {vaultOpen && <StudioVaultPanel draft={draft} onClose={() => setVaultOpen(false)} />}
      {newProjectOpen && <NewProjectDialog name={newName} setName={setNewName} kind={newKind} setKind={setNewKind} onCreate={createProject} onClose={() => setNewProjectOpen(false)} />}
    </main>
  );
}

function Navigator({ mode, experience, manifest, activeScene, selection, onSelect, onScene }: { mode: LeftMode; experience: ExperienceConfig; manifest: AssetManifest; activeScene: number; selection: Selection; onSelect: (value: Selection) => void; onScene: (index: number) => void }) {
  if (mode === "Scenes") return <div className="production-tree">{experience.scenes.map((scene, index) => <button type="button" key={scene.id} className={activeScene === index ? "active" : ""} onClick={() => onScene(index)}><span>◫</span><strong>{scene.label}</strong><small>Timeline {Math.round((scene.range[1] - scene.range[0]) * 100)}%</small></button>)}</div>;
  if (mode === "Structure") return <div className="production-tree"><button type="button" className={selection.kind === "camera" ? "active" : ""} onClick={() => onSelect({ kind: "camera", index: activeScene })}><span>⌁</span><strong>Camera</strong><small>shot</small></button><button type="button" className={selection.kind === "environment" ? "active" : ""} onClick={() => onSelect({ kind: "environment", index: activeScene })}><span>◉</span><strong>Environment</strong><small>world</small></button>{(experience.productRig?.nodes ?? []).map((node) => <button type="button" key={node} className={selection.kind === "node" && selection.name === node ? "active" : ""} onClick={() => onSelect({ kind: "node", index: activeScene, name: node })}><span>◇</span><strong>{node}</strong><small>rig</small></button>)}</div>;
  const assets = [...manifest.models.map((entry) => ({ ...entry, kind: "model" })), ...manifest.textures.map((entry) => ({ ...entry, kind: "texture" })), ...manifest.hdr.map((entry) => ({ ...entry, kind: "hdr" })), ...manifest.video.map((entry) => ({ ...entry, kind: "video" }))];
  return <div className="production-tree">{assets.length ? assets.map((asset, index) => <button type="button" key={`${asset.kind}-${asset.path}`} className={selection.kind === "asset" && selection.index === index ? "active" : ""} onClick={() => onSelect({ kind: "asset", index, sceneIndex: activeScene })}><span>▧</span><strong>{asset.path.split("/").pop()}</strong><small>{asset.kind}</small></button>) : <p className="production-empty">No banked assets yet. Import assets to begin.</p>}</div>;
}

function ContextualDirection({ context, capabilities, proposal, nextActions, onCapability }: {
  context: SelectionContext;
  capabilities: ResolvedCapability[];
  proposal: ForgeProposal | null;
  nextActions: NextAction[];
  onCapability: (capability: ResolvedCapability) => void;
}) {
  const directionLabel=context.kind==="camera" ? "CAMERA DIRECTION"
    : context.kind==="node" ? "OBJECT DIRECTION"
      : context.kind==="asset" ? "ASSET DIRECTION"
        : context.kind==="environment" ? "ENVIRONMENT DIRECTION"
          : "SCENE DIRECTION";
  const highestIssue=context.issues.find((issue)=>issue.severity==="blocker")
    ?? context.issues.find((issue)=>issue.severity==="warning")
    ?? context.issues[0];
  const recommendedIds=new Set(nextActions.map((item)=>item.capability.id));
  const primary=[...nextActions.map((item)=>item.capability),...capabilities.filter((item)=>!recommendedIds.has(item.id))].slice(0,3);
  const activeProposal=proposal?.selectionKey===context.selectionKey ? proposal : null;

  return <section className="production-context" data-kind={context.kind}>
    <span>{directionLabel}</span>
    <strong>{context.summary}</strong>
    <p>{highestIssue?.message ?? primary[0]?.description ?? "Forge has enough context to direct this selection without exposing subsystem machinery first."}</p>
    <div>
      {primary.map((capability,index)=><button
        key={capability.id}
        type="button"
        className={index===0 ? "primary" : undefined}
        title={capability.description}
        data-capability={capability.id}
        data-risk={capability.riskClass}
        onClick={()=>onCapability(capability)}
      >{capability.label}</button>)}
    </div>
    <small>{context.signals.join(" · ")}</small>
    {activeProposal && <div className="production-context__proposal" data-risk={activeProposal.riskClass}>
      <span>PROPOSAL · {activeProposal.riskClass.replaceAll("-"," ").toUpperCase()}</span>
      <strong>{activeProposal.intent.raw}</strong>
      <small>{activeProposal.verification.required.length ? `Verify: ${activeProposal.verification.required.join(" · ")}` : "No verification gate required before routing."}</small>
    </div>}
  </section>;
}

function Inspector({ selection, experience, setExperience, sceneIndex, archetype, setArchetype, applyArchetype, buildSelectedNode, resetSceneMotion, openAdvanced }: { selection: Selection; experience: ExperienceConfig; setExperience: ReturnType<typeof useStudioDraft>["setExperience"]; sceneIndex: number; archetype: MotionArchetypeName; setArchetype: (value: MotionArchetypeName) => void; applyArchetype: (value?: MotionArchetypeName) => void; buildSelectedNode: (node: string) => void; resetSceneMotion: () => void; openAdvanced: (target?:Workspace) => void }) {
  const scene = experience.scenes[sceneIndex];
  if (selection.kind === "camera") return <div className="production-inspector"><Section title="Lens"><label>Start FOV<input type="number" min="12" max="100" value={scene.camera.from.fov} onChange={(event) => updateScene(setExperience, sceneIndex, (current) => ({ ...current, camera: { ...current.camera, from: { ...current.camera.from, fov: Number(event.target.value) } } }))} /></label><label>End FOV<input type="number" min="12" max="100" value={scene.camera.to.fov} onChange={(event) => updateScene(setExperience, sceneIndex, (current) => ({ ...current, camera: { ...current.camera, to: { ...current.camera.to, fov: Number(event.target.value) } } }))} /></label></Section><Section title="Camera motion"><select value={archetype} onChange={(event) => setArchetype(event.target.value as MotionArchetypeName)}>{motionArchetypeCatalog.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><button type="button" className="primary" onClick={() => applyArchetype()}>Apply coordinated motion</button><button type="button" onClick={() => openAdvanced("Motion")}>Open camera sequencer</button></Section></div>;
  if (selection.kind === "node") return <div className="production-inspector"><Section title="Selected rig node"><div className="production-readout"><span>Target</span><strong>{selection.name}</strong></div><div className="production-readout"><span>Existing tracks</span><strong>{scene.motionTracks.filter((track) => track.target.startsWith(`rig:${selection.name}:`)).length}</strong></div></Section><Section title="Motion"><button type="button" className="primary" onClick={() => buildSelectedNode(selection.name)}>Build + reveal</button><button type="button" onClick={() => openAdvanced("Motion")}>Fine tune tracks</button></Section></div>;
  if (selection.kind === "environment") return <div className="production-inspector"><Section title="World"><label>Exposure<input type="range" min="0.2" max="2.5" step="0.01" value={scene.world.exposure} onChange={(event) => updateScene(setExperience, sceneIndex, (current) => ({ ...current, world: { ...current.world, exposure: Number(event.target.value) } }))} /></label><label>Key light<input type="range" min="0" max="10" step="0.05" value={scene.world.key} onChange={(event) => updateScene(setExperience, sceneIndex, (current) => ({ ...current, world: { ...current.world, key: Number(event.target.value) } }))} /></label><label>Ambient<input type="range" min="0" max="3" step="0.02" value={scene.world.ambient} onChange={(event) => updateScene(setExperience, sceneIndex, (current) => ({ ...current, world: { ...current.world, ambient: Number(event.target.value) } }))} /></label></Section><Section title="Post"><label>Bloom<input type="range" min="0" max="2" step="0.01" value={scene.post.bloom} onChange={(event) => updateScene(setExperience, sceneIndex, (current) => ({ ...current, post: { ...current.post, bloom: Number(event.target.value) } }))} /></label><label>Vignette<input type="range" min="0" max="1" step="0.01" value={scene.post.vignette} onChange={(event) => updateScene(setExperience, sceneIndex, (current) => ({ ...current, post: { ...current.post, vignette: Number(event.target.value) } }))} /></label></Section></div>;
  if (selection.kind === "asset") return <div className="production-inspector"><Section title="Asset"><p className="production-muted">Asset diagnostics, replacement and assignment use Forge&apos;s advanced asset tools.</p><button type="button" className="primary" onClick={() => openAdvanced("Assets")}>Open asset tools</button></Section></div>;
  return <div className="production-inspector"><Section title="Scene"><label>Name<input value={scene.label} onChange={(event) => updateScene(setExperience, sceneIndex, (current) => ({ ...current, label: event.target.value }))} /></label><label>Eyebrow<input value={scene.copy.eyebrow} onChange={(event) => updateScene(setExperience, sceneIndex, (current) => ({ ...current, copy: { ...current.copy, eyebrow: event.target.value } }))} /></label><label>Headline<textarea rows={3} value={scene.copy.headline} onChange={(event) => updateScene(setExperience, sceneIndex, (current) => ({ ...current, copy: { ...current.copy, headline: event.target.value } }))} /></label><label>Body<textarea rows={4} value={scene.copy.body} onChange={(event) => updateScene(setExperience, sceneIndex, (current) => ({ ...current, copy: { ...current.copy, body: event.target.value } }))} /></label></Section><Section title="Motion composer"><select value={archetype} onChange={(event) => setArchetype(event.target.value as MotionArchetypeName)}>{motionArchetypeCatalog.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><p className="production-muted">{motionArchetypeCatalog.find((item) => item.id === archetype)?.description}</p><button type="button" className="primary" onClick={() => applyArchetype()}>Apply motion</button><button type="button" onClick={resetSceneMotion}>Reset scene motion</button><button type="button" onClick={() => openAdvanced("Motion")}>Advanced sequencer</button></Section></div>;
}

function ReviewSurface({ health, nextActions, proposal, onRun, onBuildScene, onBuild, onAssets, onTelemetry }: {
  health:ReturnType<typeof evaluateProjectHealth>;
  nextActions:NextAction[];
  proposal:ForgeProposal|null;
  onRun:(capability:ResolvedCapability)=>void;
  onBuildScene:(index:number)=>void;
  onBuild:()=>void;
  onAssets:()=>void;
  onTelemetry:()=>void;
}) {
  const blockers=health.issues.filter((issue)=>issue.severity==="blocker").length;
  const warnings=health.issues.filter((issue)=>issue.severity==="warning").length;
  return <div className="production-primary-surface production-review-surface">
    <header className="production-surface-hero">
      <div><span>REVIEW / PROJECT HEALTH</span><h2>{health.status==="ready" ? "Ready for release review." : health.status==="blocked" ? "Resolve blockers before shipping." : "Production quality needs attention."}</h2><p>One health model combines validation, assets, motion, mobile and interaction readiness. Specialist audits remain underneath this surface.</p></div>
      <output data-health={health.status}>{Math.round(health.score)}/100 · {health.status.toUpperCase()}</output>
    </header>

    <section className="production-health-metrics" aria-label="Project health metrics">
      <article><span>Scenes</span><strong>{health.metrics.scenesWithMotion}/{health.metrics.scenes}</strong><small>with authored motion</small></article>
      <article><span>Mobile</span><strong>{health.metrics.scenesWithMobileCamera}/{health.metrics.scenes}</strong><small>with mobile camera</small></article>
      <article><span>Assets</span><strong>{Math.round(health.metrics.manifestHealth)}/100</strong><small>{health.metrics.registeredAssets} registered</small></article>
      <article><span>Interactions</span><strong>{health.metrics.interactionNodes}</strong><small>graph nodes</small></article>
    </section>

    <section className="production-health-issues">
      <div className="production-surface-section-head"><div><span>WHAT NEEDS ATTENTION</span><strong>{blockers} blocker{blockers===1?"":"s"} · {warnings} warning{warnings===1?"":"s"}</strong></div><button type="button" onClick={onBuild}>Back to Build</button></div>
      {health.issues.length ? health.issues.map((issue)=><article key={issue.id} data-severity={issue.severity}>
        <div><span>{issue.domain.toUpperCase()}</span><strong>{issue.title}</strong><p>{issue.detail}</p><small>{issue.recommendedAction}</small></div>
        <div>{typeof issue.sceneIndex==="number" && <button type="button" onClick={()=>onBuildScene(issue.sceneIndex!)}>Open scene</button>}{issue.domain==="assets" && <button type="button" onClick={onAssets}>Asset tools</button>}</div>
      </article>) : <div className="production-health-clear"><strong>No unresolved production-health issues.</strong><p>Forge still requires the normal release and real-device evidence appropriate to the project.</p></div>}
    </section>

    <section className="production-review-actions">
      <div className="production-surface-section-head"><div><span>RECOMMENDED</span><strong>Highest-value next actions</strong></div><button type="button" onClick={onTelemetry}>Real-device evidence</button></div>
      <div>{nextActions.map((action)=><button type="button" key={action.capability.id} data-urgency={action.urgency} onClick={()=>onRun(action.capability)}><span>{action.urgency.toUpperCase()}</span><strong>{action.capability.label}</strong><small>{action.reason}</small></button>)}</div>
      {proposal && <aside className="production-review-proposal"><span>ACTIVE PROPOSAL</span><strong>{proposal.intent.raw}</strong><small>{proposal.state} · {proposal.riskClass.replaceAll("-"," ")}</small></aside>}
    </section>
  </div>;
}

function ShipSurface({ draft, health, onReview, onVault, onTelemetry }: {
  draft:ReturnType<typeof useStudioDraft>;
  health:ReturnType<typeof evaluateProjectHealth>;
  onReview:()=>void;
  onVault:()=>void;
  onTelemetry:()=>void;
}) {
  const summary=health.status==="blocked"
    ? `${health.issues.filter((issue)=>issue.severity==="blocker").length} blocker${health.issues.filter((issue)=>issue.severity==="blocker").length===1?"":"s"} must be resolved in Review.`
    : health.status==="attention"
      ? `${health.issues.filter((issue)=>issue.severity==="warning").length} production warning${health.issues.filter((issue)=>issue.severity==="warning").length===1?"":"s"} remain in Review.`
      : "Project Health is ready.";
  return <div className="production-primary-surface production-ship-surface">
    <header className="production-surface-hero">
      <div><span>SHIP</span><h2>Review, checkpoint and release.</h2><p>Shipping stays simple because Project Health owns production readiness and the protected release pipeline owns authority.</p></div>
      <output data-health={health.status}>{Math.round(health.score)}/100 · {health.status.toUpperCase()}</output>
    </header>
    <div className="production-ship-actions"><button type="button" onClick={onReview}>Project Health</button><button type="button" onClick={onVault}>Project Vault</button><button type="button" onClick={onTelemetry}>Telemetry</button></div>
    <PublishPanel project={draft.project} setProject={draft.setProject} experience={draft.experience} assetManifest={draft.assetManifest} validationCount={draft.validation.length} healthReady={health.status==="ready"} healthSummary={summary} />
  </div>;
}

function AdvancedWorkspace({ workspace, draft, activeScene, setActiveScene, onClose }: { workspace: Workspace; draft: ReturnType<typeof useStudioDraft>; activeScene: number; setActiveScene: (index: number) => void; onClose: () => void }) {
  return <div className="production-advanced">
    <div className="production-advanced-head"><div><span>{workspace.toUpperCase()} / ADVANCED</span><strong>Full production controls</strong></div><button type="button" onClick={onClose}>← Back to Studio</button></div>
    {workspace === "Motion" ? <SequencerEditor experience={draft.experience} setExperience={draft.setExperience} active={activeScene} setActive={setActiveScene} beginGroup={draft.beginExperienceGroup} endGroup={draft.endExperienceGroup} undo={draft.undoExperience} redo={draft.redoExperience} canUndo={draft.canUndoExperience} canRedo={draft.canRedoExperience} /> : null}
    {workspace === "Interact" ? <InteractionGraphEditor graph={draft.interactionGraph} setGraph={draft.setInteractionGraph} /> : null}
    {workspace === "Assets" ? <div className="production-advanced-stack"><AssetManager setExperience={draft.setExperience} assetManifest={draft.assetManifest} setAssetManifest={draft.setAssetManifest} active={activeScene} /><AssetBankPanel experience={draft.experience} setExperience={draft.setExperience} assetManifest={draft.assetManifest} setAssetManifest={draft.setAssetManifest} interactionGraph={draft.interactionGraph} undo={draft.undoExperience} canUndo={draft.canUndoExperience} /><GlbInspectorPanel experience={draft.experience} setExperience={draft.setExperience} /></div> : null}
    {workspace === "Telemetry" ? <TelemetryPanel project={draft.project} setProject={draft.setProject} /> : null}
  </div>;
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



function slug(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64); }
