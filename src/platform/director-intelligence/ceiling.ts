import type { DirectorBrief, DirectorTreatment } from "@/src/platform/directorSchema";
import type { AssetGapReport, CreativeCeiling, EvaluationReport, StressLabReport } from "@/src/platform/director-intelligence/types";

function clamp(value: number) { return Math.max(0, Math.min(10, Number(value.toFixed(1)))); }

export function estimateCreativeCeiling(brief: DirectorBrief, treatment: DirectorTreatment, selected: EvaluationReport, assetGap: AssetGapReport, stress: StressLabReport): CreativeCeiling {
  const constraints: string[] = [];
  if (brief.differentiators.length === 0) constraints.push("Differentiator evidence is weak or missing.");
  if (brief.brandTruth.length < 50) constraints.push("Brand truth is too thin for a fully specific concept.");
  if (assetGap.blockers.length) constraints.push(...assetGap.blockers);
  const fatalStress = stress.results.filter((item) => item.status === "FATAL");
  if (fatalStress.length) constraints.push(...fatalStress.map((item) => `${item.label}: ${item.reason}`));
  if (selected.scores.portfolioNovelty < 8) constraints.push("Portfolio novelty is below advanced Director target.");
  if (selected.scores.productionFeasibility < 8) constraints.push("Production feasibility is limiting ambition.");

  const avg = [selected.scores.conceptualClarity, selected.scores.brandAdherence, selected.scores.distinctiveness, selected.scores.memorability, selected.scores.productionFeasibility, selected.scores.assetRealism, selected.scores.mobileIntegrity].reduce((a, b) => a + b, 0) / 7;
  const assetPenalty = Math.max(0, (90 - assetGap.completeness) / 20);
  const stressPenalty = Math.max(0, (8 - stress.resilienceScore) * 0.45);
  const current = clamp(avg - assetPenalty - stressPenalty);

  const upgrades: string[] = [];
  if (assetGap.blockers.length) upgrades.push("Create or upgrade the highest-value hero/signature asset first.");
  if (brief.differentiators.length === 0) upgrades.push("Clarify and verify at least two client-specific differentiators before thesis lock.");
  if (selected.scores.portfolioNovelty < 8) upgrades.push("Replace the highest-collision camera/signature device with a concept-specific mechanism.");
  if (selected.scores.mobileIntegrity < 8) upgrades.push("Author a mobile-native expression of the central idea rather than a reduced desktop version.");
  if (selected.scores.brandAdherence < 8.5) upgrades.push("Strengthen the causal link between brand truth and the interaction/structure model.");
  if (upgrades.length === 0) upgrades.push("Concentrate additional craft on the protected signature moment rather than adding more features.");

  const projected = clamp(current + Math.min(1.8, upgrades.length * 0.45 + assetPenalty * 0.5));
  const evidenceCoverage = Number(Math.max(0, Math.min(1, 0.35 + brief.differentiators.length * 0.05 + brief.existingAssets.length * 0.02 - constraints.length * 0.03)).toFixed(2));
  return { current, projected, constraints, highestLeverageUpgrades: upgrades.slice(0, 5), evidenceCoverage };
}
