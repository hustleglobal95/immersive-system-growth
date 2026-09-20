import type { DirectorBrief, DirectorTerritory, DirectorTreatment } from "@/src/platform/directorSchema";
import type { ClicheScan, CouncilCritique, CouncilRole, EvaluationScores, PortfolioCollision, StressLabReport } from "@/src/platform/director-intelligence/types";

const roles: CouncilRole[] = ["executive-creative", "brand", "art", "film", "experience", "interaction", "conversion", "production", "mobile-accessibility", "cultural-context", "client-advocate", "skeptic"];

function rec(score: number, blockerCount: number, research = false, assetBlocked = false): CouncilCritique["recommendation"] {
  if (blockerCount > 0 && score < 6.5) return "reject";
  if (assetBlocked) return "asset-blocked";
  if (research) return "research";
  if (score < 7.5 || blockerCount > 0) return "revise";
  return "advance";
}

function roleScore(role: CouncilRole, scores: EvaluationScores) {
  switch (role) {
    case "executive-creative": return (scores.conceptualClarity + scores.novelty + scores.memorability + scores.distinctiveness) / 4;
    case "brand": return (scores.brandAdherence + scores.distinctiveness + scores.portfolioNovelty) / 3;
    case "art": return (scores.aestheticCoherence + scores.distinctiveness + scores.memorability) / 3;
    case "film": return (scores.motionCameraJustification + scores.emotionalResonance + scores.memorability) / 3;
    case "experience": return (scores.audienceRelevance + scores.structuralExpression + scores.interactionPurpose + scores.mobileIntegrity) / 4;
    case "interaction": return (scores.interactionPurpose + scores.audienceRelevance + scores.mobileIntegrity) / 3;
    case "conversion": return (scores.commercialAlignment + scores.value + scores.audienceRelevance) / 3;
    case "production": return (scores.productionFeasibility + scores.assetRealism + scores.mobileIntegrity) / 3;
    case "mobile-accessibility": return (scores.mobileIntegrity + scores.interactionPurpose + scores.structuralExpression) / 3;
    case "cultural-context": return (scores.brandAdherence + scores.audienceRelevance + scores.value) / 3;
    case "client-advocate": return (scores.brandAdherence + scores.commercialAlignment + scores.conceptualClarity) / 3;
    case "skeptic": return Math.min(scores.brandAdherence, scores.distinctiveness, scores.portfolioNovelty, scores.productionFeasibility, scores.mobileIntegrity);
  }
}

function dimensionsForRole(role: CouncilRole): Array<keyof EvaluationScores> {
  const map: Record<CouncilRole, Array<keyof EvaluationScores>> = {
    "executive-creative": ["conceptualClarity", "novelty", "memorability", "distinctiveness"],
    brand: ["brandAdherence", "distinctiveness", "portfolioNovelty"],
    art: ["aestheticCoherence", "distinctiveness", "memorability"],
    film: ["motionCameraJustification", "emotionalResonance", "memorability"],
    experience: ["audienceRelevance", "structuralExpression", "interactionPurpose", "mobileIntegrity"],
    interaction: ["interactionPurpose", "audienceRelevance", "mobileIntegrity"],
    conversion: ["commercialAlignment", "value", "audienceRelevance"],
    production: ["productionFeasibility", "assetRealism", "mobileIntegrity"],
    "mobile-accessibility": ["mobileIntegrity", "interactionPurpose", "structuralExpression"],
    "cultural-context": ["brandAdherence", "audienceRelevance", "value"],
    "client-advocate": ["brandAdherence", "commercialAlignment", "conceptualClarity"],
    skeptic: ["brandAdherence", "distinctiveness", "portfolioNovelty", "productionFeasibility", "mobileIntegrity"],
  };
  return map[role];
}

export function runDirectorCouncil(brief: DirectorBrief, treatment: DirectorTreatment, territory: DirectorTerritory, scores: EvaluationScores, options: { cliches?: ClicheScan; collisions?: PortfolioCollision[]; stress?: StressLabReport } = {}): CouncilCritique[] {
  return roles.map((role) => {
    const score = roleScore(role, scores);
    const selected = dimensionsForRole(role);
    const roleScores = Object.fromEntries(selected.map((dimension) => [dimension, scores[dimension]]));
    const strengths = selected.filter((dimension) => scores[dimension] >= 8.5).map((dimension) => `${dimension} is strong at ${scores[dimension].toFixed(1)}.`);
    const concerns = selected.filter((dimension) => scores[dimension] < 8).map((dimension) => `${dimension} is underdeveloped at ${scores[dimension].toFixed(1)}.`);
    const blockers: string[] = [];

    if (role === "executive-creative" && scores.conceptualClarity < 7.5) blockers.push("There is not yet a sufficiently clear controlling idea.");
    if (role === "brand" && scores.brandAdherence < 8) blockers.push("The direction could belong to another client after a brand swap.");
    if (role === "production" && scores.productionFeasibility < 6.5) blockers.push("Production risk is too high for the current asset/tier reality.");
    if (role === "mobile-accessibility" && scores.mobileIntegrity < 7) blockers.push("The concept loses too much meaning under mobile/reduced-motion constraints.");
    if (role === "skeptic") {
      if ((options.cliches?.density ?? 0) >= 6) blockers.push("Category clichés are doing too much of the creative work.");
      if ((options.collisions?.[0]?.dimensions.overall ?? 0) >= 70) blockers.push("The strongest visible devices collide with prior Forge work.");
      if (territory.memory.split(/\s+/).length < 6) blockers.push("The memory statement is too generic to protect a distinctive idea.");
      if (/cinematic|immersive|premium|luxury|beautiful/i.test(territory.thesis) && territory.thesis.split(/\s+/).length < 12) concerns.push("The thesis relies on broad quality language rather than a specific creative mechanism.");
    }
    if (role === "film" && treatment.grammar.camera.length === 0) concerns.push("No explicit camera grammar supports the emotional arc.");
    if (role === "interaction" && treatment.grammar.interaction.length === 0) concerns.push("Interaction has no stated purpose beyond presentation.");
    if (role === "client-advocate" && brief.differentiators.length === 0) concerns.push("The defense packet will be weak without explicit client differentiators.");
    if (role === "cultural-context" && brief.references.some((reference) => /ritual|tribal|ethnic|sacred|indigenous/i.test(reference.lesson))) concerns.push("Cultural reference should receive explicit context verification before lock.");

    const research = role === "cultural-context" && concerns.some((item) => item.includes("context verification"));
    const assetBlocked = role === "production" && treatment.assets.some((asset) => asset.quality === "missing" && asset.creativeValue >= 8);
    return {
      role,
      territoryId: territory.id,
      scores: roleScores,
      strengths,
      concerns,
      blockers,
      recommendation: rec(score, blockers.length, research, assetBlocked),
      basis:"deterministic-lens",
      evidenceCoverage:Number(Math.max(0,Math.min(1,0.35+selected.length*0.08+(brief.differentiators.length?0.12:0)+(brief.references.length?0.08:0))).toFixed(2)),
    };
  });
}

export function councilDisagreement(critiques: CouncilCritique[]) {
  const groups = new Map<string, string[]>();
  for (const critique of critiques) groups.set(critique.recommendation, [...(groups.get(critique.recommendation) ?? []), critique.role]);
  if (groups.size <= 1) return [];
  return [...groups.entries()].map(([recommendation, members]) => `${recommendation}: ${members.join(", ")}`);
}
