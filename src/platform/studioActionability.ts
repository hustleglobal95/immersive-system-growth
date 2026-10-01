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
    id:"design.canvas",
    label:"Website Canvas",
    mode:"author",
    source:"src/studio/ForgeEditor.tsx",
    evidence:["StudioLivePreview","setSceneCopy","addScene","forge-next__canvas"],
    browserEvidence:"Forge opens as a canvas-first website editor",
  },
  {
    id:"design.ai-build",
    label:"AI Build",
    mode:"author",
    source:"src/studio/ForgeEditor.tsx",
    evidence:["Interactive3DBuildDock","AI Build","onPreview","onApply"],
    browserEvidence:"AI Build opens from the canvas and stages a candidate",
  },
  {
    id:"editor.references",
    label:"Website References",
    mode:"author",
    source:"src/studio/ReferenceWorkbench.tsx",
    evidence:["PROJECT REFERENCES","Import analysis JSON","Analyze screenshots","/api/studio/references/analyze","FORGE IMPLEMENTATION MAP","studioReferenceFromCorpus"],
    browserEvidence:"References workspace persists evidence-directed rules and feeds AI Build",
  },
  {
    id:"editor.motion",
    label:"Motion Sequencer",
    mode:"author",
    source:"src/studio/SequencerEditor.tsx",
    evidence:["Motion sequencer","commitTracks","keyframes"],
    browserEvidence:"Motion workspace preserves expert motion control",
  },
  {
    id:"editor.interactions",
    label:"Interaction Graph",
    mode:"author",
    source:"src/studio/InteractionGraphEditor.tsx",
    evidence:["setGraph","Add trigger","Interaction graph"],
    browserEvidence:"Interactions workspace preserves deterministic graph authoring",
  },
  {
    id:"editor.assets",
    label:"Asset Intake",
    mode:"author",
    source:"src/studio/AssetManager.tsx",
    evidence:["setExperience","setAssetManifest","type=\"file\""],
    browserEvidence:"Assets workspace can stage a file and mutate project asset state",
  },
  {
    id:"editor.asset-bank",
    label:"Asset Bank",
    mode:"author",
    source:"src/studio/AssetBankPanel.tsx",
    evidence:["setExperience","setAssetManifest","applyKit"],
    browserEvidence:"kit replacement requires review, blocks incompatible interactions and supports undo",
  },
  {
    id:"editor.glb-inspector",
    label:"GLB Inspector",
    mode:"author",
    source:"src/studio/GlbInspectorPanel.tsx",
    evidence:["setExperience","Create deterministic rig tracks"],
    browserEvidence:"GLB Inspector creates deterministic rig tracks from a staged model",
  },
  {
    id:"editor.visual-effects",
    label:"Visual Effects",
    mode:"author",
    source:"src/studio/CinematicSystemsPanel.tsx",
    evidence:["LIVE DRAFT","setManifest","Warp mode","Refraction mode","Transition effect"],
    browserEvidence:"Effects workspace authors cursor reveal and visual physics",
  },
  {
    id:"editor.telemetry",
    label:"Performance",
    mode:"author",
    source:"src/studio/ProjectPanels.tsx",
    evidence:["Telemetry policy","setProject","Sample rate"],
    browserEvidence:"Performance quality tool mutates telemetry policy",
  },
  {
    id:"editor.discoverability",
    label:"Search and AI",
    mode:"author",
    source:"src/studio/DiscoverabilityPanel.tsx",
    evidence:["Discoverability contract","setProject","Allow AI search crawlers"],
    browserEvidence:"Search and AI quality tool mutates discoverability policy and Project Health",
  },
  {
    id:"ship",
    label:"Publish",
    mode:"execute",
    source:"src/studio/ProjectPanels.tsx",
    evidence:["/api/studio/publish","Create review","healthReady"],
    browserEvidence:"Publish honors Project Health and keeps release authority protected",
    guarded:true,
  },
  {
    id:"vault",
    label:"Project Versions",
    mode:"execute",
    source:"src/studio/StudioVaultPanel.tsx",
    evidence:["method: \"POST\"","Save to Project Vault","restore"],
    browserEvidence:"Project Vault exposes durable save actions and explicit configuration state",
    guarded:true,
  },
  {
    id:"loop",
    label:"Improvement Engine",
    mode:"execute",
    source:"src/studio/LoopEnginePanel.tsx",
    evidence:["Run improvement","/api/studio/loops/run","Remote runner not configured"],
    browserEvidence:"Improvement engine remains executable from the new Forge editor",
    guarded:true,
  },
  {
    id:"new-project",
    label:"New Website",
    mode:"execute",
    source:"src/studio/ForgeEditor.tsx",
    evidence:["startProject","setCinematicSystems","New website"],
    browserEvidence:"New website starts from isolated project state",
  },
  {
    id:"command-palette",
    label:"Command Palette",
    mode:"navigate",
    source:"src/studio/ForgeEditor.tsx",
    evidence:["commandOpen","Forge command","runCommand"],
    browserEvidence:"Command palette navigates the new Forge editor",
  },
] as const;

export const STUDIO_ACTIONABILITY_TARGET = 100;

export function studioActionabilityPercent(covered:number,total=studioActionabilityContracts.length) {
  return total===0 ? 0 : Math.round((covered/total)*10000)/100;
}
