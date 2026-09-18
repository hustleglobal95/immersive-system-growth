import type { DirectorBrief, DirectorTreatment } from "@/src/platform/directorSchema";

export type HierarchyLevelId =
  | "strategic"
  | "narrative"
  | "page-section"
  | "information"
  | "visual"
  | "interaction"
  | "motion-spatial"
  | "semantic-accessibility";

export type HierarchyIssueSeverity = "blocker" | "warning" | "advisory";
export type HierarchyStatus = "strong" | "watch" | "revise" | "block";

export interface HierarchyIssue {
  id: string;
  level: HierarchyLevelId;
  severity: HierarchyIssueSeverity;
  message: string;
  recommendation: string;
}

export interface HierarchyLevelReport {
  id: HierarchyLevelId;
  label: string;
  score: number;
  status: HierarchyStatus;
  principle: string;
  dominant: string;
  supporting: string[];
  suppressed: string[];
  issues: HierarchyIssue[];
}

export interface HierarchyAttentionRule {
  owner: string;
  whenActive: string;
  reduce: string[];
  reason: string;
}

export interface HierarchyReport {
  version: 1;
  projectType: DirectorBrief["projectType"];
  overallScore: number;
  primaryObjective: string;
  primaryMemory: string;
  primaryAction: string;
  signatureMoment: string;
  recommendedNarrative: string[];
  levels: HierarchyLevelReport[];
  attentionRules: HierarchyAttentionRule[];
  blockers: string[];
  warnings: string[];
  directives: string[];
}

const levelPrinciples: Record<HierarchyLevelId, string> = {
  strategic: "One primary objective governs the experience; every lower-level decision must support it.",
  narrative: "Every chapter must advance understanding, tension, proof or action, with one protected payoff.",
  "page-section": "Sections are not equal: opening, signature, proof and conversion receive different production weight.",
  information: "Reveal information in the order the visitor needs it; defer complexity until context earns it.",
  visual: "One focal point should dominate each viewport/state; supporting elements must visibly yield.",
  interaction: "One obvious next action leads; exploration and utility controls stay subordinate.",
  "motion-spatial": "Only one attention-driving motion system should dominate at a time.",
  "semantic-accessibility": "The experience must retain meaning, order and action without spectacle or precision input.",
};

const narrativeByProject: Record<DirectorBrief["projectType"], string[]> = {
  brand: ["Identity", "tension", "expression", "proof", "response", "action"],
  product: ["Desire", "reveal", "craftsmanship", "proof", "ownership"],
  property: ["Place", "arrival", "environment", "residence", "proof", "inquiry"],
  hospitality: ["Feeling", "destination", "spaces", "experience", "proof", "stay"],
  portfolio: ["Point of view", "work", "process", "proof", "contact"],
  saas: ["Problem", "promise", "mechanism", "proof", "product", "conversion"],
  commerce: ["Desire", "product", "proof", "choice", "confidence", "purchase"],
  campaign: ["Setup", "tension", "participation", "reveal", "response", "action"],
  automotive: ["Identity", "reveal", "performance", "engineering", "interior", "configure"],
  fashion: ["Attitude", "silhouette", "detail", "collection", "proof", "shop"],
};

export function buildHierarchyReport(brief: DirectorBrief, treatment: DirectorTreatment): HierarchyReport {
  const levels = [
    strategicHierarchy(brief, treatment),
    narrativeHierarchy(brief, treatment),
    sectionHierarchy(brief, treatment),
    informationHierarchy(brief, treatment),
    visualHierarchy(brief, treatment),
    interactionHierarchy(brief, treatment),
    motionHierarchy(brief, treatment),
    semanticHierarchy(brief, treatment),
  ];

  const allIssues = levels.flatMap((level) => level.issues);
  const blockers = allIssues.filter((issue) => issue.severity === "blocker").map(formatIssue);
  const warnings = allIssues.filter((issue) => issue.severity === "warning").map(formatIssue);
  const overallScore = round(levels.reduce((total, level) => total + level.score, 0) / levels.length);

  return {
    version: 1,
    projectType: brief.projectType,
    overallScore,
    primaryObjective: brief.objective,
    primaryMemory: treatment.memoryStatement,
    primaryAction: brief.primaryAction,
    signatureMoment: treatment.signatureMoment.name,
    recommendedNarrative: narrativeByProject[brief.projectType],
    levels,
    attentionRules: buildAttentionRules(treatment),
    blockers,
    warnings,
    directives: [
      "Importance propagates downward: strategy → narrative → section → information → visual → interaction → motion/spatial → semantic execution.",
      `Protect ${treatment.signatureMoment.name} as the primary production payoff; do not give every chapter equal intensity.`,
      "Maintain one dominant focal point per viewport/state and no more than two meaningful supporting elements.",
      "When primary motion is active, reduce secondary motion, ambient effects and competing typography movement.",
      `Keep ${brief.primaryAction} visually and behaviorally primary when the experience reaches conversion intent.`,
      "If spectacle is removed, the remaining semantic order must still communicate the proposition and next action.",
    ],
  };
}

export function hierarchyApprovalBlockers(report: HierarchyReport) {
  return report.blockers.map((blocker) => `Hierarchy: ${blocker}`);
}

function strategicHierarchy(brief: DirectorBrief, treatment: DirectorTreatment): HierarchyLevelReport {
  const issues: HierarchyIssue[] = [];
  if (brief.differentiators.length > 7) issues.push(issue("strategic-too-many-differentiators", "strategic", "warning", "Too many differentiators can flatten strategic priority.", "Choose the 2–4 differentiators that materially change the experience and demote the rest to supporting proof."));
  if (treatment.thesis.length > 420) issues.push(issue("strategic-thesis-density", "strategic", "warning", "The selected thesis is carrying too many ideas at once.", "Reduce the thesis to one governing creative proposition and let lower levels express the detail."));
  if (!treatment.signatureMoment.name.trim()) issues.push(issue("strategic-no-signature", "strategic", "blocker", "No signature moment owns the production peak.", "Name and protect one signature moment before approving production."));
  return level("strategic", "Strategic hierarchy", 10 - penalty(issues), issues, brief.objective, [treatment.memoryStatement, brief.brandTruth, ...brief.differentiators.slice(0, 3)], ["secondary stakeholder requests that do not support the objective", "decorative novelty without strategic consequence"]);
}

function narrativeHierarchy(brief: DirectorBrief, treatment: DirectorTreatment): HierarchyLevelReport {
  const issues: HierarchyIssue[] = [];
  const peaks = treatment.emotionalArc.filter((beat) => beat.intensity >= 8);
  const highConversion = treatment.emotionalArc.filter((beat) => beat.conversionWeight >= 8);
  if (peaks.length > 3) issues.push(issue("narrative-too-many-peaks", "narrative", "blocker", `${peaks.length} emotional peaks compete for climax status.`, "Keep one primary climax and at most two secondary peaks; lower the rest."));
  else if (peaks.length === 0) issues.push(issue("narrative-no-peak", "narrative", "warning", "The emotional arc has no clearly dominant peak.", "Raise one beat around the signature moment and let surrounding beats create contrast."));
  if (highConversion.length > 2) issues.push(issue("narrative-conversion-everywhere", "narrative", "warning", "Conversion pressure appears at too many narrative beats.", "Let desire and proof accumulate before concentrating conversion pressure near resolution."));
  return level("narrative", "Narrative hierarchy", 10 - penalty(issues), issues, treatment.signatureMoment.name, narrativeByProject[brief.projectType], ["repeated climaxes", "proof before context", "conversion pressure before desire or credibility"]);
}

function sectionHierarchy(_brief: DirectorBrief, treatment: DirectorTreatment): HierarchyLevelReport {
  const issues: HierarchyIssue[] = [];
  const dense = treatment.emotionalArc.filter((beat) => beat.intensity >= 8 && beat.informationDensity >= 8 && beat.interactionLevel >= 8);
  if (dense.length > 1) issues.push(issue("section-overloaded-peaks", "page-section", "warning", `${dense.length} sections combine peak emotion, information and interaction simultaneously.`, "Let the signature section own the overload if necessary; simplify other sections to a single job."));
  const proofBeats = treatment.emotionalArc.filter((beat) => beat.proofLevel >= 7);
  if (!proofBeats.length) issues.push(issue("section-no-proof", "page-section", "warning", "No section is clearly assigned to proof.", "Reserve at least one quieter section for evidence, specificity or credibility."));
  return level("page-section", "Page / section hierarchy", 10 - penalty(issues), issues, treatment.signatureMoment.name, ["Opening establishes the rule", "signature section receives the strongest craft", "proof sections lower spectacle and raise credibility", "resolution gives conversion room"], ["equal visual weight across every section", "secondary chapters that repeat the signature move"]);
}

function informationHierarchy(_brief: DirectorBrief, treatment: DirectorTreatment): HierarchyLevelReport {
  const issues: HierarchyIssue[] = [];
  const first = treatment.emotionalArc[0];
  const last = treatment.emotionalArc[treatment.emotionalArc.length - 1];
  if (first && first.informationDensity >= 8) issues.push(issue("information-opening-overload", "information", "warning", "The opening is information-heavy before the visitor has orientation.", "Reduce opening copy/data density and move supporting facts into later proof beats."));
  if (last && last.conversionWeight < 5) issues.push(issue("information-weak-resolution", "information", "warning", "The closing beat does not strongly resolve toward the primary action.", "Increase action clarity at resolution without turning earlier chapters into repeated CTAs."));
  return level("information", "Information hierarchy", 10 - penalty(issues), issues, treatment.thesis, ["what this is", "why it matters", "why to believe it", "what to do next"], ["technical detail before orientation", "secondary proof that interrupts the main idea", "duplicate copy that does not change understanding"]);
}

function visualHierarchy(_brief: DirectorBrief, treatment: DirectorTreatment): HierarchyLevelReport {
  const issues: HierarchyIssue[] = [];
  if (!treatment.grammar.composition.length) issues.push(issue("visual-no-composition-grammar", "visual", "blocker", "No composition grammar defines visual dominance.", "Define composition rules for dominant subject, supporting copy and negative space."));
  if (!treatment.grammar.typography.length) issues.push(issue("visual-no-type-grammar", "visual", "warning", "Typography has no explicit behavioral hierarchy.", "Define headline, supporting copy and metadata behavior relative to the dominant visual subject."));
  return level("visual", "Visual hierarchy", 10 - penalty(issues), issues, treatment.signatureMoment.name, ["Judge dominance by scale, contrast, position, negative space, motion, depth, lighting and saturation—not font size alone.", treatment.artBible.typographyCharacter, treatment.artBible.whitespace, ...treatment.grammar.composition.slice(0, 2)], ["simultaneous high-contrast focal points", "supporting type competing with the hero subject", "decoration with stronger contrast than the primary action"]);
}

function interactionHierarchy(brief: DirectorBrief, treatment: DirectorTreatment): HierarchyLevelReport {
  const issues: HierarchyIssue[] = [];
  const highInteraction = treatment.emotionalArc.filter((beat) => beat.interactionLevel >= 8);
  if (highInteraction.length > 3) issues.push(issue("interaction-too-many-primary", "interaction", "warning", `${highInteraction.length} beats demand high interaction attention.`, "Choose one primary interaction model; demote other interactions to exploratory, contextual or utility roles."));
  return level("interaction", "Interaction hierarchy", 10 - penalty(issues), issues, brief.primaryAction, ["primary progression gesture", ...treatment.grammar.interaction.slice(0, 3)], ["ambient pointer effects presented as required navigation", "hotspots louder than the primary action", "multiple simultaneous primary CTAs"]);
}

function motionHierarchy(_brief: DirectorBrief, treatment: DirectorTreatment): HierarchyLevelReport {
  const issues: HierarchyIssue[] = [];
  const overloaded = treatment.emotionalArc.filter((beat) => beat.intensity >= 8 && beat.interactionLevel >= 7 && beat.informationDensity >= 7);
  if (overloaded.length > 2) issues.push(issue("motion-attention-collision", "motion-spatial", "warning", "Several high-intensity beats also demand interaction and reading attention.", "During primary camera/object motion, quiet typography motion, ambient effects and secondary interaction until the move resolves."));
  if (!treatment.grammar.camera.length && !treatment.grammar.motion.length) issues.push(issue("motion-no-primary-grammar", "motion-spatial", "blocker", "No camera or motion grammar establishes attention ownership.", "Define one primary motion language before layering transitions or ambient effects."));
  return level("motion-spatial", "Motion / spatial hierarchy", 10 - penalty(issues), issues, treatment.signatureMoment.name, [...treatment.grammar.camera.slice(0, 2), ...treatment.grammar.motion.slice(0, 2)], ["camera + typography + object motion peaking simultaneously", "ambient movement during signature motion", "transition spectacle that outranks content"]);
}

function semanticHierarchy(brief: DirectorBrief, treatment: DirectorTreatment): HierarchyLevelReport {
  const issues: HierarchyIssue[] = [];
  if (!treatment.mobileInterpretation.length) issues.push(issue("semantic-no-mobile", "semantic-accessibility", "blocker", "No mobile interpretation protects hierarchy when spatial complexity is reduced.", "Define a reduced-travel mobile interpretation that preserves meaning, order and the primary action."));
  if (!treatment.qualityBar.some((item) => /access|reduced|keyboard|semantic|motion/i.test(item))) issues.push(issue("semantic-accessibility-not-explicit", "semantic-accessibility", "advisory", "Accessibility hierarchy is not explicit in the quality bar.", "Require semantic heading/landmark order, keyboard access, meaningful alt text and reduced-motion comprehension during production QA."));
  return level("semantic-accessibility", "Semantic / accessibility hierarchy", 10 - penalty(issues), issues, brief.primaryAction, ["semantic content order", "keyboard and touch progression", "reduced-motion interpretation", ...treatment.mobileInterpretation.slice(0, 2)], ["meaning that exists only in animation", "visual order that contradicts document order", "required precision pointer gestures"]);
}

function buildAttentionRules(treatment: DirectorTreatment): HierarchyAttentionRule[] {
  return [
    {
      owner: treatment.signatureMoment.name,
      whenActive: "The signature camera/object event is entering, playing or resolving.",
      reduce: ["secondary camera movement", "ambient motion", "decorative particles", "nonessential typography animation", "competing hover responses"],
      reason: "The signature moment should own the visitor's attention budget instead of competing with simultaneous spectacle.",
    },
    {
      owner: "Primary action",
      whenActive: "The experience reaches its conversion/resolution state.",
      reduce: ["exploratory hotspots", "ambient cursor effects", "secondary CTAs", "high-frequency background transitions"],
      reason: "Conversion clarity requires the interface to stop behaving like every element is equally important.",
    },
    {
      owner: "Reading / proof",
      whenActive: "A proof-heavy or information-dense beat asks the visitor to read and evaluate.",
      reduce: ["camera travel", "object spin", "parallax amplitude", "auto-advancing UI"],
      reason: "Reading and evaluation need visual stability; motion should support comprehension rather than consume it.",
    },
  ];
}

function level(id: HierarchyLevelId, label: string, score: number, issues: HierarchyIssue[], dominant: string, supporting: string[], suppressed: string[]): HierarchyLevelReport {
  const normalized = clamp(round(score), 0, 10);
  return {
    id,
    label,
    score: normalized,
    status: issues.some((item) => item.severity === "blocker") ? "block" : normalized < 7 ? "revise" : issues.some((item) => item.severity === "warning") ? "watch" : "strong",
    principle: levelPrinciples[id],
    dominant,
    supporting: unique(supporting.filter(Boolean)),
    suppressed: unique(suppressed.filter(Boolean)),
    issues,
  };
}

function issue(id: string, levelId: HierarchyLevelId, severity: HierarchyIssueSeverity, message: string, recommendation: string): HierarchyIssue {
  return { id, level: levelId, severity, message, recommendation };
}

function penalty(issues: HierarchyIssue[]) {
  return issues.reduce((total, current) => total + (current.severity === "blocker" ? 3 : current.severity === "warning" ? 1.4 : 0.4), 0);
}

function formatIssue(value: HierarchyIssue) {
  return `${value.level}: ${value.message} ${value.recommendation}`;
}

function unique(values: string[]) { return [...new Set(values)]; }
function round(value: number) { return Math.round(value * 10) / 10; }
function clamp(value: number, min: number, max: number) { return Math.min(max, Math.max(min, value)); }
