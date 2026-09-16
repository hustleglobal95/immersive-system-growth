import type { DirectorTreatment } from "@/src/platform/directorSchema";
import type { AssetGapReport, EvaluationReport, ProductionLeverageItem } from "@/src/platform/director-intelligence/types";

export function rankProductionLeverage(treatment: DirectorTreatment, evaluation: EvaluationReport, assetGap: AssetGapReport): ProductionLeverageItem[] {
  const candidates: ProductionLeverageItem[] = [];
  const add = (id: string, label: string, leverage: number, estimatedCost: number, reason: string) => candidates.push({ id, label, leverage: Number(leverage.toFixed(1)), estimatedCost, reason, recommendation: leverage >= 8 ? "invest" : leverage >= 6 ? "maintain" : leverage >= 4 ? "defer" : "cut" });
  add("signature", "Signature sequence", 10 - Math.max(0, evaluation.scores.memorability - 6) * 0.5, 1000, "Highest emotional visibility and portfolio value; protected by the Treatment.");
  add("hero", "Opening / hero authority", 8.5 - Math.max(0, evaluation.scores.aestheticCoherence - 7) * 0.4, 800, "The first impression establishes quality expectations for the rest of the experience.");
  add("brand-proof", "Brand-specific proof", 9.5 - evaluation.scores.brandAdherence * 0.35, 700, "Additional effort should strengthen client ownership when brand adherence is not yet exceptional.");
  add("mobile", "Mobile-native interpretation", 9 - evaluation.scores.mobileIntegrity * 0.45, 650, "Mobile resilience protects the concept from becoming desktop-only spectacle.");
  add("typography", "Typography / composition refinement", 7.5 - Math.max(0, evaluation.scores.aestheticCoherence - 7.5) * 0.3, 450, "High-frequency system improvement that affects every scene without adding technical weight.");
  const missingCritical = assetGap.items.filter((item) => !item.exists && (item.assetClass === "hero-critical" || item.assetClass === "signature-critical"));
  missingCritical.forEach((item, index) => add(`asset-${index + 1}`, `Create ${item.label}`, 9.3, 1200, item.creativeConsequence));
  treatment.assets.filter((asset) => asset.creativeValue <= 3).slice(0, 3).forEach((asset, index) => add(`low-${index + 1}`, `Additional polish: ${asset.label}`, 2.5, 500, "Low creative value relative to signature/hero investment."));
  return candidates.sort((a, b) => (b.leverage / Math.max(1, b.estimatedCost)) - (a.leverage / Math.max(1, a.estimatedCost)) || b.leverage - a.leverage);
}
