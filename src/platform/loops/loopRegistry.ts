import { loopDefinitionSchema, type LoopDefinition } from "@/src/platform/loops/loopSchema";

const common={
  version:1 as const,
  acceptance:{
    requireHardGates:true as const,
    requireCandidateWin:true as const,
    minPreferenceAgreement:0.67,
    maxMotionRegression:3,
  },
  memory:{
    runEvidence:true as const,
    projectJournal:"summary" as const,
    forgeLearning:"manual-promotion" as const,
  },
  humanGates:[
    "Never overwrite the authoritative production experience automatically.",
    "Human approval is required before a loop artifact replaces a Project Vault checkpoint or production config.",
    "Global Forge doctrine changes require separate evidence and explicit promotion.",
  ],
};

const definitions:LoopDefinition[]=[
  {
    ...common,
    id:"visual-polish",
    label:"Visual Polish",
    description:"Improve composition, camera, typography timing and presentation while preserving semantics, identity and functional behavior.",
    objective:"Produce a visibly stronger version of the current experience without changing client facts, conversion strategy, scene meaning or signature asset identity.",
    worker:"visual-repair",
    executable:true,
    verifiers:["schema","functional","motion","mobile","visual"],
    allowedRepairCommands:["scene.adjustPresentation","motion.applyArchetype","camera.applyChoreography"],
    strategies:[
      { id:"hierarchy-first",label:"Hierarchy first",instruction:"Prioritize focal hierarchy, negative space, crop, copy/subject separation and restrained presentation. Preserve the defining visual idea." },
      { id:"camera-first",label:"Camera first",instruction:"Prioritize lens character, framing, motivated camera travel and subject presence. Avoid gratuitous movement or changing narrative meaning." },
      { id:"cadence-first",label:"Cadence first",instruction:"Prioritize reveal timing, copy arrival, transition continuity and visual cadence while preserving layout semantics and conversion order." },
    ],
    budgets:{ maxCycles:3,maxCandidatesPerCycle:3,maxCandidateAttempts:9,maxWallTimeMs:900_000,noProgressLimit:1 },
  },
  {
    ...common,
    id:"mobile-translation",
    label:"Mobile Translation",
    description:"Preserve the desktop concept on narrow viewports by re-composing rather than deleting the signature idea.",
    objective:"Strengthen mobile hierarchy, framing, camera, media crop and pacing so the same narrative and signature moment survive on a phone.",
    worker:"visual-repair",
    executable:true,
    verifiers:["schema","functional","motion","mobile","visual"],
    allowedRepairCommands:["scene.adjustPresentation","motion.applyArchetype","camera.applyChoreography"],
    strategies:[
      { id:"mobile-composition",label:"Mobile composition",instruction:"Judge mobile first. Repair crop, negative space, type/subject separation and visual hierarchy without flattening the concept into a generic stacked layout." },
      { id:"mobile-camera",label:"Mobile camera",instruction:"Judge mobile first. Reduce or redirect camera travel only when necessary to preserve subject readability, orientation and the intended cinematic beat." },
      { id:"mobile-cadence",label:"Mobile cadence",instruction:"Judge mobile first. Preserve the emotional sequence and signature reveal while adapting timing, overlap and copy arrival to the narrower viewport." },
    ],
    budgets:{ maxCycles:3,maxCandidatesPerCycle:3,maxCandidateAttempts:9,maxWallTimeMs:900_000,noProgressLimit:1 },
  },
  {
    ...common,
    id:"motion-polish",
    label:"Motion Polish",
    description:"Improve continuity, camera motivation, easing and reveal timing without destabilizing deterministic forward/reverse behavior.",
    objective:"Produce cleaner mechanical motion and stronger cinematic cadence while preserving deterministic state reconstruction and scene semantics.",
    worker:"visual-repair",
    executable:true,
    verifiers:["schema","functional","motion","mobile","visual"],
    allowedRepairCommands:["motion.applyArchetype","camera.applyChoreography"],
    strategies:[
      { id:"continuity-first",label:"Continuity first",instruction:"Prioritize boundary continuity, reversible state, motivated handoffs and elimination of abrupt spatial or temporal changes." },
      { id:"camera-cadence",label:"Camera cadence",instruction:"Prioritize camera velocity, lens/framing rhythm, settling behavior and coordination with subject movement." },
      { id:"type-timing",label:"Type timing",instruction:"Prioritize typography arrival, hold time and relationship to camera and object motion. Do not trade reading order for decorative motion." },
    ],
    budgets:{ maxCycles:3,maxCandidatesPerCycle:3,maxCandidateAttempts:9,maxWallTimeMs:900_000,noProgressLimit:1 },
  },
  {
    ...common,
    id:"performance",
    label:"Performance",
    description:"Profile dominant runtime cost, apply the lowest-risk optimization, and reject visual or interaction regressions.",
    objective:"Improve real runtime efficiency without degrading the authored visual concept, interaction contract or accessibility.",
    worker:"performance-repair",
    executable:true,
    verifiers:["schema","functional","performance","mobile","visual"],
    allowedRepairCommands:["scene.adjustPresentation"],
    strategies:[
      { id:"pixel-pressure",label:"Pixel pressure",instruction:"Use measured frame and renderer evidence to reduce peak DPR/pixel cost first. Preserve scene structure, identity, interaction and accessibility." },
      { id:"balanced-budget",label:"Balanced runtime budget",instruction:"Use measured evidence to make a smaller DPR/pixel/preload adjustment that protects visual fidelity while still requiring a measurable runtime improvement." },
    ],
    budgets:{ maxCycles:4,maxCandidatesPerCycle:2,maxCandidateAttempts:8,maxWallTimeMs:1_200_000,noProgressLimit:2 },
  },
  {
    ...common,
    id:"asset-quality",
    label:"Asset Quality",
    description:"Inspect production assets, regenerate or repair bounded deficiencies, and preserve project identity and licensing constraints.",
    objective:"Raise asset suitability for the authored camera/material role without silently replacing client-approved identity-critical content.",
    worker:"asset-repair",
    executable:false,
    verifiers:["schema","assets","performance","visual"],
    allowedRepairCommands:["scene.adjustPresentation"],
    strategies:[
      { id:"production-suitability",label:"Production suitability",instruction:"Prioritize geometry, topology, materials, texture resolution, rig semantics and camera suitability before aesthetic variation." },
    ],
    budgets:{ maxCycles:3,maxCandidatesPerCycle:3,maxCandidateAttempts:9,maxWallTimeMs:1_800_000,noProgressLimit:1 },
  },
  {
    ...common,
    id:"construction",
    label:"Construction",
    description:"Iterate from brief through structure and rendered verification using the full Forge production stack.",
    objective:"Construct a verified final-cut candidate from a grounded brief, then keep only changes that improve rendered output without breaking functional, mobile, performance or accessibility gates.",
    worker:"construction",
    executable:false,
    verifiers:["schema","functional","assets","motion","mobile","performance","accessibility","visual"],
    allowedRepairCommands:["scene.adjustPresentation","motion.applyArchetype","camera.applyChoreography"],
    strategies:[
      { id:"full-system",label:"Full-system construction",instruction:"Resolve hierarchy and asset blockers before polish. Build the smallest coherent system that satisfies the creative thesis and production contract." },
    ],
    budgets:{ maxCycles:5,maxCandidatesPerCycle:3,maxCandidateAttempts:15,maxWallTimeMs:3_600_000,noProgressLimit:2 },
  },
].map((definition)=>loopDefinitionSchema.parse(definition));

export const loopDefinitions=definitions;
export function loopDefinition(id:string) { return definitions.find((item)=>item.id===id) ?? null; }
export function executableLoopDefinitions() { return definitions.filter((item)=>item.executable); }
