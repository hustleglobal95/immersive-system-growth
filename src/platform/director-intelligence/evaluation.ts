import type { DirectorBrief, DirectorTerritory, DirectorTreatment } from "@/src/platform/directorSchema";
import type { EvaluationDimension, EvaluationReport, EvaluationScores, PortfolioCollision, StressLabReport } from "@/src/platform/director-intelligence/types";

const allDimensions: EvaluationDimension[] = ["novelty", "value", "brandAdherence", "emotionalResonance", "aestheticCoherence", "conceptualClarity", "memorability", "distinctiveness", "audienceRelevance", "structuralExpression", "motionCameraJustification", "interactionPurpose", "productionFeasibility", "mobileIntegrity", "commercialAlignment", "portfolioNovelty", "assetRealism"];
function clamp(value: number) { return Math.max(0, Math.min(10, Number(value.toFixed(1)))); }
function tokenSet(text: string) { return new Set(text.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter((token) => token.length > 2)); }
function overlap(a: string, b: string) { const left = tokenSet(a); const right = tokenSet(b); if (!left.size || !right.size) return 0; let hit = 0; for (const token of left) if (right.has(token)) hit++; return hit / left.size; }

export function createEvaluationScores(brief: DirectorBrief, treatment: DirectorTreatment, territory: DirectorTerritory, collisions: PortfolioCollision[] = [], stress?: StressLabReport): EvaluationScores {
  const brandOverlap = overlap(`${brief.brandTruth} ${brief.differentiators.join(" ")}`, `${territory.thesis} ${territory.strategicReason} ${territory.signatureMoment}`);
  const objectiveOverlap = overlap(`${brief.objective} ${brief.primaryAction}`, `${territory.strategicReason} ${territory.experientialPremise}`);
  const memorySpecificity = territory.memory.split(/\s+/).filter(Boolean).length >= 7 ? 1 : 0.7;
  const collision = collisions[0]?.dimensions.overall ?? 0;
  const heroAssets = treatment.assets.filter((asset) => asset.quality === "hero" || asset.quality === "strong").length;
  const missing = treatment.assets.filter((asset) => asset.quality === "missing").length;
  const highPeaks = treatment.emotionalArc.filter((beat) => beat.intensity >= 9).length;
  const lowBeats = treatment.emotionalArc.filter((beat) => beat.intensity <= 3).length;
  const scores: EvaluationScores = {
    novelty: clamp(territory.scores.distinctiveness * 0.7 + Math.max(0, 10 - collision / 10) * 0.3),
    value: clamp(6.5 + objectiveOverlap * 3.5),
    brandAdherence: clamp(5.5 + brandOverlap * 4.5),
    emotionalResonance: clamp(6.5 + (highPeaks > 0 ? 1.4 : 0) + (lowBeats > 0 ? 0.8 : 0) + Math.min(1.3, territory.scores.memorability / 10)),
    aestheticCoherence: clamp(7.2 + Math.min(1.8, treatment.grammar.composition.length * 0.18) + Math.min(1, treatment.noGoRules.length * 0.08)),
    conceptualClarity: clamp(6 + (territory.thesis.length < 260 ? 1.5 : 0.5) + objectiveOverlap * 1.5 + brandOverlap),
    memorability: clamp(territory.scores.memorability * memorySpecificity),
    distinctiveness: clamp(territory.scores.distinctiveness * 0.8 + Math.max(0, 10 - collision / 10) * 0.2),
    audienceRelevance: clamp(6 + overlap(brief.audience, `${territory.strategicReason} ${territory.experientialPremise}`) * 4),
    structuralExpression: clamp(6.5 + treatment.emotionalArc.length * 0.15 + (territory.experientialPremise.length > 80 ? 1 : 0)),
    motionCameraJustification: clamp(6.5 + treatment.grammar.camera.length * 0.2 + treatment.grammar.motion.length * 0.2 + (territory.signatureMoment.length > 80 ? 0.8 : 0)),
    interactionPurpose: clamp(6.5 + treatment.grammar.interaction.length * 0.25 + Math.min(1.5, treatment.emotionalArc.reduce((sum, beat) => sum + beat.interactionLevel, 0) / treatment.emotionalArc.length / 4)),
    productionFeasibility: clamp(territory.scores.feasibility * 0.8 + Math.min(2, heroAssets * 0.4) - Math.min(2.5, missing * 0.5)),
    mobileIntegrity: clamp(7 + Math.min(2.5, treatment.mobileInterpretation.length * 0.3) - ((stress?.results.find((item) => item.id === "mobile")?.status === "FATAL") ? 3 : 0)),
    commercialAlignment: clamp(territory.scores.conversionFit * 0.75 + objectiveOverlap * 2.5),
    portfolioNovelty: clamp(Math.max(0, 10 - collision / 10)),
    assetRealism: clamp(7.5 + Math.min(1.5, heroAssets * 0.3) - Math.min(3, missing * 0.6)),
  };
  return scores;
}

export function applyHardGates(scores: EvaluationScores, tier: DirectorBrief["tier"]) {
  const flagship = tier === "flagship";
  const signature = flagship || tier === "signature";
  const thresholds: Partial<Record<EvaluationDimension, number>> = {
    conceptualClarity: flagship ? 9 : signature ? 8.8 : 8.5,
    brandAdherence: flagship ? 9 : signature ? 8.8 : 8.5,
    distinctiveness: flagship ? 9 : signature ? 8.8 : 8.5,
    portfolioNovelty: flagship ? 8.7 : signature ? 8.4 : 8,
    productionFeasibility: flagship ? 8 : 7.5,
    mobileIntegrity: flagship ? 8 : 7.5,
  };
  const blockers = Object.entries(thresholds).flatMap(([dimension, threshold]) => scores[dimension as EvaluationDimension] < (threshold ?? 0) ? [`${dimension} ${scores[dimension as EvaluationDimension].toFixed(1)} is below ${threshold}.`] : []);
  return { thresholds, blockers, passed: blockers.length === 0 };
}

export function summarizeEvaluation(territoryId: string, scores: EvaluationScores, tier: DirectorBrief["tier"], critiques: EvaluationReport["critiques"] = [], extraBlockers: string[] = []): EvaluationReport {
  const gates = applyHardGates(scores, tier);
  const blockers = [...gates.blockers, ...extraBlockers, ...critiques.flatMap((critique) => critique.blockers)].filter((value, index, values) => values.indexOf(value) === index);
  const recommendations = critiques.map((item) => item.recommendation);
  let recommendation: EvaluationReport["recommendation"] = blockers.length ? "REVISE" : "LOCK";
  if (recommendations.includes("reject")) recommendation = "REJECT";
  else if (recommendations.includes("asset-blocked")) recommendation = "ASSET BLOCKED";
  else if (recommendations.includes("research")) recommendation = "RESEARCH REQUIRED";
  const disagreements: string[] = [];
  if (critiques.length) {
    const rolesForLock = critiques.filter((item) => item.recommendation === "lock").map((item) => item.role);
    const rolesAgainst = critiques.filter((item) => item.recommendation !== "lock").map((item) => item.role);
    if (rolesForLock.length && rolesAgainst.length) disagreements.push(`Council split: lock from ${rolesForLock.join(", ")}; reservations from ${rolesAgainst.join(", ")}.`);
  }
  return { territoryId, scores, critiques, blockers, disagreements, passedHardGates: gates.passed && blockers.length === 0, recommendation };
}

export function rankEvaluations(reports: EvaluationReport[]) {
  const priority: EvaluationDimension[] = ["brandAdherence", "conceptualClarity", "distinctiveness", "memorability", "portfolioNovelty", "commercialAlignment", "productionFeasibility"];
  const score = (report: EvaluationReport) => priority.reduce((sum, dimension, index) => sum + report.scores[dimension] * (priority.length - index), 0);
  const dispositionPenalty: Record<EvaluationReport["recommendation"], number> = { LOCK: 0, REVISE: 50, "RESEARCH REQUIRED": 65, "ASSET BLOCKED": 70, REJECT: 100 };
  return [...reports].sort((a, b) => (score(b) - dispositionPenalty[b.recommendation]) - (score(a) - dispositionPenalty[a.recommendation]));
}

export { allDimensions as evaluationDimensions };
