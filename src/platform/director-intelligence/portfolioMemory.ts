import type { DirectorTreatment } from "@/src/platform/directorSchema";
import type { CreativeFingerprint, PortfolioCollision, SimilarityDimensions } from "@/src/platform/director-intelligence/types";

function normalize(items: string[]) { return items.map((item) => item.toLowerCase().trim()).filter(Boolean); }
function words(value: string) { return normalize(value.replace(/[^a-z0-9\s-]/gi, " ").split(/\s+/).filter((token) => token.length > 2)); }
function jaccard(a: string[], b: string[]) {
  const left = new Set(normalize(a)); const right = new Set(normalize(b));
  if (!left.size && !right.size) return 1; if (!left.size || !right.size) return 0;
  let intersection = 0; for (const item of left) if (right.has(item)) intersection++;
  return intersection / (left.size + right.size - intersection);
}
function fuzzyList(a: string[], b: string[]) {
  if (!a.length || !b.length) return 0;
  const aWords = words(a.join(" ")); const bWords = words(b.join(" "));
  return jaccard(aWords, bWords);
}
function curveSimilarity(a: number[], b: number[]) {
  if (!a.length || !b.length) return 0;
  const size = Math.min(a.length, b.length); let distance = 0;
  for (let i = 0; i < size; i++) distance += Math.abs(a[Math.floor(i * a.length / size)] - b[Math.floor(i * b.length / size)]) / 10;
  return Math.max(0, 1 - distance / size);
}
function pct(value: number) { return Math.round(Math.max(0, Math.min(1, value)) * 100); }

export function fingerprintTreatment(treatment: DirectorTreatment, projectId = treatment.projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")): CreativeFingerprint {
  return {
    projectId,
    thesisTerms: words(treatment.thesis),
    narrativePattern: treatment.emotionalArc.map((beat) => beat.label.toLowerCase()),
    emotionalCurve: treatment.emotionalArc.map((beat) => beat.intensity),
    structureRoles: treatment.emotionalArc.map((beat) => beat.purpose.toLowerCase()),
    cameraDevices: normalize(treatment.grammar.camera),
    motionDevices: normalize(treatment.grammar.motion),
    interactionDevices: normalize(treatment.grammar.interaction),
    transitionDevices: normalize(treatment.grammar.transitions),
    typographyBehavior: normalize(treatment.grammar.typography),
    compositionPatterns: normalize(treatment.grammar.composition),
    distinctiveAssets: treatment.assets.filter((asset) => asset.creativeValue >= 7).map((asset) => asset.label.toLowerCase()),
    signatureMechanism: treatment.signatureMoment.description.toLowerCase(),
    colorMaterialDescriptors: normalize([...treatment.grammar.color, ...treatment.grammar.materials]),
    soundDescriptors: normalize(treatment.grammar.sound),
  };
}

export function compareFingerprints(current: CreativeFingerprint, previous: CreativeFingerprint): PortfolioCollision {
  const dimensions: SimilarityDimensions = {
    concept: pct(jaccard(current.thesisTerms, previous.thesisTerms)),
    narrative: pct(fuzzyList(current.narrativePattern, previous.narrativePattern)),
    emotionalCurve: pct(curveSimilarity(current.emotionalCurve, previous.emotionalCurve)),
    structure: pct(fuzzyList(current.structureRoles, previous.structureRoles)),
    spatialLogic: pct(fuzzyList(current.transitionDevices, previous.transitionDevices)),
    camera: pct(fuzzyList(current.cameraDevices, previous.cameraDevices)),
    motion: pct(fuzzyList(current.motionDevices, previous.motionDevices)),
    interaction: pct(fuzzyList(current.interactionDevices, previous.interactionDevices)),
    transition: pct(fuzzyList(current.transitionDevices, previous.transitionDevices)),
    typography: pct(fuzzyList(current.typographyBehavior, previous.typographyBehavior)),
    composition: pct(fuzzyList(current.compositionPatterns, previous.compositionPatterns)),
    signature: pct(fuzzyList([current.signatureMechanism], [previous.signatureMechanism])),
    overall: 0,
  };
  const weighted = dimensions.concept * 0.16 + dimensions.narrative * 0.09 + dimensions.emotionalCurve * 0.05 + dimensions.structure * 0.08 + dimensions.spatialLogic * 0.05 + dimensions.camera * 0.09 + dimensions.motion * 0.09 + dimensions.interaction * 0.08 + dimensions.transition * 0.07 + dimensions.typography * 0.05 + dimensions.composition * 0.06 + dimensions.signature * 0.13;
  dimensions.overall = Math.round(weighted);
  const highOverlap = (Object.entries(dimensions) as Array<[keyof SimilarityDimensions, number]>).filter(([key, value]) => key !== "overall" && value >= 70).sort((a, b) => b[1] - a[1]).map(([dimension, score]) => ({ dimension, score }));
  const visibleHigh = [dimensions.concept, dimensions.camera, dimensions.motion, dimensions.signature, dimensions.structure].filter((value) => value >= 78).length;
  const verdict: PortfolioCollision["verdict"] = dimensions.overall >= 78 || visibleHigh >= 3 ? "reject" : dimensions.overall >= 65 || visibleHigh >= 2 ? "rewrite" : dimensions.overall >= 50 ? "watch" : "clear";
  const reason = verdict === "reject" ? "The proposed direction repeats prior Forge work across several highly visible dimensions." : verdict === "rewrite" ? "Material portfolio overlap exists in user-visible creative devices; revise the strongest collisions." : verdict === "watch" ? "Some familiar Forge language is present but not yet dominant." : "No material portfolio collision detected.";
  return { projectId: previous.projectId, dimensions, highOverlap, verdict, reason };
}

export function scanPortfolio(current: CreativeFingerprint, portfolio: CreativeFingerprint[]) {
  return portfolio.filter((item) => item.projectId !== current.projectId).map((item) => compareFingerprints(current, item)).sort((a, b) => b.dimensions.overall - a.dimensions.overall);
}
