import type { DirectorBrief } from "@/src/platform/directorSchema";
import type { ExperienceConfig, SceneDefinition } from "@/src/types/experience";

export type HierarchyLayerId =
  | "strategic"
  | "narrative"
  | "section"
  | "information"
  | "visual"
  | "interaction"
  | "motion-spatial"
  | "semantic";

export type HierarchyStatus = "strong" | "watch" | "blocked";
export type HierarchySceneRole = "opening" | "primary" | "signature" | "proof" | "supporting" | "action" | "utility";
export type HierarchySeverity = "blocker" | "warning" | "note";

export interface HierarchyDiagnostic {
  layer: HierarchyLayerId;
  severity: HierarchySeverity;
  message: string;
  recommendation: string;
  sceneIndex?: number;
}

export interface HierarchyLayerAssessment {
  id: HierarchyLayerId;
  label: string;
  score: number;
  status: HierarchyStatus;
  rule: string;
  decision: string;
  diagnostics: HierarchyDiagnostic[];
}

export interface HierarchyScenePriority {
  sceneIndex: number;
  sceneId: string;
  label: string;
  role: HierarchySceneRole;
  narrativeBeat: string;
  productionWeight: number;
  visualIntensity: number;
  motionIntensity: number;
  informationDensity: number;
  interactionIntensity: number;
  directive: string;
}

export interface HierarchyReport {
  version: 1;
  projectType: DirectorBrief["projectType"];
  primaryObjective: string;
  primaryMemory: string;
  primaryAction: string;
  signatureSceneIndex: number;
  narrativeArc: string[];
  layers: HierarchyLayerAssessment[];
  scenePriorities: HierarchyScenePriority[];
  diagnostics: HierarchyDiagnostic[];
  overallScore: number;
  ready: boolean;
  governingRules: string[];
}

const layerLabels: Record<HierarchyLayerId, string> = {
  strategic: "Strategic",
  narrative: "Narrative",
  section: "Page / Section",
  information: "Information",
  visual: "Visual",
  interaction: "Interaction",
  "motion-spatial": "Motion / Spatial",
  semantic: "Semantic / Accessibility",
};

const layerRules: Record<HierarchyLayerId, string> = {
  strategic: "One primary objective, one primary memory and one primary action govern the experience.",
  narrative: "Every chapter must advance understanding, tension, proof or action; the experience cannot spend its climax repeatedly.",
  section: "Sections are not equal. Opening, signature, proof and conversion scenes receive deliberately different production weight.",
  information: "Reveal only what the visitor needs at the current beat; defer detail until desire and orientation have been established.",
  visual: "One dominant focal point per viewport/state. Supporting elements must visibly yield to the intended subject.",
  interaction: "One obvious next action at a time. Exploratory, contextual and utility interactions may support but not compete.",
  "motion-spatial": "One attention-driving motion system dominates at a time; secondary and ambient motion reduce when the primary move is active.",
  semantic: "The content order, meaning and primary action remain understandable without cinematic effects or pointer-dependent behavior.",
};

const narrativePatterns: Record<DirectorBrief["projectType"], string[]> = {
  brand: ["Intrigue", "Recognition", "Contrast", "Proof", "Signature", "Commitment"],
  product: ["Desire", "Reveal", "Craftsmanship", "Proof", "Ownership", "Action"],
  property: ["Place", "Arrival", "Architecture", "Residence", "Lifestyle", "Inquiry"],
  hospitality: ["Escape", "Destination", "Spaces", "Experience", "Stillness", "Reserve"],
  portfolio: ["Flagship Work", "Pattern", "Point of View", "Process", "Proof", "Inquiry"],
  saas: ["Problem", "Promise", "Product", "Mechanism", "Proof", "Conversion"],
  commerce: ["Desire", "Product", "Proof", "Selection", "Ownership", "Purchase"],
  campaign: ["Hook", "Tension", "Participation", "Reveal", "Response", "Action"],
  automotive: ["Identity", "Reveal", "Performance", "Engineering", "Interior", "Configure"],
  fashion: ["Identity", "Silhouette", "Material", "Collection", "Editorial Proof", "Shop"],
};

export function buildHierarchyReport(input: {
  idea: string;
  experience: ExperienceConfig;
  signatureMoment: string;
  primaryAction?: string;
  projectType?: DirectorBrief["projectType"];
  signatureSceneIndex?: number;
}): HierarchyReport {
  const projectType = input.projectType ?? inferHierarchyProjectType(input.idea, input.experience);
  const narrativeArc = narrativePatterns[projectType];
  const sceneCount = input.experience.scenes.length;
  const signatureSceneIndex = clampIndex(
    input.signatureSceneIndex ?? Math.round(Math.max(0, sceneCount - 1) * 0.62),
    sceneCount,
  );
  const primaryObjective = concise(input.idea) || `Create a memorable ${projectType} experience.`;
  const primaryMemory = concise(input.signatureMoment) || "One unmistakable moment should carry the memory of the experience.";
  const primaryAction = concise(input.primaryAction ?? "Continue exploring") || "Continue exploring";
  const diagnostics = evaluateHierarchy({
    idea: input.idea,
    experience: input.experience,
    signatureSceneIndex,
    primaryAction,
  });
  const scenePriorities = buildScenePriorities(input.experience, narrativeArc, signatureSceneIndex);
  const layers = buildLayerAssessments(diagnostics, scenePriorities, primaryObjective, primaryMemory, primaryAction);
  const overallScore = Number((layers.reduce((total, layer) => total + layer.score, 0) / layers.length).toFixed(1));
  const ready = !diagnostics.some((item) => item.severity === "blocker");

  return {
    version: 1,
    projectType,
    primaryObjective,
    primaryMemory,
    primaryAction,
    signatureSceneIndex,
    narrativeArc,
    layers,
    scenePriorities,
    diagnostics,
    overallScore,
    ready,
    governingRules: [
      "Importance propagates downward: strategy controls narrative; narrative controls scene weight; scene weight controls visual, motion, interaction and asset spend.",
      "The signature scene receives the strongest asset, camera treatment and motion budget while nearby scenes deliberately reduce competition.",
      "Primary motion suppresses secondary and ambient motion during the same attention window.",
      "A scene may be beautiful and still be cut if it does not advance understanding, tension, proof or action.",
      "The experience must remain understandable with reduced motion and without hover/pointer discovery.",
    ],
  };
}

export function inferHierarchyProjectType(idea: string, experience: ExperienceConfig): DirectorBrief["projectType"] {
  const text = `${idea} ${experience.meta.name} ${experience.meta.description} ${experience.scenes.map((scene) => `${scene.label} ${scene.copy.headline} ${scene.copy.body}`).join(" ")}`.toLowerCase();
  const patterns: Array<[DirectorBrief["projectType"], RegExp]> = [
    ["property", /\b(property|residence|residences|apartment|apartments|tower|real estate|condo|penthouse|architecture|architectural)\b/],
    ["hospitality", /\b(hotel|resort|hospitality|stay|suite|restaurant|dining|spa|destination)\b/],
    ["automotive", /\b(car|vehicle|automotive|motor|engine|driving|road|wheel)\b/],
    ["fashion", /\b(fashion|apparel|garment|collection|runway|lookbook|shoe|sneaker|wear)\b/],
    ["saas", /\b(saas|software|platform|dashboard|workflow|productivity|api|automation|app)\b/],
    ["commerce", /\b(shop|store|ecommerce|e-commerce|buy|purchase|cart|checkout|collection)\b/],
    ["portfolio", /\b(portfolio|studio|agency|case study|case studies|selected work|projects)\b/],
    ["campaign", /\b(campaign|launch campaign|activation|event|drop|awareness)\b/],
    ["product", /\b(product|watch|bottle|fragrance|headphone|device|object|assembly|explode|exploded)\b/],
  ];
  for (const [type, pattern] of patterns) if (pattern.test(text)) return type;
  if (experience.productRig?.nodes.length || experience.heroModel) return "product";
  return "brand";
}

function evaluateHierarchy(input: {
  idea: string;
  experience: ExperienceConfig;
  signatureSceneIndex: number;
  primaryAction: string;
}) {
  const diagnostics: HierarchyDiagnostic[] = [];
  const scenes = input.experience.scenes;
  const signature = scenes[input.signatureSceneIndex];

  if (input.idea.trim().length < 12) diagnostics.push(diag("strategic", "blocker", "The primary objective is too vague to govern downstream hierarchy.", "Describe the visitor outcome in one sentence before allocating scene, motion or asset priority."));
  if (input.primaryAction.trim().length < 2) diagnostics.push(diag("strategic", "blocker", "The experience has no usable primary action.", "Define one final action such as reserve, inquire, configure, buy or continue exploring."));
  if (scenes.length === 1) diagnostics.push(diag("narrative", "warning", "A single scene can work as a hero, but it cannot express a full narrative hierarchy.", "Treat this as a focused hero experience or add only the beats needed for proof and action."));
  if (scenes.length > 10) diagnostics.push(diag("narrative", "warning", `${scenes.length} scenes increase the risk of equalized pacing and repeated climaxes.`, "Group supporting beats and protect one signature scene from intensity fatigue."));

  const duplicateHeadlines = duplicateNonEmpty(scenes.map((scene) => scene.copy.headline.trim().toLowerCase()));
  if (duplicateHeadlines.length) diagnostics.push(diag("information", "warning", "Multiple scenes repeat the same headline, weakening progressive disclosure.", "Give each scene one distinct information job instead of restating the same claim."));

  scenes.forEach((scene, index) => {
    const words = wordCount(`${scene.copy.headline} ${scene.copy.body}`);
    if (words > 95) diagnostics.push(diag("information", "warning", `${scene.label} carries ${words} words during a cinematic beat.`, "Move secondary detail into a quieter proof/utility state or shorten the scene copy.", index));
    if (!scene.copy.headline.trim()) diagnostics.push(diag("semantic", "warning", `${scene.label} has no clear headline.`, "Give the scene a meaningful text anchor so the content still makes sense without motion.", index));
    const attention = sceneAttentionLoad(scene);
    if (attention >= 13 && index !== input.signatureSceneIndex) diagnostics.push(diag("visual", "warning", `${scene.label} has a high attention load for a non-signature scene.`, "Reduce competing media layers, blocks or motion so the signature moment remains visibly dominant.", index));
    if (scene.motionTracks.length > 10 && index !== input.signatureSceneIndex) diagnostics.push(diag("motion-spatial", "warning", `${scene.label} carries ${scene.motionTracks.length} motion tracks outside the signature moment.`, "Demote secondary motion and keep one dominant movement system for this beat.", index));
  });

  if (signature) {
    const signatureMotion = signature.motionTracks.length;
    const louderSupporting = scenes.filter((scene, index) => index !== input.signatureSceneIndex && scene.motionTracks.length > signatureMotion + 2);
    if (louderSupporting.length) diagnostics.push(diag("motion-spatial", "warning", "Supporting scenes currently carry materially more authored motion than the signature scene.", "Either strengthen the signature movement or deliberately quiet the louder supporting scenes."));
  }

  const orderCards = scenes.flatMap((scene, sceneIndex) => scene.blocks.filter((block) => block.type === "order-card").map(() => sceneIndex));
  if (orderCards.length > 1) diagnostics.push(diag("interaction", "warning", "More than one scene contains a purchase/action card, which can create competing primary actions.", "Choose one primary conversion scene; keep earlier actions secondary or contextual."));
  const hotspots = input.experience.hotspots?.length ?? 0;
  if (hotspots > 8) diagnostics.push(diag("interaction", "warning", `${hotspots} hotspots can make exploratory interaction compete with the main journey.`, "Expose only the highest-value discoveries in the primary path and demote the rest to optional inspection."));

  const first = scenes[0];
  if (first && wordCount(first.copy.body) > 60) diagnostics.push(diag("information", "note", "The opening carries a relatively dense body block.", "Consider allowing the opening visual thesis to land before explanatory detail."));

  return diagnostics;
}

function buildScenePriorities(experience: ExperienceConfig, narrativeArc: string[], signatureSceneIndex: number): HierarchyScenePriority[] {
  const last = Math.max(0, experience.scenes.length - 1);
  return experience.scenes.map((scene, sceneIndex) => {
    const role = sceneRole(scene, sceneIndex, last, signatureSceneIndex);
    const narrativeBeat = narrativeArc[Math.min(narrativeArc.length - 1, Math.round((sceneIndex / Math.max(1, last)) * (narrativeArc.length - 1)))];
    const base = roleBudget(role);
    const words = wordCount(`${scene.copy.headline} ${scene.copy.body}`);
    const informationDensity = clamp(Math.round(words / 12) + (scene.blocks.length ? 2 : 0), 2, 10);
    return {
      sceneIndex,
      sceneId: scene.id,
      label: scene.label,
      role,
      narrativeBeat,
      productionWeight: base.production,
      visualIntensity: base.visual,
      motionIntensity: base.motion,
      informationDensity,
      interactionIntensity: role === "action" ? 8 : role === "utility" ? 6 : role === "signature" ? 5 : 3,
      directive: sceneDirective(role),
    };
  });
}

function buildLayerAssessments(
  diagnostics: HierarchyDiagnostic[],
  scenes: HierarchyScenePriority[],
  primaryObjective: string,
  primaryMemory: string,
  primaryAction: string,
): HierarchyLayerAssessment[] {
  const decisions: Record<HierarchyLayerId, string> = {
    strategic: `Objective: ${primaryObjective} Memory: ${primaryMemory} Action: ${primaryAction}`,
    narrative: `Use contrast in pacing and reserve the highest intensity for ${scenes.find((scene) => scene.role === "signature")?.label ?? "one signature scene"}.`,
    section: "Opening earns attention, signature earns craft, proof earns credibility, and the final action earns clarity; supporting sections remain visibly quieter.",
    information: "Progressively disclose detail. Desire/orientation precede proof; proof precedes high-friction conversion detail.",
    visual: "Scale, contrast, position, whitespace, lighting, depth and motion all contribute to dominance; font size alone does not define visual priority.",
    interaction: "Primary interaction advances the journey. Exploratory, contextual, utility and ambient interactions remain subordinate.",
    "motion-spatial": "Primary motion owns its attention window. Secondary, ambient and utility motion reduce while that move is active.",
    semantic: "Preserve meaningful content order, labels, actions and reduced-motion comprehension independently of spectacle.",
  };
  return (Object.keys(layerLabels) as HierarchyLayerId[]).map((id) => {
    const layerDiagnostics = diagnostics.filter((item) => item.layer === id);
    const score = scoreLayer(layerDiagnostics);
    return {
      id,
      label: layerLabels[id],
      score,
      status: score < 6 ? "blocked" : score < 8.5 ? "watch" : "strong",
      rule: layerRules[id],
      decision: decisions[id],
      diagnostics: layerDiagnostics,
    };
  });
}

function sceneRole(scene: SceneDefinition, index: number, last: number, signature: number): HierarchySceneRole {
  if (index === signature) return "signature";
  if (index === 0) return "opening";
  if (scene.blocks.some((block) => block.type === "order-card")) return "action";
  if (index === last) return "action";
  if (index === Math.max(1, signature - 1)) return "proof";
  if (index < signature) return "primary";
  return "supporting";
}

function roleBudget(role: HierarchySceneRole) {
  const table: Record<HierarchySceneRole, { production: number; visual: number; motion: number }> = {
    opening: { production: 72, visual: 7, motion: 5 },
    primary: { production: 62, visual: 6, motion: 6 },
    signature: { production: 100, visual: 10, motion: 10 },
    proof: { production: 66, visual: 6, motion: 4 },
    supporting: { production: 44, visual: 4, motion: 3 },
    action: { production: 68, visual: 6, motion: 3 },
    utility: { production: 34, visual: 3, motion: 2 },
  };
  return table[role];
}

function sceneDirective(role: HierarchySceneRole) {
  if (role === "signature") return "Spend the strongest asset, camera treatment and lighting change here; remove nearby competition.";
  if (role === "opening") return "Establish the visual rule and promise without spending the climax early.";
  if (role === "proof") return "Increase credibility and specificity; reduce spectacle so evidence is easy to read.";
  if (role === "action") return "Resolve visual complexity and make the primary action unmistakable.";
  if (role === "primary") return "Advance the thesis with one clear subject and one dominant behavior.";
  if (role === "utility") return "Prioritize clarity, speed and accessibility over cinematic novelty.";
  return "Support the main arc without matching the signature scene's intensity or asset spend.";
}

function sceneAttentionLoad(scene: SceneDefinition) {
  return clamp(
    Math.round(scene.motionTracks.length * 0.55 + scene.blocks.length * 1.6 + (scene.media ? 2 : 0) + (scene.media?.layers.length ?? 0) * 1.2),
    0,
    20,
  );
}

function scoreLayer(items: HierarchyDiagnostic[]) {
  let score = 10;
  for (const item of items) {
    if (item.severity === "blocker") score -= 4;
    else if (item.severity === "warning") score -= 1.4;
    else score -= 0.25;
  }
  return Number(clamp(score, 0, 10).toFixed(1));
}

function diag(layer: HierarchyLayerId, severity: HierarchySeverity, message: string, recommendation: string, sceneIndex?: number): HierarchyDiagnostic {
  return { layer, severity, message, recommendation, sceneIndex };
}

function duplicateNonEmpty(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].filter(([, count]) => count > 1).map(([value]) => value);
}

function wordCount(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

function concise(value: string) {
  return value.trim().replace(/\s+/g, " ").slice(0, 500);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function clampIndex(value: number, length: number) {
  return Math.max(0, Math.min(Math.max(0, length - 1), Math.round(value)));
}
