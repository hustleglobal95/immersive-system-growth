export type StudioActionabilityMode = "author" | "execute" | "navigate" | "review-only";

export interface StudioActionabilityContract {
  id:string;
  label:string;
  mode:StudioActionabilityMode;
  source:string;
  evidence:string[];
  browserEvidence:string;
  guarded?:boolean;
}

export const studioActionabilityContracts:readonly StudioActionabilityContract[] = [
  {
    id:"build.scene",
    label:"Scene content",
    mode:"author",
    source:"src/studio/ControlPlaneSurfaces.tsx",
    evidence:["setExperience","Headline","Body"],
    browserEvidence:"Build keeps the live experience central and edits the selected scene",
  },
  {
    id:"build.camera",
    label:"Camera",
    mode:"author",
    source:"src/studio/ControlPlaneSurfaces.tsx",
    evidence:["Camera path","Camera start FOV","updateScene"],
    browserEvidence:"Build camera inspector directly edits shots and hands off to targeted Animate",
  },
  {
    id:"build.environment",
    label:"Environment",
    mode:"author",
    source:"src/studio/ControlPlaneSurfaces.tsx",
    evidence:["Environment exposure","Environment key light","Environment bloom"],
    browserEvidence:"Build environment inspector directly edits lighting and atmosphere",
  },
  {
    id:"build.copy",
    label:"Copy",
    mode:"author",
    source:"src/studio/ControlPlaneSurfaces.tsx",
    evidence:["Eyebrow","Headline","Body","copy.opacity"],
    browserEvidence:"Build keeps the live experience central and edits the selected scene",
  },
  {
    id:"build.media",
    label:"Media",
    mode:"author",
    source:"src/studio/ControlPlaneSurfaces.tsx",
    evidence:["Media transition","Media desktop position","media.reveal"],
    browserEvidence:"Build media inspector directly edits presentation when media exists",
  },
  {
    id:"build.node",
    label:"Selected rig object",
    mode:"author",
    source:"src/studio/ControlPlaneSurfaces.tsx",
    evidence:["Animate this part","rig:${node}:position","rig:${node}:rotation"],
    browserEvidence:"Build rig inspector targets the selected part in simple Animate",
  },
  {
    id:"build.asset",
    label:"Selected asset",
    mode:"navigate",
    source:"src/studio/ControlPlaneSurfaces.tsx",
    evidence:["Replace / optimize / inspect","openAdvanced(\"Assets\")"],
    browserEvidence:"Build asset inspector opens actionable Asset tools",
  },
  {
    id:"build.animate",
    label:"Simple Animate",
    mode:"author",
    source:"src/studio/AnimatePanel.tsx",
    evidence:["Add property track","Apply to scene","updateSelectedTrack","onPreviewProgress"],
    browserEvidence:"Build Animate provides direct motion authoring before the expert sequencer",
  },
  {
    id:"advanced.motion",
    label:"Motion Sequencer",
    mode:"author",
    source:"src/studio/SequencerEditor.tsx",
    evidence:["Motion sequencer","commitTracks","keyframes"],
    browserEvidence:"Advanced Sequencer preserves expert motion control",
  },
  {
    id:"advanced.interactions",
    label:"Interaction Graph",
    mode:"author",
    source:"src/studio/InteractionGraphEditor.tsx",
    evidence:["setGraph","Add trigger","Interaction graph"],
    browserEvidence:"Advanced Interactions preserves deterministic graph authoring",
  },
  {
    id:"advanced.assets",
    label:"Asset tools",
    mode:"author",
    source:"src/studio/AssetManager.tsx",
    evidence:["setExperience","setAssetManifest","type=\"file\""],
    browserEvidence:"Advanced Asset tools can stage a file and mutate project asset state",
  },
  {
    id:"advanced.asset-bank",
    label:"Asset Bank",
    mode:"author",
    source:"src/studio/AssetBankPanel.tsx",
    evidence:["setExperience","setAssetManifest","applyKit"],
    browserEvidence:"kit replacement requires review, blocks incompatible interactions and supports undo",
  },
  {
    id:"advanced.glb-inspector",
    label:"GLB Inspector",
    mode:"author",
    source:"src/studio/GlbInspectorPanel.tsx",
    evidence:["setExperience","Create deterministic rig tracks"],
    browserEvidence:"GLB Inspector creates deterministic rig tracks from a staged model",
  },
  {
    id:"advanced.visual-effects",
    label:"Visual Effects",
    mode:"author",
    source:"src/studio/CinematicSystemsPanel.tsx",
    evidence:["LIVE DRAFT","setManifest","Warp mode","Refraction mode","Transition effect"],
    browserEvidence:"Advanced Visual effects authors cursor reveal and visual physics without permanent navigation",
  },
  {
    id:"advanced.telemetry",
    label:"Telemetry",
    mode:"author",
    source:"src/studio/ProjectPanels.tsx",
    evidence:["Telemetry policy","setProject","Sample rate"],
    browserEvidence:"Advanced Telemetry mutates policy without permanent navigation",
  },
  {
    id:"mission-control",
    label:"Mission Control",
    mode:"execute",
    source:"src/studio/OperatorMissionControl.tsx",
    evidence:["onExecuteStep","onApproveDecision","Autopilot"],
    browserEvidence:"Mission Control promotes project-wide outcomes without adding navigation",
  },
  {
    id:"guided-build",
    label:"Guided Build",
    mode:"author",
    source:"src/studio/StudioWorkflowGuide.tsx",
    evidence:["STUDIO_GUIDE_BRIEF_KEY","onClose","localStorage.setItem"],
    browserEvidence:"Guided Build persists a project brief and returns to production",
  },
  {
    id:"proposal-review",
    label:"Current / Candidate Review",
    mode:"execute",
    source:"src/studio/ControlPlaneReview.tsx",
    evidence:["Accept candidate","Reject","onAccept","onReject"],
    browserEvidence:"Build prepares a reversible fast proposal before applying motion",
  },
  {
    id:"review",
    label:"Project Health Review",
    mode:"review-only",
    source:"src/studio/ControlPlaneSurfaces.tsx",
    evidence:["REVIEW / PROJECT HEALTH","WHAT NEEDS ATTENTION","RECOMMENDED"],
    browserEvidence:"Review makes Project Health the readiness control room",
  },
  {
    id:"ship",
    label:"Ship",
    mode:"execute",
    source:"src/studio/ProjectPanels.tsx",
    evidence:["/api/studio/publish","Create review","healthReady"],
    browserEvidence:"Ship honors Project Health and keeps protected publishing guided",
    guarded:true,
  },
  {
    id:"vault",
    label:"Project Vault",
    mode:"execute",
    source:"src/studio/StudioVaultPanel.tsx",
    evidence:["method: \"POST\"","Save to Project Vault","restore"],
    browserEvidence:"Project Vault exposes durable save actions and explicit configuration state",
    guarded:true,
  },
  {
    id:"loop",
    label:"Loop Engine",
    mode:"execute",
    source:"src/studio/LoopEnginePanel.tsx",
    evidence:["Run improvement","/api/studio/loops/run","Remote runner not configured"],
    browserEvidence:"Improvement evidence keeps the Loop Engine executable or explicitly fail-closed",
    guarded:true,
  },
  {
    id:"new-project",
    label:"New Project",
    mode:"execute",
    source:"src/studio/ProductionStudioWorkbench.tsx",
    evidence:["startProject","created from zero","setCinematicSystems"],
    browserEvidence:"New Project starts from isolated project state",
  },
  {
    id:"command-palette",
    label:"Command Palette",
    mode:"navigate",
    source:"src/studio/ProductionStudioWorkbench.tsx",
    evidence:["commandPaletteOpen","Forge command","Direct"],
    browserEvidence:"Studio exposes the guided product shell and keyboard command palette",
  },
] as const;

export const STUDIO_ACTIONABILITY_TARGET = 100;

export function studioActionabilityPercent(covered:number,total=studioActionabilityContracts.length) {
  return total===0 ? 0 : Math.round((covered/total)*10000)/100;
}
