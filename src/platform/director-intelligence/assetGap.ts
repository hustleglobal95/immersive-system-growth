import type { DirectorBrief, DirectorTreatment } from "@/src/platform/directorSchema";
import type { AssetGapItem, AssetGapReport } from "@/src/platform/director-intelligence/types";

function classify(label: string, role: string, value: number): AssetGapItem["assetClass"] {
  const text = `${label} ${role}`.toLowerCase();
  if (/signature|climax/.test(text)) return "signature-critical";
  if (/hero|master|primary/.test(text) || value >= 9) return "hero-critical";
  if (/proof|detail|technical|spec/.test(text)) return "proof-critical";
  if (/utility|plan|map|availability|data/.test(text)) return "utility";
  if (value <= 3) return "optional";
  return "supporting";
}

export function analyzeAssetGap(brief: DirectorBrief, treatment: DirectorTreatment): AssetGapReport {
  const items: AssetGapItem[] = treatment.assets.map((asset) => {
    const assetClass = classify(asset.label, asset.role, asset.creativeValue);
    const exists = asset.quality !== "missing";
    let decision: AssetGapItem["decision"] = "use";
    if (!exists) decision = "create";
    else if (asset.quality === "weak" && (assetClass === "hero-critical" || assetClass === "signature-critical")) decision = "replace";
    else if (asset.quality === "weak") decision = "upgrade";
    else if (asset.quality === "supporting" && asset.creativeValue >= 7) decision = "re-edit";
    else if (asset.creativeValue <= 2) decision = "omit";
    const consequence = !exists && (assetClass === "hero-critical" || assetClass === "signature-critical") ? "Creative ceiling is materially capped until this critical asset exists." : decision === "upgrade" || decision === "replace" ? "Current asset quality may prevent the intended moment from reading as premium." : "No critical consequence expected.";
    return { label: asset.label, assetClass, decision, exists, reason: asset.reason, creativeConsequence: consequence };
  });

  const hasHero = items.some((item) => item.assetClass === "hero-critical" && item.exists && item.decision !== "omit");
  const hasSignature = items.some((item) => item.assetClass === "signature-critical" && item.exists) || treatment.signatureMoment.prerequisites.length === 0;
  if (!hasHero && brief.existingAssets.length > 0) items.push({ label: "Hero-grade primary asset", assetClass: "hero-critical", decision: "create", exists: false, reason: "No existing asset is currently classified as hero-critical.", creativeConsequence: "Opening authority and portfolio-grade finish are capped." });
  if (!hasSignature && treatment.signatureMoment.prerequisites.length > 0) items.push({ label: "Signature-moment dependency", assetClass: "signature-critical", decision: "create", exists: false, reason: treatment.signatureMoment.prerequisites.join("; "), creativeConsequence: "The protected signature moment cannot be executed at the intended quality." });

  const blockers = items.filter((item) => !item.exists && (item.assetClass === "hero-critical" || item.assetClass === "signature-critical")).map((item) => `${item.label}: ${item.creativeConsequence}`);
  const weighted = items.map((item) => ({ optional: 0.3, utility: 0.5, supporting: 0.7, "proof-critical": 1, "hero-critical": 1.4, "signature-critical": 1.5 }[item.assetClass] * (item.exists ? 1 : 0));
  const max = items.reduce((sum, item) => sum + ({ optional: 0.3, utility: 0.5, supporting: 0.7, "proof-critical": 1, "hero-critical": 1.4, "signature-critical": 1.5 }[item.assetClass]), 0);
  const completeness = max ? Number((weighted.reduce((a, b) => a + b, 0) / max * 100).toFixed(0)) : 100;
  return { items, blockers, completeness };
}
